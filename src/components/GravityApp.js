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
        this.asteroids = []; // { id, word, x, y, el, item }
        this.currentTarget = null; // { item, meaning }
        this.animationFrameId = null;
        this.categories = [];
        this.currentCategory = 'All';
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
                <p class="text-gray-200 mb-6 text-center max-w-xs">Tap the falling words that match the meaning below. Don't let them hit the ground!</p>
                <button id="grav-start-btn" class="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xl shadow-lg transform hover:scale-105 transition-all">START GAME</button>
            </div>
        `;
        this.container.querySelector('#grav-start-btn').addEventListener('click', () => this.startGame());
    }

    startGame() {
        // --- FIX START: Clear the start screen overlay ---
        const gameArea = this.container.querySelector('#grav-game-area');
        if (gameArea) gameArea.innerHTML = '';
        // --- FIX END ---

        this.isActive = true;
        this.score = 0;
        this.lives = 3;
        this.spawnRate = 2500;
        this.fallSpeed = 0.5; // Base speed
        this.asteroids = [];
        this.lastSpawnTime = performance.now();
        
        this.updateStats();
        this.pickNewTarget();
        this.gameLoop();
    }

    stopGame() {
        this.isActive = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.asteroids.forEach(a => a.el.remove());
        this.asteroids = [];
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

    pickNewTarget() {
        const list = this.getFilteredList();
        if (list.length === 0) return;
        
        // Pick a random target
        const item = list[Math.floor(Math.random() * list.length)];
        const meaning = item.back.main || item.back.definition;
        
        this.currentTarget = { item, meaning };
        this.updateTargetDisplay();
    }

    spawnAsteroid() {
        const list = this.getFilteredList();
        if (list.length === 0) return;

        // 40% chance to spawn the CORRECT answer, 60% random distractor
        let item;
        if (Math.random() < 0.4 && this.currentTarget && !this.asteroids.some(a => a.item.id === this.currentTarget.item.id)) {
            item = this.currentTarget.item;
        } else {
            item = list[Math.floor(Math.random() * list.length)];
        }

        const gameArea = this.container.querySelector('#grav-game-area');
        const width = gameArea.clientWidth;
        
        // Random X position (padding 20px from edges)
        const x = Math.random() * (width - 100) + 10; 
        
        const el = document.createElement('button');
        el.className = 'absolute top-0 flex flex-col items-center justify-center w-24 h-24 bg-gray-800 rounded-full border-4 border-gray-600 shadow-xl z-0 hover:border-indigo-400 active:scale-95 transition-transform cursor-pointer';
        el.style.left = `${x}px`;
        el.innerHTML = `
            <span class="text-2xl select-none">🪨</span>
            <span class="text-xs font-bold text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center px-1 pointer-events-none drop-shadow-md">${textService.smartWrap(item.front.main)}</span>
        `;
        
        // Click handler
        el.addEventListener('mousedown', (e) => { e.stopPropagation(); this.handleAsteroidClick(item.id, el); });
        el.addEventListener('touchstart', (e) => { e.stopPropagation(); this.handleAsteroidClick(item.id, el); });

        gameArea.appendChild(el);

        this.asteroids.push({
            id: Date.now() + Math.random(),
            item: item,
            x: x,
            y: -60,
            el: el
        });
    }

    handleAsteroidClick(id, el) {
        if (!this.isActive) return;

        // Check if correct
        if (this.currentTarget && id === this.currentTarget.item.id) {
            // Correct!
            this.score += 10;
            scoreService.addScore('gravity', 10);
            
            // Explosion Effect
            el.classList.add('scale-150', 'opacity-0', 'bg-green-500', 'border-green-300');
            setTimeout(() => {
                el.remove();
                this.asteroids = this.asteroids.filter(a => a.el !== el);
            }, 200);

            // Play Audio
            if (settingsService.get().clickAudio) {
                audioService.speak(this.currentTarget.item.front.main, settingsService.get().targetLang);
            }

            // Increase difficulty
            if (this.score % 50 === 0) {
                this.fallSpeed += 0.1;
                this.spawnRate = Math.max(800, this.spawnRate - 100);
            }

            this.updateStats();
            this.pickNewTarget(); // Switch target immediately
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

        // Spawning Logic
        if (timestamp - this.lastSpawnTime > this.spawnRate) {
            this.spawnAsteroid();
            this.lastSpawnTime = timestamp;
        }

        const gameArea = this.container.querySelector('#grav-game-area');
        const floorY = gameArea.clientHeight;

        // Move Asteroids
        this.asteroids.forEach((ast, index) => {
            ast.y += this.fallSpeed;
            ast.el.style.transform = `translateY(${ast.y}px)`;

            // Hit Floor Check
            if (ast.y > floorY - 60) {
                // If it was the target word, lose a life
                if (this.currentTarget && ast.item.id === this.currentTarget.item.id) {
                    this.lives--;
                    this.updateStats();
                    if (this.lives <= 0) this.gameOver();
                    
                    // Flash red
                    gameArea.classList.add('bg-red-100', 'dark:bg-red-900/30');
                    setTimeout(() => gameArea.classList.remove('bg-red-100', 'dark:bg-red-900/30'), 200);
                    
                    // Force new target since we missed this one
                    this.pickNewTarget();
                }
                
                // Remove from DOM and Array
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

    updateTargetDisplay() {
        const el = this.container.querySelector('#grav-target-text');
        if (el && this.currentTarget) {
            el.textContent = this.currentTarget.meaning;
            textService.fitText(el, 24, 80);
            
            // Subtle pulse to indicate change
            const box = this.container.querySelector('#grav-target-box');
            box.classList.add('scale-105', 'border-indigo-400');
            setTimeout(() => box.classList.remove('scale-105', 'border-indigo-400'), 200);
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
                
                <div id="grav-game-area" class="flex-1 relative w-full overflow-hidden">
                    </div>

                <div class="h-32 w-full bg-white dark:bg-dark-card border-t-4 border-indigo-500 z-30 p-4 flex flex-col items-center justify-center shadow-2xl relative">
                    <div class="absolute -top-6 bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-md">Target Meaning</div>
                    <div id="grav-target-box" class="w-full max-w-md p-2 text-center transition-all duration-200 border-2 border-transparent rounded-xl">
                        <h1 id="grav-target-text" class="text-3xl font-black text-gray-800 dark:text-white leading-tight">...</h1>
                    </div>
                </div>
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
