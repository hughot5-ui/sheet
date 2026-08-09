/* global React */
const { useState: useStateCC, useRef: useRefCC } = React;

function CharacterCard({ char, idx, dispatch, isSingle }) {
  const updateChar = (patch) => dispatch({ type: 'UPDATE_CHAR', idx, patch });

  /* ---- name row ---- */
  const setNameKo = (v) => updateChar({ nameKo: v });
  const setNameEn = (v) => updateChar({ nameEn: v });

  /* ---- tags ---- */
  const setTag = (tagIdx, v) => {
    const tags = [...char.tags];
    tags[tagIdx] = v;
    updateChar({ tags });
  };
  const removeTag = (tagIdx) => {
    const tags = char.tags.filter((_, i) => i !== tagIdx);
    updateChar({ tags });
  };
  const addTag = () => {
    updateChar({ tags: [...char.tags, '#새태그'] });
  };

  /* ---- images ---- */
  const setMainImage = (dataUrl) => updateChar({ mainImage: dataUrl, mainImageTransform: { scale: 1, x: 0, y: 0 } });
  const removeMainImage = () => updateChar({ mainImage: null, mainImageTransform: { scale: 1, x: 0, y: 0 } });
  const setMainImageTransform = (t) => updateChar({ mainImageTransform: t });
  const setSubImage = (subIdx, dataUrl) => {
    const subImages = [...char.subImages];
    subImages[subIdx] = dataUrl;
    const subImageTransforms = [...(char.subImageTransforms || [])];
    subImageTransforms[subIdx] = { scale: 1, x: 0, y: 0 };
    updateChar({ subImages, subImageTransforms });
  };
  const setSubImageTransform = (subIdx, t) => {
    const subImageTransforms = [...(char.subImageTransforms || [])];
    subImageTransforms[subIdx] = t;
    updateChar({ subImageTransforms });
  };
  // 이미지만 비우고 칸(라벨)은 유지
  const removeSubImage = (subIdx) => {
    const subImages = [...char.subImages];
    subImages[subIdx] = null;
    const subImageTransforms = [...(char.subImageTransforms || [])];
    subImageTransforms[subIdx] = { scale: 1, x: 0, y: 0 };
    updateChar({ subImages, subImageTransforms });
  };
  const setSubLabel = (subIdx, v) => {
    const subLabels = [...char.subLabels];
    subLabels[subIdx] = v;
    updateChar({ subLabels });
  };
  const addSubSlot = () => {
    updateChar({
      subImages: [...char.subImages, null],
      subImageTransforms: [...(char.subImageTransforms || []), { scale: 1, x: 0, y: 0 }],
      subLabels: [...char.subLabels, '라벨'],
      subShapes: [...(char.subShapes || []), 'square'],
    });
  };
  const removeSubSlot = (subIdx) => {
    const subImages = char.subImages.filter((_, i) => i !== subIdx);
    const subImageTransforms = (char.subImageTransforms || []).filter((_, i) => i !== subIdx);
    const subLabels = char.subLabels.filter((_, i) => i !== subIdx);
    const subShapes = (char.subShapes || []).filter((_, i) => i !== subIdx);
    updateChar({ subImages, subImageTransforms, subLabels, subShapes });
  };
  const toggleSubShape = (subIdx) => {
    const shapes = [...(char.subShapes || [])];
    const current = shapes[subIdx] || 'square';
    shapes[subIdx] = current === 'square' ? 'rect' : 'square';
    updateChar({ subShapes: shapes });
  };

  /* ---- traits (외모/의상 체크리스트, cat: 'appearance' | 'outfit') ---- */
  const setTrait = (cat, tIdx, v) => {
    const list = [...char.traits[cat]];
    list[tIdx] = v;
    updateChar({ traits: { ...char.traits, [cat]: list } });
  };
  const toggleTrait = (cat, tIdx) => {
    const catChecked = { ...(char.checkedTraits[cat] || {}) };
    catChecked[tIdx] = !catChecked[tIdx];
    updateChar({ checkedTraits: { ...char.checkedTraits, [cat]: catChecked } });
  };
  const removeTrait = (cat, tIdx) => {
    const list = char.traits[cat].filter((_, i) => i !== tIdx);
    const oldChecked = char.checkedTraits[cat] || {};
    const newChecked = {};
    Object.keys(oldChecked).forEach(k => {
      const kNum = parseInt(k, 10);
      if (kNum < tIdx) newChecked[kNum] = oldChecked[k];
      else if (kNum > tIdx) newChecked[kNum - 1] = oldChecked[k];
    });
    updateChar({
      traits: { ...char.traits, [cat]: list },
      checkedTraits: { ...char.checkedTraits, [cat]: newChecked },
    });
  };
  const addTrait = (cat) => {
    updateChar({ traits: { ...char.traits, [cat]: [...char.traits[cat], '새 항목'] } });
  };

  /* ---- OX ---- */
  const setOText = (v) => updateChar({ oText: v });
  const setXText = (v) => updateChar({ xText: v });

  /* ---- palette ---- */
  const setPaletteColor = (pIdx, v) => {
    const palette = [...char.palette];
    palette[pIdx] = v;
    updateChar({ palette });
  };
  const addPaletteColor = () => {
    updateChar({ palette: [...char.palette, '#cccccc'] });
  };
  const removePaletteColor = (pIdx) => {
    if (char.palette.length <= 1) return;
    const palette = char.palette.filter((_, i) => i !== pIdx);
    updateChar({ palette });
  };

  /* ---- meta ---- */
  const setMeta = (key, v) => {
    updateChar({ meta: { ...char.meta, [key]: v } });
  };

  const mainPlaceholder = 'MAIN PORTRAIT';

  return (
    <div className="char">
      {/* NAME ROW */}
      <div className="char__namerow">
        <span className="char__badge">{char.letter}</span>
        <div className="char__name-group">
          <window.Editable
            className="char__name-ko"
            value={char.nameKo}
            onChange={setNameKo}
          />
          <window.Editable
            className="char__name-en"
            value={char.nameEn}
            onChange={setNameEn}
          />
        </div>
      </div>

      {/* TAGS */}
      <div className="char__tags">
        {char.tags.map((tag, tIdx) => (
          <span className="char__tag" key={tIdx}>
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setTag(tIdx, e.target.innerText)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
            >{tag}</span>
            <span className="tag-del" onClick={() => removeTag(tIdx)}>×</span>
          </span>
        ))}
        <button className="char__tag-add" onClick={addTag}>+ 태그</button>
      </div>

      {/* BODY */}
      <div className="char__body">
        {/* IMAGES */}
        <div className="char__images">
          {/* main portrait: always fixed 3:4, full width */}
          <window.ImageSlot
            className="image-slot--main"
            src={char.mainImage}
            transform={char.mainImageTransform}
            onChange={setMainImage}
            onTransformChange={setMainImageTransform}
            onRemoveImage={char.mainImage ? removeMainImage : null}
            placeholder={mainPlaceholder}
          />

          {/* sub images: below main, in a grid, each resizable square/rect */}
          <div className="char__images-grid">
            {char.subImages.map((src, sIdx) => {
              const shape = (char.subShapes && char.subShapes[sIdx]) || 'square';
              return (
                <window.ImageSlot
                  key={sIdx}
                  className={'image-slot--sub image-slot--' + shape}
                  src={src}
                  transform={(char.subImageTransforms || [])[sIdx]}
                  onChange={(v) => setSubImage(sIdx, v)}
                  onTransformChange={(t) => setSubImageTransform(sIdx, t)}
                  onRemoveImage={src ? () => removeSubImage(sIdx) : null}
                  onRemoveSlot={() => removeSubSlot(sIdx)}
                  placeholder="SUB"
                  maxDim={1000}
                >
                  <button
                    className="image-slot__shape-toggle"
                    onClick={(e) => { e.stopPropagation(); toggleSubShape(sIdx); }}
                    title="비율 전환 (정사각형 / 직사각형)"
                  >{shape === 'square' ? '▢' : '▭'}</button>
                  <div
                    className="image-slot__label"
                    contentEditable
                    suppressContentEditableWarning
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => setSubLabel(sIdx, e.target.innerText)}
                  >{char.subLabels[sIdx]}</div>
                </window.ImageSlot>
              );
            })}
          </div>
          <button className="images-add-btn" onClick={addSubSlot} title="이미지 슬롯 추가">+ 이미지 슬롯 추가</button>
        </div>

        {/* INFO */}
        <div className="char__info">
          {/* Checklist: 외모 */}
          <div className="trait-section">
            <div className="trait-section__title">외모</div>
            <ul className="check-list">
              {char.traits.appearance.map((trait, tIdx) => (
                <li className="check-item" key={tIdx}>
                  <button
                    className={'check-item__box' + (char.checkedTraits.appearance[tIdx] ? ' is-checked' : '')}
                    onClick={() => toggleTrait('appearance', tIdx)}
                    aria-label="체크 토글"
                  />
                  <span
                    className="check-item__text"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setTrait('appearance', tIdx, e.target.innerText)}
                  >{trait}</span>
                  <button
                    className="check-item__del"
                    onClick={() => removeTrait('appearance', tIdx)}
                    title="항목 삭제"
                  >×</button>
                </li>
              ))}
              <button className="check-list__add" onClick={() => addTrait('appearance')}>+ 항목 추가</button>
            </ul>
          </div>

          {/* Checklist: 의상 */}
          <div className="trait-section">
            <div className="trait-section__title">의상</div>
            <ul className="check-list">
              {char.traits.outfit.map((trait, tIdx) => (
                <li className="check-item" key={tIdx}>
                  <button
                    className={'check-item__box' + (char.checkedTraits.outfit[tIdx] ? ' is-checked' : '')}
                    onClick={() => toggleTrait('outfit', tIdx)}
                    aria-label="체크 토글"
                  />
                  <span
                    className="check-item__text"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setTrait('outfit', tIdx, e.target.innerText)}
                  >{trait}</span>
                  <button
                    className="check-item__del"
                    onClick={() => removeTrait('outfit', tIdx)}
                    title="항목 삭제"
                  >×</button>
                </li>
              ))}
              <button className="check-list__add" onClick={() => addTrait('outfit')}>+ 항목 추가</button>
            </ul>
          </div>

          {/* OX boxes */}
          <div className="ox-box ox-box--o">
            <span className="ox-box__mark">O</span>
            <span
              className="ox-box__text"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setOText(e.target.innerText)}
            >{char.oText}</span>
          </div>
          <div className="ox-box ox-box--x">
            <span className="ox-box__mark">X</span>
            <span
              className="ox-box__text"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setXText(e.target.innerText)}
            >{char.xText}</span>
          </div>

          {/* Palette strip */}
          <div className="palette-section">
            <div className="palette-section__title">
              <span className="palette-section__dash"></span>PALETTE · 색상 팔레트
            </div>
            <div className="palette-strip">
              {char.palette.map((color, pIdx) => (
                <div className="palette-block" key={pIdx} style={{ background: color }}>
                  <input
                    type="color"
                    className="palette-block__input"
                    value={color}
                    onChange={(e) => setPaletteColor(pIdx, e.target.value)}
                    title={color}
                  />
                  <span className="palette-block__hex">{color.toUpperCase()}</span>
                  {char.palette.length > 1 && (
                    <button
                      className="palette-block__del"
                      onClick={(e) => { e.stopPropagation(); removePaletteColor(pIdx); }}
                      title="이 색상 삭제"
                    >×</button>
                  )}
                </div>
              ))}
              <button className="palette-block palette-block--add" onClick={addPaletteColor} title="색 추가">+</button>
            </div>
          </div>

          {/* Meta bar */}
          <div className="char__meta">
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setMeta('gender', e.target.innerText)}
            >{char.meta.gender}</span>
            <span className="sep">|</span>
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setMeta('age', e.target.innerText)}
            >{char.meta.age}</span>
            <span className="sep">|</span>
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setMeta('height', e.target.innerText)}
            >{char.meta.height}</span>
            <span className="sep">|</span>
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setMeta('affiliation', e.target.innerText)}
            >{char.meta.affiliation}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.CharacterCard = CharacterCard;
