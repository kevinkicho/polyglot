import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { textService } from '../services/textService';

export class GravityApp {
    constructor() {
        this.container = null;
        this.isActive = false;
        this.score = 0;
        this.lives = 3;
        this.spawnRate = 2000;
        this.fallSpeed = 1;
        this.lastSpawnTime = 0;
        this.asteroids = []; 
        this.activeTargets = []; // Now holds 3 targets: [{item, meaning, slotIdx}, ...]
        this.animationFrameId = null;
        this.categories = [];
        this.currentCategory = 'All';
        this.WIN_SCORE = 500;
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        this.updateCategories();
        this.showStartScreen();
    }

    refresh() {
        this.stopGame();
        this.showStartScreen();
    }

    updateCategories() {
        const all = vocabService.getAll();
        const cats = new Set(all.map(i => i.category || 'Uncategorized'));
        this.categories = ['All', ...cats];
    }

    setCategory(cat) {
        this.currentCategory = cat;
        this.refresh();
    }

    getFilteredList() {
        const all = vocabService.getAll();
        if (this.currentCategory === 'All') return all;
        return all.filter(i => (i.category || 'Uncategorized') === this.currentCategory);
    }

    showStartScreen() {
        if (!this.container) return;
        this.renderLayout();
        const gameArea = this.container.querySelector('#grav-game-area');
        gameArea.innerHTML = `
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10 backdrop-blur-sm rounded-xl">
                <div class="text-6xl mb-4">☄️</div>
                <h2 class="text-3xl font-black text-white mb-2">GRAVITY</h2>
                <p class="text-gray-200 mb-6 text-center max-w-xs">Match falling words to <br><strong>ANY of the 3 meanings</strong> below!</p>
                <div class="flex gap-4 mb-6 text-sm font-bold text-gray-300">
                    <span>Target: ${this.WIN_SCORE} pts</span>
                    <span>Lives: 3</span>
                </div>
                <button id="grav-start-btn" class="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xl shadow-lg transform hover:scale-105 transition-all">START GAME</button>
            </div>
        `;
        this.container.querySelector('#grav-start-btn').addEventListener('click', () => this.startGame());
    }

    startGame() {
        const gameArea = this.container.querySelector('#grav-game-area');
        if (gameArea) gameArea.innerHTML = '';

        this.isActive = true;
        this.score = 0;
        this.lives = 3;
        this.spawnRate = 2200; // Slightly slower start since managing 3 targets
        this.fallSpeed = 0.6; 
        this.asteroids = [];
        this.activeTargets = [];
        this.lastSpawnTime = performance.now();
        
        this.updateStats();
        
        // Fill all 3 slots
        this.fillTargetSlot(0);
        this.fillTargetSlot(1);
        this.fillTargetSlot(2);
        
        this.gameLoop();
    }

    stopGame() {
        this.isActive = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.asteroids.forEach(a => a.el.remove());
        this.asteroids = [];
    }

    gameWin() {
        this.stopGame();
        const gameArea = this.container.querySelector('#grav-game-area');
        gameArea.insertAdjacentHTML('beforeend', `
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-green-900/80 z-20 backdrop-blur-md rounded-xl animate-fade-in">
                <div class="text-6xl mb-4">🏆</div>
                <h2 class="text-4xl font-black text-white mb-2">YOU WIN!</h2>
                <p class="text-xl text-green-200 mb-6">Score: ${this.score}</p>
                <button id="grav-restart-btn" class="bg-white text-green-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors">PLAY AGAIN</button>
            </div>
        `);
        this.container.querySelector('#grav-restart-btn').addEventListener('click', () => this.startGame());
        audioService.speak("Congratulations", "en"); 
    }

    gameOver() {
        this.stopGame();
        const gameArea = this.container.querySelector('#grav-game-area');
        gameArea.insertAdjacentHTML('beforeend', `
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 z-20 backdrop-blur-md rounded-xl animate-fade-in">
                <h2 class="text-4xl font-black text-white mb-2">GAME OVER</h2>
                <p class="text-xl text-red-200 mb-6">Score: ${this.score}</p>
                <button id="grav-restart-btn" class="bg-white text-red-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors">TRY AGAIN</button>
            </div>
        `);
        this.container.querySelector('#grav-restart-btn').addEventListener('click', () => this.startGame());
    }

    fillTargetSlot(slotIdx) {
        const list = this.getFilteredList();
        if (list.length === 0) return;
        
        // Ensure we don't pick a duplicate of what's already on screen
        let newItem;
        let attempts = 0;
        do {
            newItem = list[Math.floor(Math.random() * list.length)];
            attempts++;
        } while (this.activeTargets.some(t => t.item.id === newItem.id) && attempts < 10);

        const meaning = newItem.back.main || newItem.back.definition;
        
        // Update data
        const existingIdx = this.activeTargets.findIndex(t => t.slotIdx === slotIdx);
        if (existingIdx !== -1) {
            this.activeTargets[existingIdx] = { item: newItem, meaning, slotIdx };
        } else {
            this.activeTargets.push({ item: newItem, meaning, slotIdx });
        }

        // Update UI
        this.updateTargetDisplay(slotIdx);
    }

    spawnAsteroid() {
        const list = this.getFilteredList();
        if (list.length === 0) return;

        let item;
        // 50% chance to spawn a word matching ONE of the 3 active targets
        // 50% chance to spawn a distractor
        if (Math.random() < 0.5 && this.activeTargets.length > 0) {
            const target = this.activeTargets[Math.floor(Math.random() * this.activeTargets.length)];
            // Don't spawn if this specific word is already falling
            if (this.asteroids.some(a => a.item.id === target.item.id)) {
                item = list[Math.floor(Math.random() * list.length)];
            } else {
                item = target.item;
            }
        } else {
            item = list[Math.floor(Math.random() * list.length)];
        }

        const gameArea = this.container.querySelector('#grav-game-area');
        const width = gameArea.clientWidth;
        const x = Math.random() * (width - 100) + 10; 
        
        const el = document.createElement('button');
        el.className = 'absolute top-0 flex flex-col items-center justify-center w-24 h-24 bg-gray-800 rounded-full border-4 border-gray-600 shadow-xl z-0 hover:border-indigo-400 active:scale-95 transition-transform cursor-pointer';
        el.style.left = `${x}px`;
        el.innerHTML = `
            <span class="text-2xl select-none">🪨</span>
            <span class="text-xs font-bold text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center px-1 pointer-events-none drop-shadow-md leading-tight">${textService.smartWrap(item.front.main)}</span>
        `;
        
        const handler = (e) => { e.stopPropagation(); this.handleAsteroidClick(item.id, el); };
        el.addEventListener('mousedown', handler);
        el.addEventListener('touchstart', handler);

        gameArea.appendChild(el);

        this.asteroids.push({
            id: Date.now() + Math.random(),
            item: item,
            x: x,
            y: -80,
            el: el
        });
    }

    handleAsteroidClick(id, el) {
        if (!this.isActive) return;

        // Check against ALL active targets
        const matchedTarget = this.activeTargets.find(t => t.item.id === id);

        if (matchedTarget) {
            // Correct!
            this.score += 10;
            scoreService.addScore('gravity', 10);
            
            // Visual feedback
            el.classList.add('scale-150', 'opacity-0', 'bg-green-500', 'border-green-300');
            
            // Flash the corresponding target box
            const targetBox = document.getElementById(`grav-target-box-${matchedTarget.slotIdx}`);
            if(targetBox) {
                targetBox.classList.add('bg-green-100', 'dark:bg-green-900');
                setTimeout(()=>targetBox.classList.remove('bg-green-100', 'dark:bg-green-900'), 300);
            }

            setTimeout(() => {
                el.remove();
                this.asteroids = this.asteroids.filter(a => a.el !== el);
            }, 200);

            if (settingsService.get().clickAudio) {
                audioService.speak(matchedTarget.item.front.main, settingsService.get().targetLang);
            }

            if (this.score >= this.WIN_SCORE) {
                this.gameWin();
                return;
            }

            // Increase Difficulty
            if (this.score % 50 === 0) {
                this.fallSpeed += 0.1;
                this.spawnRate = Math.max(800, this.spawnRate - 100);
            }

            this.updateStats();
            
            // Replace ONLY the matched target
            this.fillTargetSlot(matchedTarget.slotIdx);

        } else {
            // Wrong!
            el.classList.add('bg-red-500', 'border-red-400', 'shake');
            this.lives--;
            this.updateStats();
            if (this.lives <= 0) this.gameOver();
            else {
                setTimeout(() => {
                    el.remove();
                    this.asteroids = this.asteroids.filter(a => a.el !== el);
                }, 200);
            }
        }
    }

    gameLoop(timestamp) {
        if (!this.isActive) return;

        if (timestamp - this.lastSpawnTime > this.spawnRate) {
            this.spawnAsteroid();
            this.lastSpawnTime = timestamp;
        }

        const gameArea = this.container.querySelector('#grav-game-area');
        const floorY = gameArea.clientHeight;

        this.asteroids.forEach((ast, index) => {
            ast.y += this.fallSpeed;
            ast.el.style.transform = `translateY(${ast.y}px)`;

            if (ast.y > floorY - 80) {
                // Check if the falling word matches ANY active target
                const missedTarget = this.activeTargets.find(t => t.item.id === ast.item.id);

                if (missedTarget) {
                    this.lives--;
                    this.updateStats();
                    if (this.lives <= 0) this.gameOver();
                    
                    // Visual Red Flash
                    gameArea.classList.add('bg-red-100', 'dark:bg-red-900/30');
                    setTimeout(() => gameArea.classList.remove('bg-red-100', 'dark:bg-red-900/30'), 200);
                    
                    // Replace the target we missed
                    this.fillTargetSlot(missedTarget.slotIdx);
                }
                
                ast.el.remove();
                this.asteroids.splice(index, 1);
            }
        });

        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    updateStats() {
        const scoreEl = this.container.querySelector('#grav-score');
        const livesEl = this.container.querySelector('#grav-lives');
        if(scoreEl) scoreEl.textContent = this.score;
        if(livesEl) livesEl.innerHTML = '❤️'.repeat(this.lives);
    }

    updateTargetDisplay(slotIdx) {
        const target = this.activeTargets.find(t => t.slotIdx === slotIdx);
        const el = document.getElementById(`grav-target-text-${slotIdx}`);
        if (el && target) {
            el.textContent = target.meaning;
            textService.fitText(el, 14, 20); // Smaller font for 3-up view
        }
    }

    renderLayout() {
        const pillsHtml = `
            <div class="w-full overflow-x-auto whitespace-nowrap px-4 pb-2 mb-2 flex gap-2 no-scrollbar z-20 relative">
                ${this.categories.map(cat => `
                    <button class="category-pill px-4 py-1 rounded-full text-sm font-bold border ${this.currentCategory === cat ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white dark:bg-dark-card text-gray-500 border-gray-200 dark:border-gray-700'}" data-cat="${cat}">
                        ${cat}
                    </button>
                `).join('')}
            </div>
        `;

        // 3-Column Footer Layout
        const footerHtml = `
            <div class="h-40 w-full bg-white dark:bg-dark-card border-t-4 border-indigo-500 z-30 p-2 flex gap-2 shadow-2xl relative">
                <div class="absolute -top-6 left-0 right-0 flex justify-center"><span class="bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-md">Active Targets</span></div>
                
                ${[0, 1, 2].map(i => `
                    <div id="grav-target-box-${i}" class="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center p-2 text-center transition-colors duration-300">
                        <h3 id="grav-target-text-${i}" class="text-sm font-black text-gray-800 dark:text-white leading-tight break-words">...</h3>
                    </div>
                `).join('')}
            </div>
        `;

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-4">
                    <span id="grav-lives" class="text-xl">❤️❤️❤️</span>
                    <span class="text-2xl font-black text-indigo-600 dark:text-white flex items-center gap-1">
                        <span class="text-sm text-gray-400 font-bold uppercase mr-1">Score</span>
                        <span id="grav-score">0</span>
                    </span>
                </div>
                <button id="grav-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div class="w-full h-full pt-16 pb-0 flex flex-col relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-900">
                ${pillsHtml}
                <div id="grav-game-area" class="flex-1 relative w-full overflow-hidden"></div>
                ${footerHtml}
            </div>
        `;

        this.container.querySelector('#grav-close-btn').addEventListener('click', () => {
            this.stopGame();
            window.dispatchEvent(new CustomEvent('router:home'));
        });

        this.container.querySelectorAll('.category-pill').forEach(btn => {
            btn.addEventListener('click', (e) => this.setCategory(e.currentTarget.dataset.cat));
        });
    }
}

export const gravityApp = new GravityApp();
