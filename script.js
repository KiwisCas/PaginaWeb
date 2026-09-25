const ids = [
  "s1", "s2_0", "s2_1", "s2_2", "s2_3",
  "s3_0", "s3_1", "s3_2", "s3_3",
  "s4_0", "s4_1", "s4_2", "s4_3",
  "s5", "f1", "f2", "f3"
];

// --- RUTAS DE TUS VIDEOS (.mov) EN LA CARPETA ASSETS ---
const defaultFiles = {
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

const files = { ...defaultFiles };

// Persistencia local para reemplazos manuales
let dbPromise = new Promise((resolve, reject) => {
  try {
    const req = indexedDB.open('interactivo_db', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('videos');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  } catch (err) { reject(err); }
});

async function saveVideo(id, blob) {
  try {
    const db = await dbPromise;
    const tx = db.transaction('videos', 'readwrite');
    tx.objectStore('videos').put(blob, id);
  } catch (err) { console.error('No se pudo guardar', id, err); }
}

async function loadSavedVideos() {
  try {
    const db = await dbPromise;
    const tx = db.transaction('videos', 'readonly');
    const store = tx.objectStore('videos');
    let count = 0;
    await Promise.all(ids.map(id => new Promise(res => {
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          files[id] = URL.createObjectURL(req.result);
          const inp = document.querySelector(`input[data-id="${id}"]`);
          if (inp) inp.style.background = 'rgba(76,175,80,.15)';
          count++;
        }
        res();
      };
      req.onerror = () => res();
    })));
    return count;
  } catch (err) { console.error(err); return 0; }
}

document.getElementById('clearBtn').addEventListener('click', async () => {
  try {
    const db = await dbPromise;
    db.transaction('videos', 'readwrite').objectStore('videos').clear();
    location.reload();
  } catch (err) { alert('No se pudo borrar: ' + err); }
});

document.querySelectorAll('input[type=file]').forEach(inp => {
  inp.addEventListener('change', e => {
    const id = inp.dataset.id;
    const f = e.target.files[0];
    if (f) {
      files[id] = URL.createObjectURL(f);
      inp.style.background = 'rgba(76,175,80,.15)';
      saveVideo(id, f);
    }
    checkReady();
  });
});

function checkReady() {
  const missing = ids.filter(id => !files[id]);
  const startBtn = document.getElementById('startBtn');
  startBtn.disabled = missing.length > 0;
  startBtn.textContent = missing.length ? `Faltan ${missing.length} video(s)` : 'Iniciar reproducción';
}

(async () => {
  const n = await loadSavedVideos();
  const status = document.getElementById('status');
  if (n > 0) {
    status.textContent = `${n} video(s) personalizados recuperados de este navegador.`;
  } else {
    status.textContent = 'Videos cargados por defecto desde el repositorio.';
  }
  checkReady();
})();

const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const sceneLabel = document.getElementById('sceneLabel');

// Estructura de decisiones y flujo
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

document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('setup').style.display = 'none';
  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('clearBtn').style.display = 'none';
  document.getElementById('status').style.display = 'none';
  document.getElementById('player').style.display = 'block';
  score = 0;
  playScene('s1');
});

const WINDOW_SECONDS = 7;

function playScene(id) {
  sceneLabel.textContent = 'Escena: ' + id;
  overlay.style.display = 'none';
  overlay.classList.remove('fade-out');
  overlay.innerHTML = '';
  choiceMade = false;
  video.ontimeupdate = null;
  video.onended = null;
  video.src = files[id];
  video.play();

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

  // Contenedor de botones
  const btnContainer = document.createElement('div');
  btnContainer.id = 'overlay-buttons';

  // Contenedor y barra de progreso de tiempo
  const timerContainer = document.createElement('div');
  timerContainer.className = 'timer-bar-container';

  const timerBar = document.createElement('div');
  timerBar.className = 'timer-bar';
  
  // Calcular tiempo restante para sincronizar la animación de la barra
  const remainingTime = Math.max(0, video.duration - video.currentTime);
  timerBar.style.animationDuration = `${remainingTime}s`;
  timerBar.classList.add('animating');

  timerContainer.appendChild(timerBar);

  decisions[id].options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt.text;
    btn.onclick = () => {
      if (choiceMade) return; // Evita dobles clics
      choiceMade = true;

      // 1. Pausar la animación de la barra de tiempo
      timerBar.style.animationPlayState = 'paused';

      // 2. Destacar la opción seleccionada y eliminar las demás
      const allButtons = btnContainer.querySelectorAll('button');
      allButtons.forEach(b => {
        if (b !== btn) {
          b.remove(); // Desaparecen las demás opciones
        }
      });
      btn.classList.add('selected');

      // 3. Transición: esperar 1 segundo y desvanecer el overlay
      setTimeout(() => {
        overlay.classList.add('fade-out');
        
        // Al terminar el desvanecimiento (0.5s), continuar con la siguiente escena
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
  video.src = files[finalId];
  video.play();
  video.onended = () => {
    document.getElementById('player').style.display = 'none';
    document.getElementById('end').style.display = 'block';
  };
}