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

    try {
      const node = canvasRef.current;
      const options = {
        pixelRatio: 2,
        backgroundColor: state.bg,
        cacheBust: true,
        style: { transform: 'none' },
      };
      let dataUrl;
      if (format === 'jpg') {
        options.quality = 0.95;
        dataUrl = await htmlToImage.toJpeg(node, options);
      } else {
        dataUrl = await htmlToImage.toPng(node, options);
      }
      const link = document.createElement('a');
      const now = new Date();
      const stamp = now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '_' + String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0');
      link.download = `character-sheet_${stamp}.${format === 'jpg' ? 'jpg' : 'png'}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
      alert('저장에 실패했어요. 다시 시도해주세요.\n' + err.message);
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
          {/* CHARACTERS */}
          <div className={'characters mode-' + state.mode}>
            {visibleChars.map((c, i) => (
              <window.CharacterCard
                key={c.letter}
                char={c}
                idx={i}
                dispatch={dispatch}
                isSingle={state.mode === 1}
                subtitle={i === 0 ? state.subtitle : null}
                onSubtitleChange={i === 0 ? (v) => dispatch({ type: 'SET_SUBTITLE', value: v }) : null}
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
