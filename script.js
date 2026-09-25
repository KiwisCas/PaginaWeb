// --- RUTAS DE LOS VIDEOS EN LA CARPETA ASSETS ---
const assetPaths = {
  s1:   "assets/Escena 1.mov",
  s2_0: "assets/Escena 2.0.mov",
  s2_1: "assets/Escena 2.1.mov",
  s2_2: "assets/Escena 2.2.mov",
  s2_3: "assets/Escena 2.3.mov",
  s3_0: "assets/Escena 3.0.mov",
  s3_1: "assets/Escena 3.1.mov",
  s3_2: "assets/Escena 3.2.mov",
  s3_3: "assets/Escena 3.3.mov",
  s4_0: "assets/Escena 4.0.mov",
  s4_1: "assets/Escena 4.1.mov",
  s4_2: "assets/Escena 4.2.mov",
  s4_3: "assets/Escena 4.3.mov",
  s5:   "assets/Escena 5.mov",
  f1:   "assets/Final 1.mov",
  f2:   "assets/Final 2.mov",
  f3:   "assets/Final 3.mov"
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

  overlay.appendChild(btnContainer);
  overlay.appendChild(timerContainer);
  overlay.style.display = 'flex';
}

function finish() {
  let finalId;
  if (score <= 3) { finalId = 'f1'; }
  else if (score <= 6) { finalId = 'f2'; }
  else { finalId = 'f3'; }

  sceneLabel.textContent = '';
  overlay.style.display = 'none';
  video.src = loadedFiles[finalId] || assetPaths[finalId];
  video.load();
  video.play();
  video.onended = () => {
    gameContainer.style.display = 'none';
    document.getElementById('end').style.display = 'block';
  };
}

// Eventos
initBtn.addEventListener('click', () => {
  startScreen.style.display = 'none';
  gameContainer.style.display = 'block';
  score = 0;
  playScene('s1');
});

// Iniciar precarga al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  preloadVideos();
});