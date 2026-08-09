/* global React, ReactDOM */
const { useState: useStateM, useEffect: useEffectM, useReducer, useRef: useRefM, useCallback: useCallbackM } = React;

/* ============================================================
   REDUCER
   ============================================================ */

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.state;
    case 'RESET':
      return JSON.parse(JSON.stringify(window.DEFAULT_STATE));
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_COLOR':
      // custom color modification unbinds the preset
      return { ...state, [action.key]: action.value, paletteId: 'custom' };
    case 'SET_FONT':
      return { ...state, [action.key]: action.value };
    case 'APPLY_PRESET': {
      const p = action.preset;
      return {
        ...state,
        paletteId: p.id,
        bg: p.bg,
        text: p.text,
        point: p.point,
      };
    }
    case 'SET_SUBTITLE':
      return { ...state, subtitle: action.value };
    case 'SET_RELATIONSHIP_TAGS':
      return { ...state, relationshipTags: action.tags };
    case 'SET_IMAGE_CREDIT':
      return { ...state, imageCredit: action.value };

    case 'UPDATE_CHAR': {
      const characters = [...state.characters];
      characters[action.idx] = { ...characters[action.idx], ...action.patch };
      return { ...state, characters };
    }
    case 'ADD_STICKER': {
      const maxZ = state.stickers.reduce((m, s) => Math.max(m, s.z || 0), 0);
      return {
        ...state,
        stickers: [...state.stickers, {
          id: 'stk-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          src: action.src,
          x: action.x ?? 400,
          y: action.y ?? 200,
          w: action.w ?? 140,
          h: action.h ?? 140,
          rot: 0,
          z: maxZ + 1,
        }]
      };
    }
    case 'UPDATE_STICKER': {
      const stickers = state.stickers.map(s =>
        s.id === action.id ? { ...s, ...action.patch } : s
      );
      return { ...state, stickers };
    }
    case 'REMOVE_STICKER':
      return { ...state, stickers: state.stickers.filter(s => s.id !== action.id) };
    case 'STICKER_Z': {
      const stickers = state.stickers.map(s => {
        if (s.id !== action.id) return s;
        return { ...s, z: (s.z || 0) + action.dir };
      });
      return { ...state, stickers };
    }
    default:
      return state;
  }
}

/* ============================================================
   ROOT
   ============================================================ */

function App() {
  const [state, dispatch] = useReducer(reducer, null, () => JSON.parse(JSON.stringify(window.DEFAULT_STATE)));

  // 최초 마운트 시 IndexedDB에서 저장된 상태를 비동기로 불러온다
  // (IndexedDB 접근 자체가 비동기라 useReducer 초기값으로는 바로 못 넣는다).
  const [ready, setReady] = useStateM(false); // 초기 로드 완료 여부
  useEffectM(() => {
    let cancelled = false;
    window.loadState().then((loaded) => {
      if (cancelled) return;
      if (loaded) dispatch({ type: 'LOAD_STATE', state: loaded });
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Auto-save
  // ready가 true가 되기 전(=초기 로드가 끝나기 전)에는 저장하지 않는다.
  // 그렇지 않으면 로드가 끝나기 전에 기본값이 먼저 저장되면서, 방금 불러오려던
  // 기존 저장 데이터를 기본값으로 덮어써버리는 경쟁 조건이 생길 수 있다.
  const [saveError, setSaveError] = useStateM(false); // 저장 용량 초과 등으로 자동저장이 실패했는지 여부
  useEffectM(() => {
    if (!ready) return;
    let cancelled = false;
    const t = setTimeout(() => {
      window.saveState(state).then((ok) => { if (!cancelled) setSaveError(!ok); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [state, ready]);

  const canvasRef = useRefM(null);
  const [isExporting, setIsExporting] = useStateM(false);
  // 내보내기마다 웹폰트를 새로 fetch/인코딩하면 느리므로, 폰트 조합이 같으면 캐시를 재사용한다.
  const fontEmbedCacheRef = useRefM({ key: null, css: null });

  const onAddSticker = (dataUrl) => {
    // approximate the canvas center for initial placement
    const rect = canvasRef.current?.getBoundingClientRect();
    // 항상 140x140 정사각형으로 고정하면, 정사각형이 아닌 원본 이미지는
    // .sticker img { width:100%; height:100% } 때문에 억지로 늘어나 찌그러져 보인다.
    // 원본 이미지의 실제 가로세로 비율을 읽어와, 긴 변이 140px이 되도록 비율을 유지해서 배치한다.
    const maxSide = 140;
    const img = new Image();
    img.onload = () => {
      let w = maxSide, h = maxSide;
      if (img.naturalWidth && img.naturalHeight) {
        const ratio = img.naturalWidth / img.naturalHeight;
        if (ratio >= 1) { w = maxSide; h = maxSide / ratio; }
        else { h = maxSide; w = maxSide * ratio; }
      }
      const x = rect ? Math.max(0, (rect.width - w) / 2) : 400;
      const y = 200;
      dispatch({ type: 'ADD_STICKER', src: dataUrl, x, y, w, h });
    };
    img.onerror = () => {
      const w = maxSide, h = maxSide;
      const x = rect ? Math.max(0, (rect.width - w) / 2) : 400;
      const y = 200;
      dispatch({ type: 'ADD_STICKER', src: dataUrl, x, y, w, h });
    };
    img.src = dataUrl;
  };

  const exportImage = async (format = 'png') => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    document.body.classList.add('exporting');

    // Wait a paint frame for the exporting class to take effect
    await new Promise(r => setTimeout(r, 60));

    const node = canvasRef.current;

    // html-to-image는 캡처 직전에 <img>들이 실제로 디코딩 완료됐는지 기다려주지 않는다.
    // 특히 방금 업로드한 큰 base64 이미지이거나 렌더링이 느린 브라우저(구형 엔진, 저사양 PC 등)에서는
    // 이미지가 아직 디코딩 중인 상태로 캡처되어 결과물에서 사진만 통째로 빠지는 증상이 생길 수 있다.
    // 그래서 export 전에 캔버스 안의 모든 <img>가 완전히 로드/디코딩될 때까지 명시적으로 기다린다.
    const waitForImagesDecoded = async (root) => {
      const imgs = Array.from(root.querySelectorAll('img')).filter(img => img.src);
      await Promise.all(imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
        }
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      }));
    };
    await waitForImagesDecoded(node);

    // iOS(WebKit) 대응: html-to-image는 화면을 SVG foreignObject로 감싸서 캡처하는데,
    // object-fit: cover + overflow:hidden + CSS transform(확대/이동) 조합의 <img>를
    // WebKit이 foreignObject 안에서 제대로 그리지 못하고 통째로 빈 채로 캡처하는 경우가 있다
    // (텍스트/색상 블록은 정상, 사진만 사라지는 증상). 이를 피하기 위해 캡처 직전에
    // 각 이미지 칸을 실제 보이는 크롭/확대/이동 상태 그대로 canvas에 구워서
    // transform 없는 평범한 이미지로 잠깐 바꿔치기하고, 캡처가 끝나면 원상복구한다.
    const flattenImageSlotsForExport = (root) => {
      const restores = [];
      const slots = Array.from(root.querySelectorAll('.image-slot'));
      for (const slot of slots) {
        const img = slot.querySelector('img');
        if (!img || !img.src || !img.naturalWidth) continue;
        const rect = slot.getBoundingClientRect();
        const boxW = rect.width, boxH = rect.height;
        if (!boxW || !boxH) continue;

        // 현재 인라인 transform(translate(x,y) scale(s))을 파싱
        const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([-\d.]+)\)/.exec(img.style.transform || '');
        const tx = m ? parseFloat(m[1]) : 0;
        const ty = m ? parseFloat(m[2]) : 0;
        const s = m ? parseFloat(m[3]) : 1;

        // object-fit: cover 기준 소스 크롭 영역
        const natW = img.naturalWidth, natH = img.naturalHeight;
        const boxRatio = boxW / boxH, imgRatio = natW / natH;
        let sw, sh, sx, sy;
        if (imgRatio > boxRatio) {
          sh = natH; sw = natH * boxRatio; sx = (natW - sw) / 2; sy = 0;
        } else {
          sw = natW; sh = natW / boxRatio; sx = 0; sy = (natH - sh) / 2;
        }

        // 위 크롭 위에 추가로 걸린 확대(scale)/이동(translate)을 소스 좌표로 환산
        const boxX1 = boxW / 2 * (1 - 1 / s) - tx / s;
        const boxY1 = boxH / 2 * (1 - 1 / s) - ty / s;
        const finalSx = sx + (boxX1 / boxW) * sw;
        const finalSy = sy + (boxY1 / boxH) * sh;
        const finalSw = sw / s;
        const finalSh = sh / s;

        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(boxW * 2));
          canvas.height = Math.max(1, Math.round(boxH * 2));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, finalSx, finalSy, finalSw, finalSh, 0, 0, canvas.width, canvas.height);
          const flatUrl = canvas.toDataURL('image/png');

          const originalSrc = img.src;
          const originalTransform = img.style.transform;
          const originalObjectFit = img.style.objectFit;
          img.src = flatUrl;
          img.style.transform = 'none';
          img.style.objectFit = 'fill';
          restores.push(() => {
            img.src = originalSrc;
            img.style.transform = originalTransform;
            img.style.objectFit = originalObjectFit;
          });
        } catch (e) {
          console.warn('이미지 칸 flatten 실패, 원본 그대로 캡처합니다.', e);
        }
      }
      return () => restores.forEach((fn) => fn());
    };

    const restoreImageSlots = flattenImageSlotsForExport(node);
    await waitForImagesDecoded(node);

    // 폰트 조합(제목/본문 폰트)이 바뀌지 않았다면 이전에 만들어둔 임베드 CSS를 재사용.
    // htmlToImage.getFontEmbedCSS(node)는 페이지에 걸린 폰트 14종을 전부 훑어서 매우 느리므로
    // 실제로 선택된 2개 폰트만 받아오는 window.fetchMinimalFontEmbedCSS를 대신 사용한다.
    const fontKey = state.fontHeading + '|' + state.fontBody;
    if (fontEmbedCacheRef.current.key !== fontKey) {
      try {
        const css = await window.fetchMinimalFontEmbedCSS([state.fontHeading, state.fontBody]);
        fontEmbedCacheRef.current = { key: fontKey, css };
      } catch (e) {
        console.warn('폰트 임베드 CSS 생성 실패, 매번 새로 처리합니다.', e);
        fontEmbedCacheRef.current = { key: null, css: null };
      }
    }

    const baseOptions = {
      pixelRatio: 2,
      backgroundColor: state.bg,
      cacheBust: true,
      style: { transform: 'none' },
      ...(fontEmbedCacheRef.current.css ? { fontEmbedCSS: fontEmbedCacheRef.current.css } : {}),
    };

    const runExport = (opts) => {
      if (format === 'jpg') {
        return htmlToImage.toJpeg(node, { ...opts, quality: 0.95 });
      }
      return htmlToImage.toPng(node, opts);
    };

    try {
      let dataUrl;
      try {
        dataUrl = await runExport(baseOptions);
      } catch (firstErr) {
        // Most common cause of a failed export: cross-origin webfonts (Google Fonts, Pretendard CDN)
        // fail to be embedded as base64. Retry once without embedding external fonts.
        console.warn('1차 저장 실패 - 폰트 임베드 없이 재시도합니다.', firstErr);
        dataUrl = await runExport({ ...baseOptions, skipFonts: true });
      }
      const link = document.createElement('a');
      const now = new Date();
      const stamp = now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '_' + String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0');
      link.download = `character-sheet_${stamp}.${format === 'jpg' ? 'jpg' : 'png'}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
      alert('저장에 실패했어요. 브라우저 콘솔(F12)에 표시된 에러 메시지를 확인해주세요.\n' + (err && err.message ? err.message : err));
    } finally {
      restoreImageSlots();
      document.body.classList.remove('exporting');
      setIsExporting(false);
    }
  };

  /* 2인 모드 관계 해시태그 */
  const relationshipTags = state.relationshipTags || [];
  const setRelationshipTag = (tIdx, v) => {
    const tags = [...relationshipTags];
    tags[tIdx] = v;
    dispatch({ type: 'SET_RELATIONSHIP_TAGS', tags });
  };
  const removeRelationshipTag = (tIdx) => {
    dispatch({ type: 'SET_RELATIONSHIP_TAGS', tags: relationshipTags.filter((_, i) => i !== tIdx) });
  };
  const addRelationshipTag = () => {
    dispatch({ type: 'SET_RELATIONSHIP_TAGS', tags: [...relationshipTags, '#관계태그'] });
  };

  /* CSS variables */
  const canvasStyle = {
    '--bg': state.bg,
    '--text': state.text,
    '--point': state.point,
    '--font-heading': window.fontFamilyById(state.fontHeading),
    '--font-body': window.fontFamilyById(state.fontBody),
  };

  const visibleChars = state.mode === 1 ? [state.characters[0]] : state.characters;

  return (
    <div className="app">
      <window.Toolbar
        state={state}
        dispatch={dispatch}
        onExport={exportImage}
        onManualSave={async () => {
          const ok = await window.saveState(state);
          setSaveError(!ok);
          return ok;
        }}
        saveError={saveError}
        onAddSticker={onAddSticker}
      />

      <div className="canvas-wrap">
        <div
          ref={canvasRef}
          className={'canvas mode-' + state.mode}
          style={canvasStyle}
        >
          {/* SUBTITLE (작품 · 세계관 · 관계 · 시대 배경 — 시트 최상단에 한 번만 표시) */}
          <window.Editable
            tag="div"
            className="sheet__subtitle"
            value={state.subtitle}
            onChange={(v) => dispatch({ type: 'SET_SUBTITLE', value: v })}
            placeholder="작품 · 세계관 · 관계 · 시대 배경을 여기에 짧게 적어주세요"
            multiline
          />

          {/* RELATIONSHIP TAGS — 2인 모드에서만 노출되는 두 캐릭터 사이의 관계 해시태그 */}
          {state.mode === 2 && (
            <div className="relationship-tags">
              {relationshipTags.map((tag, tIdx) => (
                <span className="relationship-tag" key={tIdx}>
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setRelationshipTag(tIdx, e.target.innerText)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                  >{tag}</span>
                  <span className="tag-del" onClick={() => removeRelationshipTag(tIdx)}>×</span>
                </span>
              ))}
              <button className="relationship-tag-add" onClick={addRelationshipTag}>+ 관계 태그</button>
            </div>
          )}

          {/* CHARACTERS */}
          <div className={'characters mode-' + state.mode}>
            {visibleChars.map((c, i) => (
              <window.CharacterCard
                key={c.letter}
                char={c}
                idx={i}
                dispatch={dispatch}
                isSingle={state.mode === 1}
              />
            ))}
          </div>

          {/* FOOTER */}
          <div className="canvas__footer">
            <span className="canvas__footer-brand">
              <strong>Design</strong> mi0_1210 · 캐릭터 외관표
            </span>
            <window.Editable
              tag="div"
              className="canvas__footer-credit"
              value={state.imageCredit}
              onChange={(v) => dispatch({ type: 'SET_IMAGE_CREDIT', value: v })}
              placeholder="이미지 출처 / 작업자 이름"
            />
          </div>

          {/* STICKERS overlay */}
          <window.StickerLayer stickers={state.stickers} dispatch={dispatch} />
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
