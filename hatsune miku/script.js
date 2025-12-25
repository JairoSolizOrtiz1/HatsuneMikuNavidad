// ========== CONFIGURACIÓN DEL JUEGO ==========
const CONFIG = {
    gameDuration: 30000, // 30 segundos exactos (duración del mini juego)
    audioDuration: 60000, // 60 segundos (duración completa del audio)
    noteSpeed: 2000, // Tiempo que tarda una nota en llegar al centro (ms)
    perfectWindow: 150, // Ventana de tiempo para "Perfect" (ms)
    goodWindow: 300, // Ventana de tiempo para "Good" (ms)
    noteSpawnRadius: 300, // Radio desde el centro donde aparecen las notas
    totalNotes: 0, // Se calculará según el beatmap
    // Beatmap: tiempos en ms desde el inicio donde aparecen las notas (solo primeros 30 segundos)
    // Estos tiempos deben sincronizarse con el audio
    beatmap: [
        // Primeros 30 segundos - ajusta estos tiempos según el beat real de la canción
        500, 1200, 2000, 2800, 3600, 4500, 5400, 6300, 7200, 8100,
        9200, 10100, 11000, 11900, 12800, 13700, 14600, 15500, 16400, 17300,
        18200, 19100, 20000, 20900, 21800, 22700, 23600, 24500, 25400, 26300,
        27200, 28100, 29000
    ]
};

// ========== ESTADO DEL JUEGO ==========
let gameState = {
    score: 0,
    notesHit: 0,
    notesMissed: 0,
    combo: 0,
    maxCombo: 0,
    accuracy: 100,
    notes: [],
    activeNotes: [],
    gameStarted: false,
    gameCompleted: false,
    gameOver: false,
    startTime: 0,
    audio: null,
    gameTime: 0
};

// ========== ELEMENTOS DEL DOM ==========
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const victoryScreen = document.getElementById('victory-screen');
const startBtn = document.getElementById('start-btn');
const retryBtn = document.getElementById('retry-btn');
const restartBtn = document.getElementById('restart-btn');
const accuracyDisplay = document.getElementById('accuracy');
const comboDisplay = document.getElementById('combo');
const timeDisplay = document.getElementById('time-display');
const timeFill = document.getElementById('time-fill');
const notesField = document.getElementById('notes-field');
const feedback = document.getElementById('feedback');
const gameAudio = document.getElementById('game-audio');
const gameMiku = document.getElementById('game-miku');
const hitCircle = document.getElementById('hit-circle');

// Mensajes finales
const specialMessage = document.getElementById('special-message');
const loveMessage = document.getElementById('love-message');
const personalMessage = document.getElementById('personal-message');

// ========== INICIALIZACIÓN ==========
CONFIG.totalNotes = CONFIG.beatmap.length;

startBtn.addEventListener('click', startGame);
retryBtn.addEventListener('click', () => {
    resetGame();
    startGame();
});
restartBtn.addEventListener('click', () => {
    resetGame();
    startScreen.classList.add('active');
    gameScreen.classList.remove('active');
    gameoverScreen.classList.remove('active');
    victoryScreen.classList.remove('active');
});

// Prevenir scroll en móvil
document.addEventListener('touchmove', (e) => {
    if (e.target.closest('.game-area')) {
        e.preventDefault();
    }
}, { passive: false });

// ========== FUNCIONES PRINCIPALES ==========
function startGame() {
    startScreen.classList.remove('active');
    gameScreen.classList.add('active');
    gameState.gameStarted = true;
    gameState.gameCompleted = false;
    gameState.gameOver = false;
    gameState.startTime = Date.now();
    
    // Resetear estado
    gameState.notesHit = 0;
    gameState.notesMissed = 0;
    gameState.combo = 0;
    gameState.maxCombo = 0;
    gameState.accuracy = 100;
    gameState.activeNotes = [];
    
    // Limpiar notas existentes
    notesField.innerHTML = '';
    
    // Actualizar UI
    updateAccuracy();
    updateCombo();
    updateTime();
    
    // Cambiar animación de Miku
    gameMiku.classList.remove('celebrating');
    gameMiku.classList.add('idle');
    
    // Iniciar audio (reproducirá el minuto completo)
    gameAudio.currentTime = 0;
    gameAudio.play().catch(err => {
        console.log('Error al reproducir audio:', err);
        // Continuar sin audio si hay problemas
    });
    
    // El audio continuará hasta completar el minuto (60 segundos)
    // El juego termina a los 30 segundos, pero la música sigue
    
    // Iniciar spawn de notas
    spawnNotes();
    
    // Iniciar loop del juego
    gameLoop();
}

function resetGame() {
    gameState = {
        score: 0,
        notesHit: 0,
        notesMissed: 0,
        combo: 0,
        maxCombo: 0,
        accuracy: 100,
        notes: [],
        activeNotes: [],
        gameStarted: false,
        gameCompleted: false,
        gameOver: false,
        startTime: 0,
        audio: gameAudio,
        gameTime: 0
    };
    
    // Detener audio
    gameAudio.pause();
    gameAudio.currentTime = 0;
    
    // Limpiar notas
    notesField.innerHTML = '';
    feedback.textContent = '';
    
    // Resetear UI
    updateAccuracy();
    updateCombo();
    updateTime();
    timeFill.style.width = '0%';
}

function spawnNotes() {
    CONFIG.beatmap.forEach((spawnTime, index) => {
        setTimeout(() => {
            if (gameState.gameStarted && !gameState.gameOver && !gameState.gameCompleted) {
                createNote(spawnTime, index);
            }
        }, spawnTime);
    });
}

function createNote(spawnTime, id) {
    // Ángulo aleatorio para la posición inicial
    const angle = Math.random() * Math.PI * 2;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Posición inicial (en el borde del círculo)
    const startX = centerX + Math.cos(angle) * CONFIG.noteSpawnRadius;
    const startY = centerY + Math.sin(angle) * CONFIG.noteSpawnRadius;
    
    // Crear elemento de nota
    const note = document.createElement('div');
    note.className = 'note';
    note.dataset.noteId = id;
    note.style.left = `${startX - 30}px`;
    note.style.top = `${startY - 30}px`;
    
    // Crear imagen de pinky
    const pinkyImg = document.createElement('img');
    pinkyImg.src = 'pinky.png';
    pinkyImg.alt = 'Pinky';
    pinkyImg.className = 'note-image';
    note.appendChild(pinkyImg);
    
    // Agregar al campo
    notesField.appendChild(note);
    
    // Calcular posición final (centro del hit circle)
    const finalX = centerX - 30;
    const finalY = centerY - 30;
    
    // Animar hacia el centro
    const noteData = {
        element: note,
        id: id,
        startX: startX - 30,
        startY: startY - 30,
        finalX: finalX,
        finalY: finalY,
        spawnTime: Date.now(),
        hit: false,
        missed: false
    };
    
    gameState.activeNotes.push(noteData);
    
    // Animar la nota hacia el centro
    animateNoteToCenter(note, startX - 30, startY - 30, finalX, finalY);
    
    // Si la nota no se toca a tiempo, se marca como miss
    setTimeout(() => {
        if (note.parentNode && !noteData.hit && !noteData.missed) {
            handleMiss(noteData);
        }
    }, CONFIG.noteSpeed + CONFIG.goodWindow);
}

function animateNoteToCenter(note, startX, startY, finalX, finalY) {
    const startTime = Date.now();
    const duration = CONFIG.noteSpeed;
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing suave
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentX = startX + (finalX - startX) * easeProgress;
        const currentY = startY + (finalY - startY) * easeProgress;
        
        note.style.left = `${currentX}px`;
        note.style.top = `${currentY}px`;
        
        // Escalar la nota mientras se acerca
        const scale = 0.7 + (progress * 0.3);
        note.style.transform = `scale(${scale})`;
        
        if (progress < 1 && note.parentNode) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// Evento de toque en las notas
notesField.addEventListener('touchstart', handleNoteTouch, { passive: false });
notesField.addEventListener('click', handleNoteTouch);

function handleNoteTouch(e) {
    if (!gameState.gameStarted || gameState.gameOver || gameState.gameCompleted) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches ? e.touches[0] : e;
    const touchX = touch.clientX || touch.pageX;
    const touchY = touch.clientY || touch.pageY;
    
    // Buscar la nota más cercana al toque
    let closestNote = null;
    let closestDistance = Infinity;
    const hitRadius = 50; // Radio de detección
    
    gameState.activeNotes.forEach(noteData => {
        if (noteData.hit || noteData.missed) return;
        
        const rect = noteData.element.getBoundingClientRect();
        const noteCenterX = rect.left + rect.width / 2;
        const noteCenterY = rect.top + rect.height / 2;
        
        const distance = Math.sqrt(
            Math.pow(touchX - noteCenterX, 2) + 
            Math.pow(touchY - noteCenterY, 2)
        );
        
        // Verificar si está cerca del centro del hit circle
        const hitCircleRect = hitCircle.getBoundingClientRect();
        const hitCircleCenterX = hitCircleRect.left + hitCircleRect.width / 2;
        const hitCircleCenterY = hitCircleRect.top + hitCircleRect.height / 2;
        
        const distanceToCenter = Math.sqrt(
            Math.pow(noteCenterX - hitCircleCenterX, 2) + 
            Math.pow(noteCenterY - hitCircleCenterY, 2)
        );
        
        // La nota debe estar cerca del toque Y cerca del centro
        if (distance < hitRadius && distanceToCenter < 80) {
            if (distance < closestDistance) {
                closestDistance = distance;
                closestNote = noteData;
            }
        }
    });
    
    if (closestNote) {
        const noteRect = closestNote.element.getBoundingClientRect();
        const hitCircleRect = hitCircle.getBoundingClientRect();
        const noteCenterX = noteRect.left + noteRect.width / 2;
        const noteCenterY = noteRect.top + noteRect.height / 2;
        const hitCircleCenterX = hitCircleRect.left + hitCircleRect.width / 2;
        const hitCircleCenterY = hitCircleRect.top + hitCircleRect.height / 2;
        
        const distanceToCenter = Math.sqrt(
            Math.pow(noteCenterX - hitCircleCenterX, 2) + 
            Math.pow(noteCenterY - hitCircleCenterY, 2)
        );
        
        let rating = 'miss';
        
        if (distanceToCenter <= 30) {
            rating = 'perfect';
            gameState.notesHit++;
            gameState.combo++;
            if (gameState.combo > gameState.maxCombo) {
                gameState.maxCombo = gameState.combo;
            }
        } else if (distanceToCenter <= 60) {
            rating = 'good';
            gameState.notesHit++;
            gameState.combo++;
            if (gameState.combo > gameState.maxCombo) {
                gameState.maxCombo = gameState.combo;
            }
        } else {
            // Muy lejos del centro, cuenta como miss
            handleMiss(closestNote);
            return;
        }
        
        if (rating !== 'miss') {
            closestNote.hit = true;
            closestNote.element.classList.add(rating);
            showFeedback(rating);
            
            // Remover nota
            setTimeout(() => {
                if (closestNote.element.parentNode) {
                    closestNote.element.remove();
                }
                const index = gameState.activeNotes.indexOf(closestNote);
                if (index !== -1) {
                    gameState.activeNotes.splice(index, 1);
                }
            }, 300);
            
            updateAccuracy();
            updateCombo();
        }
    }
}

function handleMiss(noteData) {
    if (noteData.missed || noteData.hit) return;
    
    noteData.missed = true;
    gameState.notesMissed++;
    gameState.combo = 0;
    gameState.gameOver = true;
    
    showFeedback('miss');
    noteData.element.classList.add('miss');
    
    // Reiniciar después de mostrar el feedback
    setTimeout(() => {
        gameScreen.classList.remove('active');
        gameoverScreen.classList.add('active');
        gameAudio.pause();
    }, 1000);
    
    updateAccuracy();
    updateCombo();
}

function showFeedback(rating) {
    feedback.textContent = rating.toUpperCase();
    feedback.className = `feedback ${rating}`;
    
    setTimeout(() => {
        feedback.textContent = '';
        feedback.className = 'feedback';
    }, 500);
}

function updateAccuracy() {
    const total = gameState.notesHit + gameState.notesMissed;
    if (total > 0) {
        gameState.accuracy = (gameState.notesHit / total) * 100;
    } else {
        gameState.accuracy = 100;
    }
    accuracyDisplay.textContent = `${gameState.accuracy.toFixed(1)}%`;
}

function updateCombo() {
    comboDisplay.textContent = gameState.combo;
}

function updateTime() {
    const elapsed = gameState.gameTime;
    const seconds = Math.floor(elapsed / 1000);
    const displaySeconds = seconds.toString().padStart(2, '0');
    timeDisplay.textContent = `0:${displaySeconds}`;
    
    const progress = (elapsed / CONFIG.gameDuration) * 100;
    timeFill.style.width = `${Math.min(progress, 100)}%`;
}

function gameLoop() {
    if (!gameState.gameStarted || gameState.gameOver) return;
    
    gameState.gameTime = Date.now() - gameState.startTime;
    
    // Verificar si se completó el tiempo
    if (gameState.gameTime >= CONFIG.gameDuration) {
        // Verificar si todas las notas fueron acertadas
        const allNotesProcessed = gameState.notesHit + gameState.notesMissed >= CONFIG.totalNotes;
        const perfectAccuracy = gameState.notesMissed === 0 && gameState.notesHit === CONFIG.totalNotes;
        
        if (allNotesProcessed && perfectAccuracy) {
            gameState.gameCompleted = true;
            gameState.gameStarted = false;
            // NO pausar el audio - dejar que continúe hasta completar el minuto
            
            setTimeout(() => {
                showVictoryScreen();
            }, 500);
            return;
        } else if (gameState.gameTime >= CONFIG.gameDuration + 2000) {
            // Si pasó el tiempo y no se completó perfecto, game over
            if (!gameState.gameOver) {
                handleMiss({ missed: false, hit: false });
            }
            return;
        }
    }
    
    updateTime();
    requestAnimationFrame(gameLoop);
}

function showVictoryScreen() {
    gameScreen.classList.remove('active');
    victoryScreen.classList.add('active');
    
    // Cambiar animación de Miku
    const victoryMiku = document.getElementById('victory-miku');
    if (victoryMiku) {
        victoryMiku.classList.remove('idle');
        victoryMiku.classList.add('celebrating');
    }
    
    // Mostrar mensajes con animación letra por letra
    typeMessage(specialMessage, "Has completado el juego al 100%", 50, () => {
        setTimeout(() => {
            typeMessage(loveMessage, "Feliz Navidad mi cielo ❤️", 80, () => {
                setTimeout(() => {
                    typeMessage(personalMessage, "Espero que te guste el minijuego que te arme jiji, te amo", 60, null);
                }, 500);
            });
        }, 500);
    });
}

function typeMessage(element, text, speed, callback) {
    element.textContent = '';
    element.classList.add('typing');
    
    let index = 0;
    const typeInterval = setInterval(() => {
        if (index < text.length) {
            element.textContent += text[index];
            index++;
        } else {
            clearInterval(typeInterval);
            element.classList.remove('typing');
            if (callback) callback();
        }
    }, speed);
}

// Generar copos de nieve en el fondo del juego
function createSnowflakes() {
    const snowContainer = document.querySelector('.snow-container');
    if (!snowContainer) return;
    
    for (let i = 0; i < 20; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake-bg';
        snowflake.textContent = '❄';
        snowflake.style.left = `${Math.random() * 100}%`;
        snowflake.style.animationDuration = `${10 + Math.random() * 10}s`;
        snowflake.style.animationDelay = `${Math.random() * 5}s`;
        snowflake.style.fontSize = `${0.8 + Math.random() * 0.4}rem`;
        snowContainer.appendChild(snowflake);
    }
}

// Inicializar copos de nieve
createSnowflakes();
