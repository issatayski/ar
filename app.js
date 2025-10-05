// v2 — улучшенные подсказки и обработка ошибок
let KEYFRAMES = [
  { id: 'k1', title: 'Общий вид',     orbit: '0deg 65deg 1.6m',  target: '0m 0m 0m',    fov: '30deg' },
  { id: 'k2', title: 'Деталь спереди',orbit: '45deg 70deg 1.25m', target: '0m 0.02m 0m', fov: '28deg' },
  { id: 'k3', title: 'Обратная часть',orbit: '110deg 60deg 1.35m',target: '0m 0m 0m',    fov: '26deg' },
];

const viewer = document.getElementById('viewer');
const gestureHint = document.getElementById('gestureHint');
const loadError = document.getElementById('loadError');

['pointerdown','wheel','touchstart','keydown'].forEach(evt => {
  window.addEventListener(evt, () => {
    gestureHint && gestureHint.remove();
  }, { once:true });
});

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a,b,t)=> a + (b-a) * t;
function angleDelta(a, b){ return (b - a + 540) % 360 - 180; }
function slerpDeg(a, b, t){ return a + angleDelta(a, b) * t; }
function parseOrbit(str){ const m = str.match(/([\-\d.]+)deg\s+([\-\d.]+)deg\s+([\-\d.]+)m/); if(!m) return {az:0, pol:60, rad:1.5}; return { az: +m[1], pol: +m[2], rad: +m[3] }; }
function formatOrbit(o){ return `${o.az.toFixed(2)}deg ${o.pol.toFixed(2)}deg ${o.rad.toFixed(3)}m`; }
function parseTarget(str){ const m = str.match(/([\-\d.]+)m\s+([\-\d.]+)m\s+([\-\d.]+)m/); if(!m) return {x:0,y:0,z:0}; return { x:+m[1], y:+m[2], z:+m[3] }; }
function formatTarget(t){ return `${t.x.toFixed(3)}m ${t.y.toFixed(3)}m ${t.z.toFixed(3)}m`; }
function parseFov(str){ const m = str.match(/([\-\d.]+)deg/); return m ? +m[1] : 30; }
function formatFov(v){ return `${v.toFixed(2)}deg`; }

let tween = { active:false, t:0, dur:400, from:null, to:null, start:0, raf:0 };

function getCurrentCamera(){
  const orbit = parseOrbit(viewer.getAttribute('camera-orbit') || viewer.cameraOrbit || '0deg 60deg 1.5m');
  const target = parseTarget(viewer.getAttribute('camera-target') || viewer.cameraTarget || '0m 0m 0m');
  const fov = parseFov(viewer.getAttribute('field-of-view') || viewer.fieldOfView || '30deg');
  return { orbit, target, fov };
}
function setCamera(o, t, fov){
  viewer.cameraOrbit = formatOrbit(o);
  viewer.cameraTarget = formatTarget(t);
  viewer.fieldOfView = formatFov(fov);
}
function animateTo(kf, duration=500){
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    setCamera(parseOrbit(kf.orbit), parseTarget(kf.target), parseFov(kf.fov));
    return;
  }
  if (tween.raf) cancelAnimationFrame(tween.raf);
  const from = getCurrentCamera();
  const to = { orbit: parseOrbit(kf.orbit), target: parseTarget(kf.target), fov: parseFov(kf.fov) };
  tween = { active:true, t:0, dur:duration, from, to, start:performance.now(), raf:0 };
  function step(now){
    const e = clamp((now - tween.start) / tween.dur, 0, 1);
    const t = e * (2 - e);
    const o = {
      az: slerpDeg(from.orbit.az, to.orbit.az, t),
      pol: slerpDeg(from.orbit.pol, to.orbit.pol, t),
      rad: lerp(from.orbit.rad, to.orbit.rad, t),
    };
    const tg = { x: lerp(from.target.x, to.target.x, t), y: lerp(from.target.y, to.target.y, t), z: lerp(from.target.z, to.target.z, t) };
    const fov = lerp(from.fov, to.fov, t);
    setCamera(o, tg, fov);
    if (e < 1) tween.raf = requestAnimationFrame(step);
  }
  tween.raf = requestAnimationFrame(step);
}

const frames = [...document.querySelectorAll('.frame')];
const mapFrameToKF = new Map();
frames.forEach(sec => {
  const id = sec.dataset.keyframe;
  const kf = KEYFRAMES.find(k => k.id === id);
  if (kf) mapFrameToKF.set(sec, kf);
});
const io = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if (entry.isIntersecting && entry.intersectionRatio >= 0.6){
      const kf = mapFrameToKF.get(entry.target);
      if (kf) animateTo(kf, 520);
      entry.target.classList.add('is-active');
    } else {
      entry.target.classList.remove('is-active');
    }
  });
},{ threshold:[0, .6, 1] });
frames.forEach(el => io.observe(el));

// Помощник: показать понятную ошибку, если модель не загрузилась
viewer.addEventListener('error', (e)=>{
  console.error('Model Viewer Error:', e);
  if (loadError) loadError.hidden = false;
});
viewer.addEventListener('load', ()=>{
  const kf = KEYFRAMES[0];
  if (kf) animateTo(kf, 0);
});

// Редактор
const editor = document.getElementById('editor');
const toggleEditor = document.getElementById('toggleEditor');
const closeEditor = document.getElementById('closeEditor');
const editorList = document.getElementById('editorList');
const btnImport = document.getElementById('btnImport');
const btnExport = document.getElementById('btnExport');
const jsonIO = document.getElementById('jsonIO');

function openEditor(){ editor.setAttribute('aria-hidden','false'); toggleEditor.setAttribute('aria-pressed','true'); buildEditorList(); }
function hideEditor(){ editor.setAttribute('aria-hidden','true'); toggleEditor.setAttribute('aria-pressed','false'); }
toggleEditor.addEventListener('click', ()=> editor.getAttribute('aria-hidden')==='true' ? openEditor() : hideEditor());
closeEditor.addEventListener('click', hideEditor);

function buildEditorList(){
  editorList.innerHTML = '';
  KEYFRAMES.forEach((kf, idx)=>{
    const wrap = document.createElement('div');
    wrap.className = 'editor-item';
    wrap.innerHTML = `
      <h4>${kf.id} — ${kf.title || ''}</h4>
      <div class="editor-row">
        <input data-k="${idx}" data-f="title" placeholder="Название" value="${kf.title || ''}"/>
        <input data-k="${idx}" data-f="id" placeholder="ID (data-keyframe)" value="${kf.id}"/>
      </div>
      <div class="editor-row">
        <input data-k="${idx}" data-f="orbit" placeholder="cameraOrbit" value="${kf.orbit}"/>
        <input data-k="${idx}" data-f="target" placeholder="cameraTarget" value="${kf.target}"/>
      </div>
      <div class="editor-row">
        <input data-k="${idx}" data-f="fov" placeholder="fieldOfView" value="${kf.fov}"/>
        <button class="btn small" data-act="useCurrent" data-k="${idx}">Из вьюера →</button>
        <button class="btn small" data-act="apply" data-k="${idx}">Применить</button>
      </div>
    `;
    editorList.appendChild(wrap);
  });
  editorList.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('input', (e)=>{
      const k = Number(e.target.dataset.k);
      const f = e.target.dataset.f;
      KEYFRAMES[k][f] = e.target.value;
    });
  });
  editorList.querySelectorAll('button[data-act="useCurrent"]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const k = Number(e.target.dataset.k);
      const cur = getCurrentCamera();
      KEYFRAMES[k].orbit = formatOrbit(cur.orbit);
      KEYFRAMES[k].target = formatTarget(cur.target);
      KEYFRAMES[k].fov = formatFov(cur.fov);
      buildEditorList();
    });
  });
  editorList.querySelectorAll('button[data-act="apply"]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const k = Number(e.target.dataset.k);
      animateTo(KEYFRAMES[k], 400);
    });
  });
}

btnExport.addEventListener('click', ()=>{
  jsonIO.value = JSON.stringify(KEYFRAMES, null, 2);
  jsonIO.focus();
  jsonIO.select();
  try { document.execCommand('copy'); } catch(e){}
});

btnImport.addEventListener('click', ()=>{
  try{
    const arr = JSON.parse(jsonIO.value);
    if (Array.isArray(arr) && arr.length){
      KEYFRAMES = arr;
      mapFrameToKF.clear();
      document.querySelectorAll('.frame').forEach(sec=>{
        const id = sec.dataset.keyframe;
        const kf = KEYFRAMES.find(k => k.id === id);
        if (kf) mapFrameToKF.set(sec, kf);
      });
      buildEditorList();
      alert('Импортировано! Свяжите ID секций с id кадров при необходимости.');
    } else {
      alert('Неверный формат JSON.');
    }
  }catch(err){
    alert('Ошибка парсинга JSON: ' + err.message);
  }
});

// Поддержка AR intent для Android — формируем ссылку динамически (если сайт не в корне домена)
window.addEventListener('DOMContentLoaded', ()=>{
  const androidAR = document.querySelector('[data-ar-android]');
  if (androidAR){
    const glbUrl = new URL('./assets/ais.glb', window.location.href);
    androidAR.href = `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(glbUrl.href)}&mode=ar_preferred`;
  }
});

window.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape' && editor.getAttribute('aria-hidden')==='false') hideEditor();
});
