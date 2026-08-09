/* global React, ReactDOM, htmlToImage */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ============================================================
   CONSTANTS
   ============================================================ */

const FONT_OPTIONS = [
  { id: 'pretendard', label: 'Pretendard (기본 산세리프)', family: "'Pretendard Variable', Pretendard, sans-serif" },
  { id: 'noto-sans-kr', label: 'Noto Sans KR', family: "'Noto Sans KR', sans-serif" },
  { id: 'noto-serif-kr', label: 'Noto Serif KR', family: "'Noto Serif KR', serif" },
  { id: 'nanum-myeongjo', label: '나눔명조', family: "'Nanum Myeongjo', serif" },
  { id: 'gowun-batang', label: '고운바탕', family: "'Gowun Batang', serif" },
  { id: 'gowun-dodum', label: '고운돋움', family: "'Gowun Dodum', sans-serif" },
  { id: 'gaegu', label: '개구 (손글씨)', family: "'Gaegu', cursive" },
  { id: 'nanum-pen', label: '나눔펜 (손글씨)', family: "'Nanum Pen Script', cursive" },
  { id: 'playfair', label: 'Playfair Display (영문 세리프)', family: "'Playfair Display', serif" },
  { id: 'cormorant', label: 'Cormorant Garamond', family: "'Cormorant Garamond', serif" },
  { id: 'eb-garamond', label: 'EB Garamond', family: "'EB Garamond', serif" },
  { id: 'ibm-plex-serif', label: 'IBM Plex Serif', family: "'IBM Plex Serif', serif" },
  { id: 'inter', label: 'Inter (영문 산세리프)', family: "'Inter', sans-serif" },
  { id: 'jetbrains', label: 'JetBrains Mono (모노)', family: "'JetBrains Mono', monospace" },
];

const PALETTE_PRESETS = [
  { id: 'clean',    name: 'Clean White',  bg: '#f4f2ec', text: '#2a2620', point: '#e08a5c', palette: ['#e08a5c','#c46a3a','#e5b98a','#f4e6d5'] },
  { id: 'cream',    name: 'Cream Paper',  bg: '#f0e8d8', text: '#3b2a1a', point: '#a03a2a', palette: ['#a03a2a','#c76a4a','#e3a37a','#3b2a1a'] },
  { id: 'mono',     name: 'Mono Dark',    bg: '#1c1a17', text: '#f4f2ec', point: '#e8b657', palette: ['#e8b657','#a89373','#f4f2ec','#3a352e'] },
  { id: 'pastel',   name: 'Pastel Pink',  bg: '#fbeef0', text: '#4a2a35', point: '#e07694', palette: ['#e07694','#f4a8b8','#f6d0d8','#4a2a35'] },
  { id: 'magazine', name: 'Magazine',     bg: '#efe9dd', text: '#1e1c18', point: '#c8322a', palette: ['#c8322a','#e5b856','#4a4638','#1e1c18'] },
  { id: 'sky',      name: 'Sky Blue',     bg: '#eef3f7', text: '#1e2a3a', point: '#4a7fb0', palette: ['#4a7fb0','#8ab0d0','#c7dcec','#1e2a3a'] },
  { id: 'moss',     name: 'Moss Green',   bg: '#eef0e6', text: '#22271a', point: '#5a7a3a', palette: ['#5a7a3a','#8ea86e','#c3d3a6','#22271a'] },
  { id: 'lavender', name: 'Lavender',     bg: '#f0edf5', text: '#2e2540', point: '#7c68b0', palette: ['#7c68b0','#a99ad0','#d6cde5','#2e2540'] },
];

const DEFAULT_TAGS = ['#태그1', '#태그2', '#태그3'];

const DEFAULT_TRAITS_APPEARANCE_A = [
  '눈에 띄는 헤어스타일',
  '기본 표정: 살짝 웃는 표정, 이완된 눈',
  '가늘고 날카로운 눈매',
  '두께감이 있는 체형 (근육질에 가까움)',
];
const DEFAULT_TRAITS_OUTFIT_A = [
  '옷은 심플하고 절제된 컬러 위주',
];
const DEFAULT_TRAITS_APPEARANCE_B = [
  '순수하고 무해한 인상',
  '둥근 눈매 + 처진 눈썹 + 속눈썹 + 언더라인',
  '슬랜더 체형 (평균~조금 마름)',
];
const DEFAULT_TRAITS_OUTFIT_B = [
  '허리 기장 짧은 아우터 / 몸에 고정 벨트',
  '부담이 있을 만큼 얇지 않은 실루엣',
];

const DEFAULT_META_A = { gender: 'M', age: '1살 연하', height: '182cm', affiliation: '아이돌 센터' };
const DEFAULT_META_B = { gender: 'F', age: '1살 연상', height: '170cm', affiliation: '모델' };

function makeCharacter(letter) {
  const isA = letter === 'A';
  return {
    letter,
    nameKo: isA ? '캐릭터 이름' : '캐릭터 이름',
    nameEn: isA ? 'Character Name' : 'Character Name',
    tags: [...DEFAULT_TAGS],
    mainImage: null,
    subImages: [null, null, null, null], // 4 sub slots by default (main + 4 = 5 total)
    subLabels: ['평상시', '표정 예시', '전신 or 뒷모습', '기타'],
    traits: {
      appearance: isA ? [...DEFAULT_TRAITS_APPEARANCE_A] : [...DEFAULT_TRAITS_APPEARANCE_B],
      outfit: isA ? [...DEFAULT_TRAITS_OUTFIT_A] : [...DEFAULT_TRAITS_OUTFIT_B],
    },
    checkedTraits: { appearance: {}, outfit: {} }, // cat -> idx -> bool
    oText: isA ? '강한 갈매기 눈매 (눈알도 OK)' : '유순한 사슴상 (또렷한 미소)',
    xText: isA ? '순둥이 (진짜 누구나도 됨) / 애매함' : '금발 or 갈발 / 거유',
    palette: isA ? ['#c8322a','#e5b856','#f4d8a0','#efe9dd'] : ['#a8b088','#d0d8b0','#e8ecd0','#3a3e2c'],
    meta: isA ? {...DEFAULT_META_A} : {...DEFAULT_META_B},
  };
}

const DEFAULT_STATE = {
  mode: 1, // 1 or 2
  subtitle: '작품 · 세계관 · 관계 · 시대 배경을 여기에 짧게 적어주세요',
  imageCredit: '',
  characters: [makeCharacter('A'), makeCharacter('B')],
  paletteId: 'clean',
  bg: '#f4f2ec',
  text: '#2a2620',
  point: '#e08a5c',
  fontHeading: 'playfair',
  fontBody: 'pretendard',
  stickers: [], // {id, src, x, y, w, h, rot, z}
};

const STORAGE_KEY = 'character-sheet-v2';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // migration guard
    if (!parsed || !parsed.characters) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save', e);
  }
}

/* ============================================================
   HELPERS
   ============================================================ */

function useAutoSave(state) {
  useEffect(() => {
    const t = setTimeout(() => saveState(state), 300);
    return () => clearTimeout(t);
  }, [state]);
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fontFamilyById(id) {
  const f = FONT_OPTIONS.find(f => f.id === id);
  return f ? f.family : FONT_OPTIONS[0].family;
}

/* ============================================================
   TOOLBAR
   ============================================================ */

function Toolbar({ state, dispatch, onExport, onAddSticker }) {
  const fileInputRef = useRef(null);

  const applyPreset = (preset) => {
    dispatch({ type: 'APPLY_PRESET', preset });
  };

  return (
    <div className="toolbar">
      <div className="toolbar__title">
        Character Sheet
        <small>외관 설명표</small>
      </div>

      {/* Mode toggle */}
      <div className="toolbar__group">
        <span className="toolbar__label">인원</span>
        <button
          className={'tb-btn' + (state.mode === 1 ? ' is-active' : '')}
          onClick={() => dispatch({ type: 'SET_MODE', mode: 1 })}
        >1인</button>
        <button
          className={'tb-btn' + (state.mode === 2 ? ' is-active' : '')}
          onClick={() => dispatch({ type: 'SET_MODE', mode: 2 })}
        >2인</button>
      </div>

      {/* Colors */}
      <div className="toolbar__group">
        <span className="toolbar__label">배경</span>
        <input
          className="tb-swatch-input"
          type="color"
          value={state.bg}
          onChange={(e) => dispatch({ type: 'SET_COLOR', key: 'bg', value: e.target.value })}
          title={'배경색 ' + state.bg}
        />
        <span className="toolbar__label">텍스트</span>
        <input
          className="tb-swatch-input"
          type="color"
          value={state.text}
          onChange={(e) => dispatch({ type: 'SET_COLOR', key: 'text', value: e.target.value })}
          title={'텍스트색 ' + state.text}
        />
        <span className="toolbar__label">포인트</span>
        <input
          className="tb-swatch-input"
          type="color"
          value={state.point}
          onChange={(e) => dispatch({ type: 'SET_COLOR', key: 'point', value: e.target.value })}
          title={'포인트색 ' + state.point}
        />
      </div>

      {/* Preset palettes */}
      <div className="toolbar__group" style={{flexWrap:'wrap'}}>
        <span className="toolbar__label">프리셋</span>
        {PALETTE_PRESETS.map(p => (
          <button
            key={p.id}
            className={'preset-chip' + (state.paletteId === p.id ? ' is-active' : '')}
            onClick={() => applyPreset(p)}
            title={p.name}
          >
            <span className="preset-chip__dots">
              <span style={{background: p.bg}} />
              <span style={{background: p.text}} />
              <span style={{background: p.point}} />
            </span>
            {p.name}
          </button>
        ))}
      </div>

      {/* Fonts */}
      <div className="toolbar__group">
        <span className="toolbar__label">제목폰트</span>
        <select
          className="tb-select"
          value={state.fontHeading}
          onChange={(e) => dispatch({ type: 'SET_FONT', key: 'fontHeading', value: e.target.value })}
        >
          {FONT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <span className="toolbar__label">본문폰트</span>
        <select
          className="tb-select"
          value={state.fontBody}
          onChange={(e) => dispatch({ type: 'SET_FONT', key: 'fontBody', value: e.target.value })}
        >
          {FONT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>

      {/* Sticker upload */}
      <div className="toolbar__group">
        <button
          className="tb-btn"
          onClick={() => fileInputRef.current?.click()}
          title="스티커 이미지 업로드 (여러 개 선택 가능)"
        >
          <span style={{fontSize:'14px'}}>✦</span> 스티커 추가
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{display:'none'}}
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            for (const file of files) {
              const dataUrl = await fileToDataURL(file);
              onAddSticker(dataUrl);
            }
            e.target.value = '';
          }}
        />
      </div>

      <div className="spacer" />

      {/* Reset + Export */}
      <div className="toolbar__group" style={{borderRight:0}}>
        <button
          className="tb-btn"
          onClick={() => {
            if (confirm('모든 내용을 초기 상태로 되돌립니다. 계속할까요?')) {
              localStorage.removeItem(STORAGE_KEY);
              dispatch({ type: 'RESET' });
            }
          }}
        >초기화</button>
        <button
          className="tb-btn tb-btn--primary"
          onClick={() => onExport('png')}
        >PNG 저장</button>
        <button
          className="tb-btn"
          onClick={() => onExport('jpg')}
        >JPG 저장</button>
      </div>
    </div>
  );
}

/* ============================================================
   EDITABLE TEXT
   ============================================================ */

function Editable({ value, onChange, tag = 'span', className, style, placeholder, multiline }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value || '';
    }
  }, [value]);

  const Tag = tag;
  return (
    <Tag
      ref={ref}
      className={className}
      style={style}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={(e) => {
        const v = multiline ? e.target.innerText : e.target.innerText.replace(/\n/g, ' ');
        onChange(v);
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === 'Enter') {
          e.preventDefault();
          e.target.blur();
        }
      }}
    />
  );
}

/* ============================================================
   IMAGE SLOT
   ============================================================ */

function ImageSlot({ src, onChange, onRemoveImage, onRemoveSlot, className = '', placeholder = 'DROP IMAGE', children }) {
  const inputRef = useRef(null);

  const handleClick = () => inputRef.current?.click();

  const handleFile = async (file) => {
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    onChange(dataUrl);
  };

  return (
    <div
      className={'image-slot ' + className}
      onClick={handleClick}
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
    >
      {src ? (
        <img src={src} alt="" />
      ) : (
        <div className="image-slot__placeholder">
          + IMAGE<br/>
          <span style={{opacity:0.7,fontSize:'9px'}}>{placeholder}</span>
        </div>
      )}
      {src && onRemoveImage && (
        <button
          className="image-slot__remove"
          onClick={(e) => { e.stopPropagation(); onRemoveImage(); }}
          title="이미지만 제거"
        >×</button>
      )}
      {onRemoveSlot && (
        <button
          className="image-slot__remove-slot"
          onClick={(e) => { e.stopPropagation(); onRemoveSlot(); }}
          title="이 이미지 칸 삭제"
        >칸삭제</button>
      )}
      {children}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{display:'none'}}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/* Export components to window for other files (not needed here since single file) */
window.FONT_OPTIONS = FONT_OPTIONS;
window.PALETTE_PRESETS = PALETTE_PRESETS;
window.DEFAULT_STATE = DEFAULT_STATE;
window.STORAGE_KEY = STORAGE_KEY;
window.makeCharacter = makeCharacter;
window.loadState = loadState;
window.saveState = saveState;
window.fileToDataURL = fileToDataURL;
window.fontFamilyById = fontFamilyById;
window.Toolbar = Toolbar;
window.Editable = Editable;
window.ImageSlot = ImageSlot;
