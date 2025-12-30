class ComboManager {
    constructor() {
        this.streak = 0;
        this.container = null;
        this.rankEl = null;
        this.textEl = null;
        this.fuseContainer = null;
        this.fuseBar = null;
        
        // Timer Logic
        this.timer = null; 
        this.TIMER_DURATION = 5000;
        
        // Pause Logic
        this.remaining = 5000;
        this.startTick = 0;
        this.isPaused = false;
        
        this.ranks = [
            { threshold: 1, char: 'D', text: 'Dismal', class: 'rank-d' },
            { threshold: 2, char: 'C', text: 'Crazy', class: 'rank-c' },
            { threshold: 3, char: 'B', text: 'Badass', class: 'rank-b' },
            { threshold: 4, char: 'A', text: 'Apocalyptic', class: 'rank-a' },
            { threshold: 5, char: 'S', text: 'Savage!', class: 'rank-s' },
            { threshold: 6, char: 'SS', text: 'Sick Skills!!', class: 'rank-ss' },
            { threshold: 7, char: 'SSS', text: 'Smokin\' Sexy Style!!', class: 'rank-sss' }
        ];

        window.addEventListener('audio:start', () => this.pauseTimer());
        window.addEventListener('audio:end', () => this.resumeTimer());
    }

    init() {
        if (!document.getElementById('combo-container')) {
            this.container = document.createElement('div');
            this.container.id = 'combo-container';
            this.container.innerHTML = `
                <div id="combo-rank" class="combo-rank"></div>
                <div id="combo-text" class="combo-text"></div>
                <div id="combo-fuse" class="combo-fuse-container">
                    <div id="combo-fuse-bar" class="combo-fuse-bar">
                        <div class="combo-fuse-spark"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(this.container);
        }

        if (!document.getElementById('combo-effects-layer')) {
            const layer = document.createElement('div');
            layer.id = 'combo-effects-layer';
            // Fixed layer for global effects
            layer.className = 'fixed inset-0 pointer-events-none z-[9998] overflow-hidden';
            document.body.appendChild(layer);
        }

        this.bindElements();
    }

    bindElements() {
        this.rankEl = document.getElementById('combo-rank');
        this.textEl = document.getElementById('combo-text');
        this.fuseContainer = document.getElementById('combo-fuse');
        this.fuseBar = document.getElementById('combo-fuse-bar');
    }

    reset() {
        if (!this.rankEl) this.init();
        this.clearTimer();
        
        if (this.streak > 3 && this.rankEl) {
            this.rankEl.style.transition = 'all 0.5s';
            this.rankEl.style.transform = 'translateY(50px) rotate(20deg)';
            this.rankEl.style.opacity = '0';
            if(this.textEl) this.textEl.style.opacity = '0';
        } else if (this.rankEl) {
            this.rankEl.textContent = '';
            if(this.textEl) this.textEl.textContent = '';
        }
        
        if (this.fuseContainer) this.fuseContainer.classList.remove('active');
        this.streak = 0;
    }

    increment() {
        this.init();
        this.streak++;
        this.updateVisuals();
        this.startNewTimer();
    }

    dropRank() {
        if (this.streak > 0) {
            this.streak--;
            if(this.rankEl) {
                // Subtle shake on the text ONLY, not the screen
                this.rankEl.classList.add('shake-text');
                setTimeout(() => this.rankEl.classList.remove('shake-text'), 200);
            }
            if (this.streak === 0) {
                this.reset();
            } else {
                this.updateVisuals();
                this.startNewTimer();
            }
        } else {
            this.reset();
        }
    }

    updateVisuals() {
        if (!this.rankEl) return;
        
        this.rankEl.style.transition = '';
        this.rankEl.style.transform = '';
        this.rankEl.style.opacity = '1';

        const rank = this.getRank(this.streak);
        
        this.rankEl.className = 'combo-rank'; 
        void this.rankEl.offsetWidth; 
        this.rankEl.textContent = rank.char;
        this.rankEl.classList.add(rank.class, 'animate-slam');
        
        this.textEl.className = 'combo-text';
        this.textEl.textContent = rank.text;
        this.textEl.classList.add('animate-slide');

        if (this.fuseContainer) this.fuseContainer.classList.add('active');

        this.triggerRankEffects(rank.char);
    }

    triggerRankEffects(char) {
        const layer = document.getElementById('combo-effects-layer');
        if (!layer) return;

        // Rank A+: Subtle Flash (Opacity only, no scaling)
        if (char === 'A' || char === 'S' || char === 'SS' || char === 'SSS') {
             const flash = document.createElement('div');
             flash.className = 'combo-flash'; // Defined in SCSS
             layer.appendChild(flash);
             setTimeout(() => flash.remove(), 400);
        }

        // Rank S+: Paint Splatter
        if (['S', 'SS', 'SSS'].includes(char)) {
            for(let i=0; i<4; i++) {
                const splat = document.createElement('div');
                splat.className = 'paint-splat';
                splat.style.left = Math.random() * 90 + '%';
                splat.style.top = Math.random() * 90 + '%';
                splat.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
                layer.appendChild(splat);
                setTimeout(() => splat.remove(), 800);
            }
        }

        // Rank SS+: Dancers
        if (['SS', 'SSS'].includes(char)) {
            const dancer = document.createElement('div');
            dancer.textContent = Math.random() > 0.5 ? '💃' : '🕺';
            dancer.className = 'combo-dancer';
            dancer.style.left = '-50px';
            dancer.style.top = Math.random() * 80 + 10 + '%';
            layer.appendChild(dancer);
            setTimeout(() => dancer.remove(), 2500);
        }

        // Rank SSS: Gold Rain (No Shake!)
        if (char === 'SSS') {
             for(let i=0; i<20; i++) {
                 const gold = document.createElement('div');
                 gold.textContent = '🪙'; // Gold Coin Emoji or use CSS shape
                 gold.className = 'gold-particle';
                 gold.style.left = Math.random() * 100 + '%';
                 gold.style.animationDuration = (Math.random() * 1 + 1) + 's'; // 1-2s fall time
                 layer.appendChild(gold);
                 setTimeout(() => gold.remove(), 2000);
             }
        }
    }

    // --- TIMER LOGIC (Unchanged) ---
    startNewTimer() {
        this.clearTimer();
        this.remaining = this.TIMER_DURATION;
        this.runTimer();
    }

    runTimer() {
        if (this.isPaused) return;

        this.startTick = Date.now();
        
        if (this.fuseBar) {
            this.fuseBar.style.transition = 'none';
            this.fuseBar.style.width = (this.remaining / this.TIMER_DURATION * 100) + '%';
            void this.fuseBar.offsetWidth; 
            this.fuseBar.style.transition = `width ${this.remaining}ms linear`;
            this.fuseBar.style.width = '0%';
            
            if(this.remaining < 2000) this.fuseBar.classList.add('critical');
            else this.fuseBar.classList.remove('critical');
        }

        this.timer = setTimeout(() => {
            this.dropRank();
        }, this.remaining);
    }

    pauseTimer() {
        if (this.isPaused || !this.timer) return;
        this.isPaused = true;
        clearTimeout(this.timer);
        this.remaining -= (Date.now() - this.startTick);
        
        if (this.fuseBar) {
            const computedWidth = window.getComputedStyle(this.fuseBar).width;
            this.fuseBar.style.transition = 'none';
            this.fuseBar.style.width = computedWidth;
        }
    }

    resumeTimer() {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.runTimer();
    }

    clearTimer() {
        if (this.timer) clearTimeout(this.timer);
        this.isPaused = false;
        if(this.fuseBar) {
            this.fuseBar.style.transition = 'none';
            this.fuseBar.style.width = '100%';
        }
    }

    getRank(s) {
        for (let i = this.ranks.length - 1; i >= 0; i--) {
            if (s >= this.ranks[i].threshold) return this.ranks[i];
        }
        return this.ranks[0];
    }
}

export const comboManager = new ComboManager();
