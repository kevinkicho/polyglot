import { BaseGameComponent } from './BaseGameComponent';
import { comboManager } from '../managers/ComboManager';
import { settingsService } from '../services/settingsService';

// crossTime = seconds for an asteroid to fall from top to bottom
// spawnRate in ms, maxAsteroids = cap on screen at once
const DIFFICULTY = {
    easy:   { crossTime: 8.0, spawnRate: 3000, speedUp: 0.12, maxAsteroids: 4 },
    medium: { crossTime: 5.0, spawnRate: 2200, speedUp: 0.18, maxAsteroids: 5 },
    hard:   { crossTime: 3.2, spawnRate: 1500, speedUp: 0.25, maxAsteroids: 7 },
};

export class GravityApp extends BaseGameComponent {
    constructor() {
        super();
        this.isActive = false;
        this.score = 0;
        this.lives = 5;
        this.spawnRate = 2000;
        this.crossTime = 5;
        this.lastSpawnTime = 0;
        this.asteroids = [];
        this.activeTargets = [];
        this.animationFrameId = null;
        this.WIN_SCORE = 500;
        this.difficulty = 'medium';
        this.isPaused = false;
    }

    mount(elementId) {
        super.mount(elementId);
        this.renderLayout();
        this.showDifficultyPicker();
    }

    unmount() {
        this.stopGame();
        super.unmount();
    }

    refresh() {
        this.stopGame();
        this.renderLayout();
        this.showDifficultyPicker();
    }

    next() { this.stopGame(); this.renderLayout(); this.showDifficultyPicker(); }
    prev() { this.next(); }
    random() { this.next(); }
    loadGame() {}

    setCategory(cat) {
        this.currentCategory = cat;
        this.stopGame();
        this.renderLayout();
        this.showDifficultyPicker();
    }

    showDifficultyPicker() {
        const gameArea = this.container.querySelector('#grav-game-area');
        if (!gameArea) return;

        gameArea.innerHTML = `
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 backdrop-blur-sm overflow-auto p-4">
                <div class="text-4xl landscape:text-3xl mb-2 landscape:mb-1">☄️</div>
                <h2 class="text-2xl landscape:text-xl font-black text-white mb-1 landscape:mb-0">GRAVITY</h2>
                <p class="text-gray-300 mb-4 landscape:mb-2 text-center text-sm landscape:text-xs px-6">Tap falling words that match<br>any of the meanings shown!</p>
                <div class="flex flex-col landscape:flex-row gap-2 landscape:gap-3 w-full max-w-xs landscape:max-w-md px-6">
                    <button class="grav-diff-btn flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 border-2 border-emerald-500/60 text-emerald-400 hover:text-white px-6 py-2.5 landscape:py-2 rounded-2xl font-black text-lg landscape:text-base transition-all active:scale-95 cursor-pointer" data-diff="easy">Easy</button>
                    <button class="grav-diff-btn flex-1 bg-amber-500/20 hover:bg-amber-500/40 border-2 border-amber-500/60 text-amber-400 hover:text-white px-6 py-2.5 landscape:py-2 rounded-2xl font-black text-lg landscape:text-base transition-all active:scale-95 cursor-pointer" data-diff="medium">Medium</button>
                    <button class="grav-diff-btn flex-1 bg-red-500/20 hover:bg-red-500/40 border-2 border-red-500/60 text-red-400 hover:text-white px-6 py-2.5 landscape:py-2 rounded-2xl font-black text-lg landscape:text-base transition-all active:scale-95 cursor-pointer" data-diff="hard">Hard</button>
                </div>
                <div class="flex gap-4 mt-3 landscape:mt-2 text-xs font-bold text-gray-500">
                    <span>Target: ${this.WIN_SCORE} pts</span>
                    <span>Lives: 5</span>
                </div>
            </div>
        `;

        gameArea.querySelectorAll('.grav-diff-btn').forEach(btn => {
            btn.onclick = () => {
                this.difficulty = btn.dataset.diff;
                this.startGame();
            };
        });
    }

    startGame() {
        const gameArea = this.container.querySelector('#grav-game-area');
        if (!gameArea) return;
        gameArea.innerHTML = '';

        const diff = DIFFICULTY[this.difficulty];
        this.isActive = true;
        this.score = 0;
        this.lives = 5;
        this.spawnRate = diff.spawnRate;
        this.crossTime = diff.crossTime;
        this.asteroids = [];
        this.activeTargets = [];

        this.updateStats();
        this.updatePauseBtn();

        this.fillTargetSlot(0);
        this.fillTargetSlot(1);
        this.fillTargetSlot(2);

        // Event delegation: single handler on game area catches all asteroid clicks
        gameArea.addEventListener('pointerdown', (e) => {
            if (this.isPaused) return;
            const astEl = e.target.closest('.grav-asteroid');
            if (!astEl) return;
            e.preventDefault();
            const id = astEl.dataset.itemId;
            if (id) this.handleAsteroidClick(id, astEl);
        });

        // Target box clicks: play target-language pronunciation as hint
        this.container.querySelectorAll('[id^="grav-target-box-"]').forEach(box => {
            box.style.cursor = 'pointer';
            box.onclick = () => {
                const slotIdx = parseInt(box.id.split('-').pop());
                const target = this.activeTargets.find(t => t.slotIdx === slotIdx);
                if (target) {
                    this.audioService.speak(target.item.front.main, this.settingsService.get().targetLang);
                    box.style.outline = '2px solid #818cf8';
                    box.style.background = 'rgba(99,102,241,0.15)';
                    setTimeout(() => { box.style.outline = ''; box.style.background = ''; }, 400);
                }
            };
        });

        this.spawnAsteroid();

        this.lastSpawnTime = performance.now();
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    pauseGame() {
        if (!this.isActive || this.isPaused) return;
        this.isPaused = true;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        const pauseBtn = this.container.querySelector('#grav-pause-btn');
        if (pauseBtn) pauseBtn.innerHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    }

    resumeGame() {
        if (!this.isActive || !this.isPaused) return;
        this.isPaused = false;
        const pauseBtn = this.container.querySelector('#grav-pause-btn');
        if (pauseBtn) pauseBtn.innerHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

        this.lastSpawnTime = performance.now();
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    togglePause() {
        if (this.isPaused) this.resumeGame();
        else this.pauseGame();
    }

    stopGame() {
        this.isActive = false;
        this.isPaused = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.asteroids.forEach(a => { if (a.el.parentNode) a.el.remove(); });
        this.asteroids = [];
        if (settingsService.get().comboEffects !== false) comboManager.reset();
    }

    gameWin() {
        this.stopGame();
        const gameArea = this.container.querySelector('#grav-game-area');
        if (!gameArea) return;
        gameArea.insertAdjacentHTML('beforeend', `
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-green-900/80 z-20 backdrop-blur-md rounded-xl animate-fade-in">
                <div class="text-6xl mb-4">🏆</div>
                <h2 class="text-4xl font-black text-white mb-2">YOU WIN!</h2>
                <p class="text-xl text-green-200 mb-2">Score: ${this.score}</p>
                <p class="text-sm text-green-300 mb-6">${this.difficulty[0].toUpperCase() + this.difficulty.slice(1)} Mode</p>
                <button id="grav-restart-btn" class="bg-white text-green-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors cursor-pointer">PLAY AGAIN</button>
            </div>
        `);
        const btn = gameArea.querySelector('#grav-restart-btn');
        if (btn) btn.onclick = () => this.showDifficultyPicker();
        this.audioService.speak("Congratulations", "en");
    }

    gameOver() {
        this.stopGame();
        const gameArea = this.container.querySelector('#grav-game-area');
        if (!gameArea) return;
        gameArea.insertAdjacentHTML('beforeend', `
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 z-20 backdrop-blur-md rounded-xl animate-fade-in">
                <h2 class="text-4xl font-black text-white mb-2">GAME OVER</h2>
                <p class="text-xl text-red-200 mb-2">Score: ${this.score}</p>
                <p class="text-sm text-red-300 mb-6">${this.difficulty[0].toUpperCase() + this.difficulty.slice(1)} Mode</p>
                <button id="grav-restart-btn" class="bg-white text-red-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors cursor-pointer">TRY AGAIN</button>
            </div>
        `);
        const btn = gameArea.querySelector('#grav-restart-btn');
        if (btn) btn.onclick = () => this.showDifficultyPicker();
    }

    fillTargetSlot(slotIdx) {
        const list = this.getFilteredList();
        if (list.length === 0) return;

        let newItem;
        let attempts = 0;
        do {
            newItem = list[Math.floor(Math.random() * list.length)];
            attempts++;
        } while (this.activeTargets.some(t => t.item.id === newItem.id) && attempts < 10);

        const meaning = newItem.back.main || newItem.back.definition;

        const existingIdx = this.activeTargets.findIndex(t => t.slotIdx === slotIdx);
        if (existingIdx !== -1) {
            this.activeTargets[existingIdx] = { item: newItem, meaning, slotIdx };
        } else {
            this.activeTargets.push({ item: newItem, meaning, slotIdx });
        }

        this.updateTargetDisplay(slotIdx);
    }

    spawnAsteroid() {
        const list = this.getFilteredList();
        if (list.length === 0) return;

        const gameArea = this.container.querySelector('#grav-game-area');
        if (!gameArea) return;

        let item;
        if (Math.random() < 0.5 && this.activeTargets.length > 0) {
            const target = this.activeTargets[Math.floor(Math.random() * this.activeTargets.length)];
            if (this.asteroids.some(a => a.item.id === target.item.id)) {
                item = list[Math.floor(Math.random() * list.length)];
            } else {
                item = target.item;
            }
        } else {
            item = list[Math.floor(Math.random() * list.length)];
        }

        // Skip spawn if already at max
        const diff = DIFFICULTY[this.difficulty];
        if (this.asteroids.length >= diff.maxAsteroids) return;

        const width = gameArea.clientWidth;
        const astW = window.innerWidth >= 768 ? 180 : 120;
        const astH = window.innerWidth >= 768 ? 72 : 56;

        // Find x that doesn't overlap asteroids near the top (y < astH * 2)
        const nearTop = this.asteroids.filter(a => a.y < astH * 2);
        let x, attempts = 0;
        do {
            x = Math.random() * Math.max(1, width - astW - 20) + 10;
            attempts++;
        } while (attempts < 10 && nearTop.some(a => Math.abs(a.x - x) < astW * 0.8));

        const el = document.createElement('div');
        el.className = 'grav-asteroid';
        el.dataset.itemId = item.id;
        el.style.cssText = `position:absolute; left:${x}px; top:${-astH}px; width:${astW}px; height:${astH}px; background:linear-gradient(135deg, #1e293b 0%, #312e81 100%); border-radius:16px; border:2px solid rgba(129,140,248,0.5); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:2; box-shadow:0 4px 15px rgba(99,102,241,0.2); user-select:none; touch-action:manipulation;`;
        el.innerHTML = `<span class="grav-ast-text font-black text-white text-center leading-none drop-shadow-md" style="pointer-events:none; width:calc(100% - 8px); height:calc(100% - 8px); display:flex; align-items:center; justify-content:center;">${this.textService.smartWrap(item.front.main)}</span>`;

        gameArea.appendChild(el);

        // Fit text to fill the asteroid box
        const textEl = el.querySelector('.grav-ast-text');
        if (textEl) this.textService.fitText(textEl, 10, astH - 8);

        this.asteroids.push({ item, x, y: -astH, el });
    }

    handleAsteroidClick(id, el) {
        if (!this.isActive) return;
        if (el.dataset.clicked) return;
        el.dataset.clicked = '1';

        // dataset values are strings; item.id may be number — use loose equality
        const matchedTarget = this.activeTargets.find(t => t.item.id == id);

        if (matchedTarget) {
            this.score += 10;
            this.scoreService.addScore('gravity', 10);

            el.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
            el.style.border = '2px solid #86efac';
            el.style.transform = 'scale(1.15)';
            el.style.opacity = '0';
            el.style.transition = 'all 0.2s ease-out';
            el.style.pointerEvents = 'none';

            const targetBox = document.getElementById(`grav-target-box-${matchedTarget.slotIdx}`);
            if (targetBox) {
                targetBox.style.outline = '2px solid #4ade80';
                targetBox.style.background = 'rgba(34,197,94,0.15)';
                setTimeout(() => { targetBox.style.outline = ''; targetBox.style.background = ''; }, 400);
            }

            setTimeout(() => {
                if (el.parentNode) el.remove();
                this.asteroids = this.asteroids.filter(a => a.el !== el);
            }, 200);

            if (this.settingsService.get().clickAudio) {
                this.audioService.speak(matchedTarget.item.front.main, this.settingsService.get().targetLang);
            }

            if (this.score >= this.WIN_SCORE) {
                this.gameWin();
                return;
            }

            const diff = DIFFICULTY[this.difficulty];
            if (this.score % 50 === 0) {
                // Reduce cross time (= faster fall) but cap at minimum 1.5s
                this.crossTime = Math.max(1.5, this.crossTime - diff.speedUp);
                this.spawnRate = Math.max(800, this.spawnRate - 100);
            }

            this.updateStats();
            this.fillTargetSlot(matchedTarget.slotIdx);
        } else {
            el.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            el.style.border = '2px solid #f87171';
            el.style.pointerEvents = 'none';
            this.lives--;
            this.updateStats();

            if (settingsService.get().comboEffects !== false) comboManager.dropRank();

            if (this.lives <= 0) {
                this.gameOver();
            } else {
                setTimeout(() => {
                    if (el.parentNode) el.remove();
                    this.asteroids = this.asteroids.filter(a => a.el !== el);
                }, 300);
            }
        }
    }

    shootTurretLaser(targetX, targetY) {
        const gameArea = this.container.querySelector('#grav-game-area');
        if (!gameArea) return;
        const startX = gameArea.clientWidth / 2;
        const startY = gameArea.clientHeight;

        const deltaX = targetX - startX;
        const deltaY = targetY - startY;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        const laser = document.createElement('div');
        laser.style.cssText = `position:absolute; height:4px; width:${length}px; left:${startX}px; top:${startY}px; transform:rotate(${angle}deg); transform-origin:left; background:#22d3ee; box-shadow:0 0 10px cyan; opacity:0.8; z-index:5; pointer-events:none;`;

        gameArea.appendChild(laser);
        setTimeout(() => {
            laser.style.opacity = '0';
            laser.style.transition = 'opacity 0.2s';
            setTimeout(() => { if (laser.parentNode) laser.remove(); }, 200);
        }, 100);
    }

    gameLoop(timestamp) {
        if (!this.isActive || !this.container) return;

        const gameArea = this.container.querySelector('#grav-game-area');
        if (!gameArea) return;
        const floorY = gameArea.clientHeight;

        // Compute fall speed relative to viewport: px/frame = height / (crossTime * ~60fps)
        const fallSpeed = floorY / (this.crossTime * 60);

        const diff = DIFFICULTY[this.difficulty];
        if (timestamp - this.lastSpawnTime > this.spawnRate && this.asteroids.length < diff.maxAsteroids) {
            this.spawnAsteroid();
            this.lastSpawnTime = timestamp;
        }

        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const ast = this.asteroids[i];
            ast.y += fallSpeed;
            ast.el.style.top = ast.y + 'px';

            const astH = ast.el.offsetHeight || 56;
            if (ast.y > floorY - astH) {
                const missedTarget = this.activeTargets.find(t => t.item.id === ast.item.id);

                if (missedTarget) {
                    this.lives--;
                    this.updateStats();
                    if (settingsService.get().comboEffects !== false) comboManager.dropRank();

                    if (this.lives <= 0) {
                        if (ast.el.parentNode) ast.el.remove();
                        this.asteroids.splice(i, 1);
                        this.gameOver();
                        return;
                    }

                    gameArea.style.background = 'rgba(127,29,29,0.3)';
                    setTimeout(() => { if (gameArea) gameArea.style.background = ''; }, 200);
                    this.fillTargetSlot(missedTarget.slotIdx);
                } else {
                    const elRect = ast.el.getBoundingClientRect();
                    const areaRect = gameArea.getBoundingClientRect();
                    this.shootTurretLaser(
                        elRect.left - areaRect.left + elRect.width / 2,
                        elRect.top - areaRect.top + elRect.height / 2
                    );
                    const boom = document.createElement('div');
                    boom.style.cssText = `position:absolute; width:60px; height:60px; left:${ast.x}px; top:${ast.y}px; background:#22d3ee; border-radius:50%; opacity:0.4; pointer-events:none; z-index:3;`;
                    boom.classList.add('animate-ping');
                    gameArea.appendChild(boom);
                    setTimeout(() => { if (boom.parentNode) boom.remove(); }, 300);
                }

                if (ast.el.parentNode) ast.el.remove();
                this.asteroids.splice(i, 1);
            }
        }

        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    updatePauseBtn() {
        const existing = this.container.querySelector('#grav-pause-btn');
        if (existing) return;
        const gameArea = this.container.querySelector('#grav-game-area');
        if (!gameArea) return;
        const btn = document.createElement('button');
        btn.id = 'grav-pause-btn';
        btn.style.cssText = 'position:absolute; bottom:16px; right:16px; z-index:20; width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; background:rgba(99,102,241,0.3); border:2px solid rgba(129,140,248,0.5); color:white; backdrop-filter:blur(4px); transition:all 0.2s;';
        btn.innerHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
        btn.onclick = () => this.togglePause();
        gameArea.appendChild(btn);
    }

    updateStats() {
        const scoreEl = this.container.querySelector('#grav-score');
        const livesEl = this.container.querySelector('#grav-lives');
        const progressEl = this.container.querySelector('#grav-progress');
        if (scoreEl) scoreEl.textContent = this.score;
        if (livesEl) livesEl.innerHTML = '❤️'.repeat(this.lives);
        if (progressEl) progressEl.style.width = `${Math.min(100, (this.score / this.WIN_SCORE) * 100)}%`;
    }

    updateTargetDisplay(slotIdx) {
        const target = this.activeTargets.find(t => t.slotIdx === slotIdx);
        const el = document.getElementById(`grav-target-text-${slotIdx}`);
        if (el && target) {
            el.innerHTML = this.textService.smartWrap(target.meaning);
            this.textService.fitText(el, 10, 60);
            // fitText overrides display — restore vertical centering
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
        }
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-14 landscape:h-11 z-40 px-4 landscape:px-3 flex justify-between items-center bg-slate-900/95 backdrop-blur-sm border-b border-indigo-500/30">
                <div class="flex items-center gap-3">
                    <span id="grav-lives" class="text-lg leading-none">${'❤️'.repeat(5)}</span>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-indigo-300 font-bold uppercase">Score</span>
                        <span id="grav-score" class="text-xl font-black text-white">0</span>
                        <span class="text-xs text-indigo-400">/ ${this.WIN_SCORE}</span>
                    </div>
                    <div class="w-20 md:w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div id="grav-progress" class="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300" style="width:0%"></div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="flex gap-1 overflow-x-auto no-scrollbar max-w-[40vw] md:max-w-none">
                        ${this.categories.map(cat => `
                            <button class="category-pill px-3 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap ${this.currentCategory === cat ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-slate-700 text-indigo-300 border-slate-600 hover:border-indigo-400'}" data-cat="${cat}">${cat}</button>
                        `).join('')}
                    </div>
                    <button id="grav-close-btn" class="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-full transition-colors shrink-0 cursor-pointer"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-14 landscape:pt-11 pb-0 flex flex-col landscape:flex-row overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950">
                <div id="grav-game-area" style="position:relative; flex:1; overflow:hidden;"></div>
                <div class="w-full landscape:w-56 md:landscape:w-72 landscape:h-full bg-slate-800/90 border-t-2 landscape:border-t-0 landscape:border-l-2 border-indigo-500/50 flex landscape:flex-col shrink-0 min-h-0" style="z-index:30;">
                    <div class="px-3 py-1.5 landscape:py-1 bg-indigo-600/20 border-b border-indigo-500/30 flex items-center justify-center gap-2 shrink-0">
                        <span class="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Match These</span>
                        <span class="text-indigo-400 text-xs">🔊</span>
                    </div>
                    <div class="flex landscape:flex-col flex-1 p-1.5 landscape:p-2 gap-1.5 landscape:gap-2 min-h-0">
                        ${[0, 1, 2].map(i => `
                            <div id="grav-target-box-${i}" class="flex-1 bg-slate-700/60 rounded-xl border border-indigo-500/30 flex items-center justify-center p-1.5 landscape:p-2 text-center transition-all duration-300 overflow-hidden min-h-0">
                                <h3 id="grav-target-text-${i}" class="font-black text-white leading-tight w-full h-full flex items-center justify-center overflow-hidden">...</h3>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        this.container.querySelector('#grav-close-btn').onclick = () => {
            this.stopGame();
            this.closeGame();
        };

        this.container.querySelectorAll('.category-pill').forEach(btn => {
            btn.onclick = () => this.setCategory(btn.dataset.cat);
        });
    }
}

export const gravityApp = new GravityApp();
