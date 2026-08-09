/* global React, ReactDOM */
const { useState: useStateM, useEffect: useEffectM, useReducer, useRef: useRefM, useCallback: useCallbackM } = React;

/* ============================================================
   REDUCER
   ============================================================ */

function reducer(state, action) {
  switch (action.type) {
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
  const [state, dispatch] = useReducer(reducer, null, () => {
    const loaded = window.loadState();
    return loaded || JSON.parse(JSON.stringify(window.DEFAULT_STATE));
  });

  // Auto-save
  useEffectM(() => {
    const t = setTimeout(() => window.saveState(state), 300);
    return () => clearTimeout(t);
  }, [state]);

  const canvasRef = useRefM(null);
  const [isExporting, setIsExporting] = useStateM(false);
  // 내보내기마다 웹폰트를 새로 fetch/인코딩하면 느리므로, 폰트 조합이 같으면 캐시를 재사용한다.
  const fontEmbedCacheRef = useRefM({ key: null, css: null });

  const onAddSticker = (dataUrl) => {
    // approximate the canvas center for initial placement
    const rect = canvasRef.current?.getBoundingClientRect();
    const w = 140, h = 140;
    const x = rect ? Math.max(0, (rect.width - w) / 2) : 400;
    const y = 200;
    dispatch({ type: 'ADD_STICKER', src: dataUrl, x, y, w, h });
  };

  const exportImage = async (format = 'png') => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    document.body.classList.add('exporting');

    // Wait a paint frame for the exporting class to take effect
    await new Promise(r => setTimeout(r, 60));

    const node = canvasRef.current;

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
      document.body.classList.remove('exporting');
      setIsExporting(false);
    }
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
