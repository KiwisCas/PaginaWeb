// --- RUTAS DE LOS VIDEOS EN LA CARPETA ASSETS ---
const assetPaths = {
  s1:   "assets/s1.mp4",
  s2_0: "assets/s2.mp4",
  s2_1: "assets/s2_1.mp4",
  s2_2: "assets/s2_2.mp4",
  s2_3: "assets/s2_3.mp4",
  s3_0: "assets/s3.mp4",
  s3_1: "assets/s3_1.mp4",
  s3_2: "assets/s3_2.mp4",
  s3_3: "assets/s3_3.mp4",
  s4_0: "assets/s4.mp4",
  s4_1: "assets/s4_1.mp4",
  s4_2: "assets/s4_2.mp4",
  s4_3: "assets/s4_3.mp4",
  s5:   "assets/s5.mp4",
  f1:   "assets/f1.mp4",
  f2:   "assets/f2.mp4",
  f3:   "assets/f3.mp4"
};

// Objeto para guardar las URLs en caché (Blobs)
const loadedFiles = {};

const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const sceneLabel = document.getElementById('sceneLabel');
const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');
const loadingBox = document.getElementById('loading-box');
const loadingText = document.getElementById('loading-text');
const loadBar = document.getElementById('load-bar');
const initBtn = document.getElementById('initBtn');

// Estructura de decisiones
const decisions = {
  s2_0: {
    options: [
      { text: '¿Acaso murieron?', weight: 2, next: 's2_1' },
      { text: '¿Simplemente desaparecieron?', weight: 1, next: 's2_2' },
      { text: 'Qué interesante.', weight: 0, next: 's2_3' }
    ]
  },
  s3_0: {
    options: [
      { text: '¿Qué sonido?', weight: 2, next: 's3_1' },
      { text: '¿Ese zumbido?', weight: 1, next: 's3_2' },
      { text: 'No escucho nada', weight: 0, next: 's3_3' }
    ]
  },
  s4_0: {
    options: [
      { text: '¿Cómo puede llegar si no debería?', weight: 1, next: 's4_1' },
      { text: '¿Entonces alguien está enviando la señal?', weight: 2, next: 's4_2' },
      { text: '¿Hay algo ahí afuera?', weight: 3, next: 's4_3' }
    ]
  }
};

const branchAfter = {
  s1: 's2_0', s2_1: 's3_0', s2_2: 's3_0', s2_3: 's3_0',
  s3_1: 's4_0', s3_2: 's4_0', s3_3: 's4_0',
  s4_1: 's5', s4_2: 's5', s4_3: 's5'
};

let score = 0;
let choiceMade = false;
const WINDOW_SECONDS = 7;

// --- FUNCIÓN DE PRECARGA DE VIDEOS ---
async function preloadVideos() {
  const keys = Object.keys(assetPaths);
  const total = keys.length;
  let completed = 0;

  for (const key of keys) {
    try {
      const response = await fetch(assetPaths[key]);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const blob = await response.blob();
      loadedFiles[key] = URL.createObjectURL(blob);
    } catch (err) {
      console.warn(`No se pudo precargar en caché ${key}, se usará la ruta directa:`, err);
      // Respaldo en caso de error en el fetch
      loadedFiles[key] = assetPaths[key];
    }

    completed++;
    const percent = Math.round((completed / total) * 100);
    loadBar.style.width = `${percent}%`;
    loadingText.textContent = `CARGANDO RECURSOS... ${percent}%`;
  }

  // Finalizar carga y mostrar botón
  loadingBox.style.display = 'none';
  initBtn.style.display = 'block';
}

function playScene(id) {
  sceneLabel.textContent = 'ESCENA: ' + id;
  setPauseAllowed(true);
  overlay.style.display = 'none';
  overlay.classList.remove('fade-out');
  overlay.innerHTML = '';
  choiceMade = false;
  video.ontimeupdate = null;
  video.onended = null;
  
  video.src = loadedFiles[id] || assetPaths[id];
  video.load();

  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.catch(err => {
      console.error("Error al reproducir el video (" + id + "):", err);
    });
  }

  if (decisions[id]) {
    let shown = false;
    video.ontimeupdate = () => {
      if (!shown && video.duration && (video.duration - video.currentTime) <= WINDOW_SECONDS) {
        shown = true;
        showChoices(id);
      }
    };
    video.onended = () => { 
      video.pause(); 
    };
  } else {
    video.onended = () => onSceneEnd(id);
  }
}

function onSceneEnd(id) {
  if (branchAfter[id]) {
    playScene(branchAfter[id]);
  } else if (id === 's5') {
    finish();
  }
}

function showChoices(id) {
  overlay.innerHTML = '';

  const btnContainer = document.createElement('div');
  btnContainer.id = 'overlay-buttons';

  const timerContainer = document.createElement('div');
  timerContainer.className = 'timer-bar-container';

  const timerBar = document.createElement('div');
  timerBar.className = 'timer-bar';
  
  const remainingTime = Math.max(0, video.duration - video.currentTime);
  timerBar.style.animationDuration = `${remainingTime}s`;
  timerBar.classList.add('animating');

  timerContainer.appendChild(timerBar);

  decisions[id].options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt.text;
    btn.onclick = () => {
      if (choiceMade) return;
      choiceMade = true;

      timerBar.style.animationPlayState = 'paused';

      const allButtons = btnContainer.querySelectorAll('button');
      allButtons.forEach(b => {
        if (b !== btn) {
          b.remove();
        }
      });
      btn.classList.add('selected');

      setTimeout(() => {
        overlay.classList.add('fade-out');
        
        setTimeout(() => {
          score += opt.weight;
          video.ontimeupdate = null;
          video.onended = null;
          playScene(opt.next);
        }, 500);
      }, 1000);
    };
    btnContainer.appendChild(btn);
  });

  // Si se acaba el tiempo sin elegir, se toma una decisión al azar
  timerBar.addEventListener('animationend', () => {
    if (choiceMade) return;
    const buttons = btnContainer.querySelectorAll('button');
    buttons[Math.floor(Math.random() * buttons.length)].click();
  });

  overlay.appendChild(btnContainer);
  overlay.appendChild(timerContainer);
  overlay.style.display = 'flex';
  setPauseAllowed(false); // durante la decisión no se puede pausar
}

function finish() {
  let finalId;
  if (score <= 3) { finalId = 'f1'; }
  else if (score <= 4) { finalId = 'f2'; }
  else { finalId = 'f3'; }

  sceneLabel.textContent = '';
  overlay.style.display = 'none';
  video.src = loadedFiles[finalId] || assetPaths[finalId];
  video.load();
  video.play().catch(err => console.warn("No se pudo reproducir el final:", err));
  video.onended = closeAndShowEnd;
}

// --- FINAL: se cierra la ventana hacia la barra de tareas y aparece la señal ---
function closeAndShowEnd() {
  const player = document.getElementById('player');
  const task = document.getElementById('task-player');
  player.classList.remove('opening');
  player.classList.add('closing');
  setTimeout(() => {
    gameContainer.style.display = 'none';
    task.classList.remove('on', 'active');
    document.getElementById('end').style.display = 'block';
    startGlitch();
  }, 520);
}

const GLITCH_WORDS = ['AYUDA', 'NO VAYAS', 'VEN', 'NO MIRES', 'NO ESCUCHES'];
const GLITCH_CHARS = '#%&@$¥§¤¿¡ΔΣΨΩ∆∑∂≠≈░▒▓█▌▐■◊※†‡ÆØßЖЯЮЛ漢ア̷̸͓';

function corrupt(word, amount) {
  return [...word].map(c => {
    if (c === ' ') return ' ';
    if (Math.random() < amount) return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
    // letras con diacríticos "zalgo"
    return Math.random() < 0.35 ? c + '̴̷'.charAt(Math.floor(Math.random() * 2)) : c;
  }).join('');
}

// --- PAUSA CON ESTÁTICA ---
const pauseBtn = document.getElementById('pauseBtn');
const staticEl = document.getElementById('static');
const staticCanvas = document.getElementById('static-canvas');
const staticCtx = staticCanvas.getContext('2d');
let paused = false;
let staticRaf = null;

function drawStatic() {
  const img = staticCtx.createImageData(staticCanvas.width, staticCanvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  staticCtx.putImageData(img, 0, 0);
  // ~12 fps: un grano más suave y menos agresivo
  staticRaf = setTimeout(() => requestAnimationFrame(drawStatic), 80);
}

function setPaused(on) {
  paused = on;
  if (on) {
    video.pause();
    staticEl.classList.add('on');
    drawStatic();
  } else {
    staticEl.classList.remove('on');
    clearTimeout(staticRaf);
    video.play().catch(() => {});
  }
  pauseBtn.innerHTML = on ? '<span class="ico-play"></span>' : '<span class="ico-pause"></span>';
  pauseBtn.setAttribute('aria-label', on ? 'Reanudar' : 'Pausar');
}

function setPauseAllowed(allowed) {
  if (!allowed && paused) setPaused(false);
  pauseBtn.disabled = !allowed;
}

pauseBtn.addEventListener('click', () => setPaused(!paused));
staticEl.addEventListener('click', () => setPaused(false));

// --- SONIDO DE CLIC RETRO (sintetizado, sin archivos) ---
let audioCtx = null;

// Variantes: 'main' = clic grueso de ratón viejo (opciones y botones principales)
//            'ui'   = tic más agudo, ligero y corto (pausa, volumen, advertencia)
const CLICK_VARIANTS = {
  main: { taps: [[0, 1, 3200], [0.045, 0.55, 2200]], tapLen: 0.025, thump: [180, 60, 0.18], gain: 0.9 },
  ui:   { taps: [[0, 0.8, 5200], [0.028, 0.35, 4200]], tapLen: 0.012, thump: [420, 220, 0.07], gain: 0.6 }
};

function playClick(variant = 'main') {
  const cfg = CLICK_VARIANTS[variant] || CLICK_VARIANTS.main;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const vol = video.muted ? 0 : video.volume;
    if (vol === 0) return;
    const now = audioCtx.currentTime;
    const out = audioCtx.createGain();
    out.gain.value = cfg.gain * vol;
    out.connect(audioCtx.destination);

    // Dos "tacs" de ruido filtrado: presionar y soltar la tecla/ratón viejo
    cfg.taps.forEach(([t, amp, freq]) => {
      const len = Math.floor(audioCtx.sampleRate * cfg.tapLen);
      const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const bp = audioCtx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.2;
      const g = audioCtx.createGain(); g.gain.value = amp;
      src.connect(bp).connect(g).connect(out);
      src.start(now + t);
    });

    // Golpe grave del plástico
    const osc = audioCtx.createOscillator();
    const og = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(cfg.thump[0], now);
    osc.frequency.exponentialRampToValueAtTime(cfg.thump[1], now + 0.03);
    og.gain.setValueAtTime(cfg.thump[2], now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(og).connect(out);
    osc.start(now); osc.stop(now + 0.05);
  } catch (e) { /* sin audio: no pasa nada */ }
}

// Cualquier botón suena; los de interfaz usan la variante 'ui'
const UI_SELECTOR = '#pauseBtn, #muteBtn, #warnContinue, #warnSkip';
document.addEventListener('click', e => {
  const b = e.target.closest('button, .btn');
  if (!b || b.disabled) return;
  playClick(b.matches(UI_SELECTOR) ? 'ui' : 'main');
});
document.addEventListener('change', e => {
  if (e.target.id === 'volume') playClick('ui');
});
document.addEventListener('submit', () => playClick('ui'));

// --- VOLUMEN ---
const volInput = document.getElementById('volume');
const volLabel = document.getElementById('volLabel');
const muteBtn = document.getElementById('muteBtn');
const volBox = volInput.closest('.vol');
let lastVolume = 80;

function applyVolume(v) {
  v = Math.max(0, Math.min(100, Math.round(v)));
  volInput.value = v;
  volLabel.textContent = v;
  volInput.style.setProperty('--fill', v + '%');
  video.volume = v / 100;
  video.muted = v === 0;
  volBox.classList.toggle('muted', v === 0);
  volBox.classList.toggle('low', v > 0 && v < 50);
  muteBtn.setAttribute('aria-label', v === 0 ? 'Activar sonido' : 'Silenciar');
  if (v > 0) lastVolume = v;
  try { localStorage.setItem('atlas-volume', v); } catch (e) {}
}

volInput.addEventListener('input', () => applyVolume(+volInput.value));
muteBtn.addEventListener('click', () => applyVolume(+volInput.value === 0 ? lastVolume : 0));

try {
  const saved = localStorage.getItem('atlas-volume');
  applyVolume(saved !== null ? +saved : 80);
} catch (e) { applyVolume(80); }

// Botón Atlas: siempre en una pestaña nueva
document.getElementById('atlasBtn').addEventListener('click', () => {
  window.open('https://pascual890.github.io/PaginaTaller6/', '_blank', 'noopener');
});

function startGlitch() {
  const el = document.getElementById('glitch');
  let i = 0, frame = 0;
  const set = txt => { el.textContent = txt; el.dataset.text = txt; };
  setInterval(() => {
    frame++;
    const word = GLITCH_WORDS[i];
    // los primeros y últimos frames de cada palabra son ruido puro (transición)
    const phase = frame % 22;
    const amount = phase < 4 || phase > 18 ? 0.85 : 0.12;
    set(corrupt(word, amount));
    if (phase === 21) i = (i + 1) % GLITCH_WORDS.length;
  }, 90);
}

// Eventos
const warn = document.getElementById('warn');

initBtn.addEventListener('click', () => {
  startScreen.style.display = 'none';
  warn.classList.add('on');
});

document.getElementById('warnSkip').addEventListener('click', () => {
  warn.classList.remove('on');
  document.getElementById('end').style.display = 'block';
  startGlitch();
});

document.getElementById('warnContinue').addEventListener('click', () => {
  warn.classList.remove('on');
  gameContainer.style.display = 'block';

  // Animación: la ventana se abre desde su botón en la barra de tareas
  const task = document.getElementById('task-player');
  task.classList.add('on', 'active');
  const player = document.getElementById('player');
  const t = task.getBoundingClientRect();
  const p = player.getBoundingClientRect();
  player.style.setProperty('--from-x', `${(t.left + t.width / 2) - (p.left + p.width / 2)}px`);
  player.style.setProperty('--from-y', `${(t.top + t.height / 2) - (p.top + p.height / 2)}px`);
  player.classList.remove('opening');
  void player.offsetWidth;
  player.classList.add('opening');

  score = 0;
  playScene('s1');
});

// Iniciar precarga al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  const clock = document.getElementById('clock');
  const tick = () => { clock.textContent = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); };
  tick(); setInterval(tick, 10000);

  preloadVideos();
});