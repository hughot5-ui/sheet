/* global React */
const { useState: useStateSL, useRef: useRefSL, useEffect: useEffectSL } = React;

function StickerLayer({ stickers, dispatch }) {
  const [selectedId, setSelectedId] = useStateSL(null);
  const dragStateRef = useRefSL(null);
  const layerRef = useRefSL(null);

  useEffectSL(() => {
    const onClickOutside = (e) => {
      if (!e.target.closest('.sticker')) setSelectedId(null);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffectSL(() => {
    const onMove = (e) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;

      if (ds.type === 'move') {
        dispatch({ type: 'UPDATE_STICKER', id: ds.id, patch: {
          x: ds.origX + dx,
          y: ds.origY + dy,
        }});
      } else if (ds.type === 'resize') {
        const ratio = ds.origW / ds.origH;
        let deltaW = dx;
        // For each corner, invert direction as needed
        if (ds.corner === 'tl') deltaW = -dx;
        if (ds.corner === 'bl') deltaW = -dx;
        const newW = Math.max(20, ds.origW + deltaW);
        const newH = newW / ratio;
        let newX = ds.origX;
        let newY = ds.origY;
        if (ds.corner === 'tl' || ds.corner === 'bl') newX = ds.origX + (ds.origW - newW);
        if (ds.corner === 'tl' || ds.corner === 'tr') newY = ds.origY + (ds.origH - newH);
        dispatch({ type: 'UPDATE_STICKER', id: ds.id, patch: {
          w: newW, h: newH, x: newX, y: newY,
        }});
      } else if (ds.type === 'rotate') {
        const rect = ds.rect;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
        dispatch({ type: 'UPDATE_STICKER', id: ds.id, patch: { rot: angle }});
      }
    };
    const onUp = () => { dragStateRef.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dispatch]);

  const startMove = (e, sticker) => {
    if (e.target.closest('.sticker__handle') || e.target.closest('.sticker__toolbar')) return;
    e.preventDefault();
    setSelectedId(sticker.id);
    dragStateRef.current = {
      type: 'move',
      id: sticker.id,
      startX: e.clientX, startY: e.clientY,
      origX: sticker.x, origY: sticker.y,
    };
  };

  const startResize = (e, sticker, corner) => {
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = {
      type: 'resize',
      id: sticker.id,
      corner,
      startX: e.clientX, startY: e.clientY,
      origX: sticker.x, origY: sticker.y,
      origW: sticker.w, origH: sticker.h,
    };
  };

  const startRotate = (e, sticker) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.target.closest('.sticker');
    const rect = el.getBoundingClientRect();
    dragStateRef.current = {
      type: 'rotate',
      id: sticker.id,
      rect,
    };
  };

  const deleteSticker = (id) => {
    dispatch({ type: 'REMOVE_STICKER', id });
    setSelectedId(null);
  };
  const bringForward = (id) => dispatch({ type: 'STICKER_Z', id, dir: +1 });
  const sendBackward = (id) => dispatch({ type: 'STICKER_Z', id, dir: -1 });

  // Sort by z-index (ascending, so higher z drawn last)
  const sorted = [...stickers].sort((a, b) => (a.z || 0) - (b.z || 0));

  return (
    <div className="sticker-layer" ref={layerRef}>
      {sorted.map(s => {
        const isSelected = s.id === selectedId;
        return (
          <div
            key={s.id}
            className={'sticker' + (isSelected ? ' is-selected' : '')}
            style={{
              left: s.x, top: s.y,
              width: s.w, height: s.h,
              transform: `rotate(${s.rot || 0}deg)`,
              zIndex: s.z || 0,
            }}
            onMouseDown={(e) => startMove(e, s)}
          >
            <img src={s.src} alt="sticker" />
            {isSelected && (
              <>
                <div className="sticker__handle sticker__handle--tl" onMouseDown={(e) => startResize(e, s, 'tl')} />
                <div className="sticker__handle sticker__handle--tr" onMouseDown={(e) => startResize(e, s, 'tr')} />
                <div className="sticker__handle sticker__handle--bl" onMouseDown={(e) => startResize(e, s, 'bl')} />
                <div className="sticker__handle sticker__handle--br" onMouseDown={(e) => startResize(e, s, 'br')} />
                <div className="sticker__handle sticker__handle--rot" onMouseDown={(e) => startRotate(e, s)} />
                <div className="sticker__toolbar" onMouseDown={(e) => e.stopPropagation()}>
                  <button onClick={() => bringForward(s.id)} title="앞으로">▲</button>
                  <button onClick={() => sendBackward(s.id)} title="뒤로">▼</button>
                  <button className="danger" onClick={() => deleteSticker(s.id)} title="삭제">×</button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

window.StickerLayer = StickerLayer;
