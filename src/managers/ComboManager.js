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
            this.makeDraggable(this.container);
        }

        if (!document.getElementById('combo-effects-layer')) {
            const layer = document.createElement('div');
            layer.id = 'combo-effects-layer';
            layer.className = 'fixed inset-0 pointer-events-none z-[9998] overflow-hidden';
            document.body.appendChild(layer);
        }

        this.bindElements();
    }

    makeDraggable(el) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const startDrag = (e) => {
            isDragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            startX = clientX;
            startY = clientY;
            
            const rect = el.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.left = `${initialLeft}px`;
            el.style.top = `${initialTop}px`;
            el.style.cursor = 'grabbing';
        };

        const onDrag = (e) => {
            if (!isDragging) return;
            e.preventDefault(); 
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const dx = clientX - startX;
            const dy = clientY - startY;
            el.style.left = `${initialLeft + dx}px`;
            el.style.top = `${initialTop + dy}px`;
        };

        const stopDrag = () => { isDragging = false; el.style.cursor = 'grab'; };

        el.addEventListener('mousedown', startDrag);
        el.addEventListener('touchstart', startDrag, { passive: false });
        window.addEventListener('mousemove', onDrag);
        window.addEventListener('touchmove', onDrag, { passive: false });
        window.addEventListener('mouseup', stopDrag);
        window.addEventListener('touchend', stopDrag);
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

    // FIX: Updated Downgrade Logic
    dropRank() {
        // 1. Find Current Rank Index
        let currentRankIdx = -1;
        for (let i = this.ranks.length - 1; i >= 0; i--) {
            if (this.streak >= this.ranks[i].threshold) {
                currentRankIdx = i;
                break;
            }
        }

        // 2. Drop to the threshold of the rank BELOW
        if (currentRankIdx > 0) {
            const prevRank = this.ranks[currentRankIdx - 1];
            this.streak = prevRank.threshold; // Snap score to lower rank

            if(this.rankEl) {
                this.rankEl.classList.add('shake-text');
                setTimeout(() => this.rankEl.classList.remove('shake-text'), 200);
            }
            this.updateVisuals();
            this.startNewTimer();
        } else {
            // If at lowest rank (D) or 0, full reset
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

        if (['A', 'S', 'SS', 'SSS'].includes(char)) {
             const flash = document.createElement('div');
             flash.className = 'combo-flash'; 
             layer.appendChild(flash);
             setTimeout(() => flash.remove(), 400);
        }

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

        if (['SS', 'SSS'].includes(char)) {
            const dancer = document.createElement('div');
            dancer.textContent = Math.random() > 0.5 ? '💃' : '🕺';
            dancer.className = 'combo-dancer';
            dancer.style.left = '-50px';
            dancer.style.top = Math.random() * 80 + 10 + '%';
            layer.appendChild(dancer);
            setTimeout(() => dancer.remove(), 2500);
        }

        if (char === 'SSS') {
             const emojis = ['🌞','🐷','🐸','🐧','🦊','🦋','🦄','🍻','🍥','🌈','🌍','🌎','🌏','🪐','💫','☄️','☃️','🦝','🐯','🎎','💸','💵','💴','💶','💷','💰','🧧'];
             
             // FIX: Pick ONE random emoji for this entire burst
             const selectedEmoji = emojis[Math.floor(Math.random() * emojis.length)];

             for(let i=0; i<25; i++) {
                 const part = document.createElement('div');
                 part.textContent = selectedEmoji; // Use the same one
                 part.className = 'gold-particle';
                 part.style.left = Math.random() * 100 + '%';
                 part.style.animationDuration = (Math.random() * 1.5 + 1) + 's';
                 layer.appendChild(part);
                 setTimeout(() => part.remove(), 2500);
             }
        }
    }

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
        this.timer = setTimeout(() => this.dropRank(), this.remaining);
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
