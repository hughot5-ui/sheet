/* global React */
const { useState: useStateCC, useRef: useRefCC } = React;

function CharacterCard({ char, idx, dispatch, isSingle, subtitle, onSubtitleChange }) {
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
  const setMainImage = (dataUrl) => updateChar({ mainImage: dataUrl });
  const removeMainImage = () => updateChar({ mainImage: null });
  const setSubImage = (subIdx, dataUrl) => {
    const subImages = [...char.subImages];
    subImages[subIdx] = dataUrl;
    updateChar({ subImages });
  };
  // 이미지만 비우고 칸(라벨)은 유지
  const removeSubImage = (subIdx) => {
    const subImages = [...char.subImages];
    subImages[subIdx] = null;
    updateChar({ subImages });
  };
  const setSubLabel = (subIdx, v) => {
    const subLabels = [...char.subLabels];
    subLabels[subIdx] = v;
    updateChar({ subLabels });
  };
  const addSubSlot = () => {
    updateChar({
      subImages: [...char.subImages, null],
      subLabels: [...char.subLabels, '라벨'],
    });
  };
  const removeSubSlot = (subIdx) => {
    const subImages = char.subImages.filter((_, i) => i !== subIdx);
    const subLabels = char.subLabels.filter((_, i) => i !== subIdx);
    updateChar({ subImages, subLabels });
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

      {/* SUBTITLE (세계관/관계/시대 배경 설명, 첫 캐릭터 카드에만 표시) */}
      {subtitle != null && (
        <window.Editable
          tag="div"
          className="char__subtitle"
          value={subtitle}
          onChange={onSubtitleChange}
          multiline
        />
      )}

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
          {/* top row: main + first 2 sub on side */}
          <div className="char__images-top">
            <window.ImageSlot
              className="image-slot--main"
              src={char.mainImage}
              onChange={setMainImage}
              onRemoveImage={char.mainImage ? removeMainImage : null}
              placeholder={mainPlaceholder}
            />
            <div className="char__images-side">
              {char.subImages.slice(0, 2).map((src, sIdx) => (
                <window.ImageSlot
                  key={sIdx}
                  src={src}
                  onChange={(v) => setSubImage(sIdx, v)}
                  onRemoveImage={src ? () => removeSubImage(sIdx) : null}
                  onRemoveSlot={() => removeSubSlot(sIdx)}
                  placeholder="SUB"
                >
                  <div
                    className="image-slot__label"
                    contentEditable
                    suppressContentEditableWarning
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => setSubLabel(sIdx, e.target.innerText)}
                  >{char.subLabels[sIdx]}</div>
                </window.ImageSlot>
              ))}
            </div>
          </div>

          {/* extras row: remaining sub images at the bottom */}
          {char.subImages.length > 2 && (
            <div className="char__images-extras">
              {char.subImages.slice(2).map((src, sIdxRaw) => {
                const sIdx = sIdxRaw + 2;
                return (
                  <window.ImageSlot
                    key={sIdx}
                    src={src}
                    onChange={(v) => setSubImage(sIdx, v)}
                    onRemoveImage={src ? () => removeSubImage(sIdx) : null}
                    onRemoveSlot={() => removeSubSlot(sIdx)}
                    placeholder="SUB"
                  >
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
              <button className="image-slot--add" onClick={addSubSlot} title="이미지 슬롯 추가">+</button>
            </div>
          )}
          {char.subImages.length <= 2 && (
            <button className="image-slot--add" onClick={addSubSlot} title="이미지 슬롯 추가" style={{aspectRatio: 'auto', height: 40, marginTop: 4}}>+ 이미지 슬롯 추가</button>
          )}
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

          {/* Color strip */}
          <div className="color-strip">
            <span className="color-strip__label">Palette</span>
            {char.palette.map((color, pIdx) => (
              <span className="color-strip__item" key={pIdx}>
                <input
                  type="color"
                  className="color-strip__dot"
                  value={color}
                  onChange={(e) => setPaletteColor(pIdx, e.target.value)}
                  title={color}
                />
                {char.palette.length > 1 && (
                  <button
                    className="color-strip__del"
                    onClick={() => removePaletteColor(pIdx)}
                    title="이 색상 삭제"
                  >×</button>
                )}
              </span>
            ))}
            <button className="color-strip__add" onClick={addPaletteColor} title="색 추가">+</button>
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
