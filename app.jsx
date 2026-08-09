/* global React, ReactDOM, htmlToImage */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ============================================================
   CONSTANTS
   ============================================================ */

// gQuery: index.html에 걸린 구글 폰트 링크의 해당 폰트 부분과 정확히 동일한 쿼리 조각.
// 내보내기(export) 시 이 조각만 따로 구글에 요청해서, 실제 쓰는 폰트 2개만 이미지에 심는다.
// (그냥 두면 html-to-image가 페이지에 걸린 폰트 전체를 다 훑어서 매우 느려짐)
const FONT_OPTIONS = [
  { id: 'pretendard', label: 'Pretendard (기본 산세리프)', family: "'Pretendard Variable', Pretendard, sans-serif", isPretendard: true },
  { id: 'noto-sans-kr', label: 'Noto Sans KR', family: "'Noto Sans KR', sans-serif", gQuery: 'Noto+Sans+KR:wght@300;400;500;700;900' },
  { id: 'noto-serif-kr', label: 'Noto Serif KR', family: "'Noto Serif KR', serif", gQuery: 'Noto+Serif+KR:wght@400;500;600;700;900' },
  { id: 'nanum-myeongjo', label: '나눔명조', family: "'Nanum Myeongjo', serif", gQuery: 'Nanum+Myeongjo:wght@400;700;800' },
  { id: 'gowun-batang', label: '고운바탕', family: "'Gowun Batang', serif", gQuery: 'Gowun+Batang:wght@400;700' },
  { id: 'gowun-dodum', label: '고운돋움', family: "'Gowun Dodum', sans-serif", gQuery: 'Gowun+Dodum' },
  { id: 'gaegu', label: '개구 (손글씨)', family: "'Gaegu', cursive", gQuery: 'Gaegu:wght@300;400;700' },
  { id: 'nanum-pen', label: '나눔펜 (손글씨)', family: "'Nanum Pen Script', cursive", gQuery: 'Nanum+Pen+Script' },
  { id: 'playfair', label: 'Playfair Display (영문 세리프)', family: "'Playfair Display', serif", gQuery: 'Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400' },
  { id: 'cormorant', label: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", gQuery: 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'eb-garamond', label: 'EB Garamond', family: "'EB Garamond', serif", gQuery: 'EB+Garamond:ital,wght@0,400;0,600;1,400' },
  { id: 'ibm-plex-serif', label: 'IBM Plex Serif', family: "'IBM Plex Serif', serif", gQuery: 'IBM+Plex+Serif:ital,wght@0,400;0,600;1,400' },
  { id: 'inter', label: 'Inter (영문 산세리프)', family: "'Inter', sans-serif", gQuery: 'Inter:wght@300;400;500;600;700' },
  { id: 'jetbrains', label: 'JetBrains Mono (모노)', family: "'JetBrains Mono', monospace", gQuery: 'JetBrains+Mono:wght@400;500;700' },
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
  '-',
];
const DEFAULT_TRAITS_OUTFIT_A = [
  '-',
];
const DEFAULT_TRAITS_APPEARANCE_B = [
  '-',
];
const DEFAULT_TRAITS_OUTFIT_B = [
  '-',
];

const DEFAULT_META_A = { gender: 'M', age: 'age', height: 'cm', affiliation: '직업' };
const DEFAULT_META_B = { gender: 'F', age: 'age', height: 'cm', affiliation: '직업' };

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
    subShapes: ['square', 'square', 'rect', 'square'], // 'square' | 'rect' — 전신컷은 직사각형 기본
    traits: {
      appearance: isA ? [...DEFAULT_TRAITS_APPEARANCE_A] : [...DEFAULT_TRAITS_APPEARANCE_B],
      outfit: isA ? [...DEFAULT_TRAITS_OUTFIT_A] : [...DEFAULT_TRAITS_OUTFIT_B],
    },
    checkedTraits: { appearance: {}, outfit: {} }, // cat -> idx -> bool
    oText: isA ? '-' : '-',
    xText: isA ? '-' : '-',
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

// 업로드한 원본 사진을 그대로 저장하면 용량이 커서 자동저장/내보내기가 느려지므로,
// 캐릭터 시트에 실제로 필요한 크기(긴 변 기준 최대 1600px)로 줄이고 압축해서 저장한다.
// 투명 배경이 필요한 PNG는 포맷을 유지하고, 그 외(대부분 사진)는 JPEG로 압축한다.
function resizeImageFile(file, maxDim = 1600, jpegQuality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        const longSide = Math.max(width, height);
        const keepPng = file.type === 'image/png';

        if (longSide <= maxDim) {
          // 이미 충분히 작으면 원본 그대로 사용 (불필요한 재인코딩 방지)
          resolve(reader.result);
          return;
        }

        const scale = maxDim / longSide;
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const mime = keepPng ? 'image/png' : 'image/jpeg';
        const dataUrl = keepPng
          ? canvas.toDataURL(mime)
          : canvas.toDataURL(mime, jpegQuality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(reader.result); // 리사이즈 실패 시 원본으로 폴백
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fontFamilyById(id) {
  const f = FONT_OPTIONS.find(f => f.id === id);
  return f ? f.family : FONT_OPTIONS[0].family;
}

/* ============================================================
   MINIMAL FONT EMBEDDING (내보내기용)
   ------------------------------------------------------------
   html-to-image 기본 폰트 임베드는 페이지에 걸린 폰트 전체(14종)를
   다 훑어서 다운로드하기 때문에 저장이 매우 느려진다.
   실제로 선택된 2개(제목체/본문체) 폰트만 구글/CDN에서 새로 받아와
   base64로 심어서, 그 결과만 htmlToImage의 fontEmbedCSS로 넘긴다.
   ============================================================ */

async function urlToBase64DataUri(url) {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error('font file fetch failed: ' + url);
  const blob = await res.blob();
  const mime = blob.type || 'font/woff2';
  const buf = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:${mime};base64,${btoa(binary)}`;
}

// 구글 폰트/Pretendard CSS 텍스트 안의 url(...) 들을 실제로 fetch해서 base64로 치환
async function embedFontFacesFromCSS(cssText) {
  const urlRe = /url\((https:[^)]+?)\)/g;
  const urls = [...new Set([...cssText.matchAll(urlRe)].map(m => m[1]))];
  const map = {};
  await Promise.all(urls.map(async (u) => {
    try {
      map[u] = await urlToBase64DataUri(u);
    } catch (e) {
      console.warn('폰트 파일 임베드 실패, 해당 파일은 건너뜁니다.', u, e);
    }
  }));
  return cssText.replace(urlRe, (whole, u) => (map[u] ? `url(${map[u]})` : whole));
}

async function fetchMinimalFontEmbedCSS(fontIds) {
  const uniqueIds = [...new Set(fontIds)];
  const opts = uniqueIds
    .map(id => FONT_OPTIONS.find(f => f.id === id))
    .filter(Boolean);

  const cssChunks = await Promise.all(opts.map(async (opt) => {
    if (opt.isPretendard) {
      const res = await fetch('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
      const text = await res.text();
      return embedFontFacesFromCSS(text);
    }
    if (opt.gQuery) {
      const res = await fetch(`https://fonts.googleapis.com/css2?family=${opt.gQuery}&display=swap`);
      const text = await res.text();
      return embedFontFacesFromCSS(text);
    }
    return '';
  }));

  return cssChunks.join('\n');
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
              let dataUrl;
              try {
                dataUrl = await resizeImageFile(file, 900); // 스티커는 화면에 작게 쓰이므로 더 작게
              } catch (err) {
                dataUrl = await fileToDataURL(file);
              }
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
    try {
      const dataUrl = await resizeImageFile(file);
      onChange(dataUrl);
    } catch (e) {
      console.warn('이미지 압축 실패, 원본으로 저장합니다.', e);
      const dataUrl = await fileToDataURL(file);
      onChange(dataUrl);
    }
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
window.resizeImageFile = resizeImageFile;
window.fetchMinimalFontEmbedCSS = fetchMinimalFontEmbedCSS;
window.fontFamilyById = fontFamilyById;
window.Toolbar = Toolbar;
window.Editable = Editable;
window.ImageSlot = ImageSlot;
