class ComboManager {
    constructor() {
        this.streak = 0;
        this.container = null;
        this.rankEl = null;
        this.textEl = null;
        this.fuseContainer = null;
        this.fuseBar = null;
        
        this.timer = null; 
        this.TIMER_DURATION = 5000;
        this.remaining = 5000;
        this.startTick = 0;
        this.isPaused = false;
        
        // 20 DIVERSE LEVELS
        this.ranks = [
            { threshold: 1, char: 'D', text: 'Dull' },
            { threshold: 2, char: 'D+', text: 'Decent' },
            { threshold: 3, char: 'C', text: 'Common' },
            { threshold: 4, char: 'C+', text: 'Clever' },
            { threshold: 5, char: 'B', text: 'Basic' },
            { threshold: 6, char: 'B+', text: 'Bold' },
            { threshold: 7, char: 'A', text: 'Active' },
            { threshold: 8, char: 'A+', text: 'Advanced' },
            { threshold: 9, char: 'A++', text: 'Amazing' },
            { threshold: 10, char: 'S', text: 'Superb!' },
            { threshold: 12, char: 'S+', text: 'Special!!' },
            { threshold: 15, char: 'SS', text: 'Sensational!!!' },
            { threshold: 18, char: 'SS+', text: 'Supreme!!!!' },
            { threshold: 22, char: 'SSS', text: 'Smokin\' Sexy Style!!' },
            { threshold: 26, char: 'H', text: 'Heroic' },
            { threshold: 30, char: 'L', text: 'Legendary' },
            { threshold: 35, char: 'M', text: 'Mythic' },
            { threshold: 40, char: 'I', text: 'Immortal' },
            { threshold: 50, char: 'G', text: 'GODLIKE' },
            { threshold: 60, char: '👑', text: 'THE POLYGLOT' }
        ];

        window.addEventListener('audio:start', () => this.pauseTimer());
        window.addEventListener('audio:end', () => this.resumeTimer());
        window.addEventListener('resize', () => this.ensureInBounds());
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
        setTimeout(() => this.ensureInBounds(), 100);
    }

    // --- RIGHT-ANCHORED DRAG LOGIC ---
    makeDraggable(el) {
        let isDragging = false;
        let startX, startY, initialRight, initialTop;

        const startDrag = (e) => {
            // Only drag if clicking text or rank
            if(!e.target.closest('.combo-rank') && !e.target.closest('.combo-text')) return;

            isDragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            startX = clientX;
            startY = clientY;
            
            const rect = el.getBoundingClientRect();
            // Important: We track distance from RIGHT edge
            initialRight = window.innerWidth - rect.right;
            initialTop = rect.top;
            
            // Lock positioning to right/top
            el.style.left = 'auto';
            el.style.bottom = 'auto';
            el.style.right = `${initialRight}px`;
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
            
            // Drag Right (+dx) = Smaller Right Margin
            // Drag Left (-dx) = Larger Right Margin
            let newRight = initialRight - dx; 
            let newTop = initialTop + dy;

            // Strict Bounds
            const maxRight = window.innerWidth - el.offsetWidth;
            const maxTop = window.innerHeight - el.offsetHeight;

            newRight = Math.min(Math.max(0, newRight), maxRight);
            newTop = Math.min(Math.max(0, newTop), maxTop);
            
            el.style.right = `${newRight}px`;
            el.style.top = `${newTop}px`;
        };

        const stopDrag = () => { isDragging = false; el.style.cursor = 'grab'; };

        el.addEventListener('mousedown', startDrag);
        el.addEventListener('touchstart', startDrag, { passive: false });
        window.addEventListener('mousemove', onDrag);
        window.addEventListener('touchmove', onDrag, { passive: false });
        window.addEventListener('mouseup', stopDrag);
        window.addEventListener('touchend', stopDrag);
    }

    ensureInBounds() {
        if (!this.container) return;
        
        const rect = this.container.getBoundingClientRect();
        
        // Calculate current CSS values
        let currentRight = window.innerWidth - rect.right;
        let currentTop = rect.top;
        let corrected = false;

        // Off-screen to right
        if (currentRight < 0) { currentRight = 0; corrected = true; }
        
        // Off-screen to left (Right margin too big)
        const maxRight = window.innerWidth - rect.width;
        if (currentRight > maxRight) { currentRight = maxRight; corrected = true; }

        const maxTop = window.innerHeight - rect.height;
        if (currentTop < 0) { currentTop = 0; corrected = true; }
        if (currentTop > maxTop) { currentTop = maxTop; corrected = true; }

        if (corrected) {
            this.container.style.left = 'auto';
            this.container.style.right = `${currentRight}px`;
            this.container.style.top = `${currentTop}px`;
        }
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
        this.ensureInBounds();
    }

    increment() {
        this.init();
        this.streak++;
        this.updateVisuals();
        this.startNewTimer();
    }

    dropRank() {
        let currentRankIdx = -1;
        for (let i = this.ranks.length - 1; i >= 0; i--) {
            if (this.streak >= this.ranks[i].threshold) {
                currentRankIdx = i;
                break;
            }
        }

        if (currentRankIdx > 0) {
            const prevRank = this.ranks[currentRankIdx - 1];
            this.streak = prevRank.threshold;
            if(this.rankEl) {
                this.rankEl.classList.add('shake-text');
                setTimeout(() => this.rankEl.classList.remove('shake-text'), 200);
            }
            this.updateVisuals();
            this.startNewTimer();
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
        
        // Add color class
        this.rankEl.className = 'combo-rank ' + this.getRankClass(rank); 
        
        void this.rankEl.offsetWidth; 
        this.rankEl.textContent = rank.char;
        this.rankEl.classList.add('animate-slam');
        
        this.textEl.className = 'combo-text';
        this.textEl.textContent = rank.text;
        this.textEl.classList.add('animate-slide');

        if (this.fuseContainer) this.fuseContainer.classList.add('active');

        this.triggerRankEffects(rank.char);
        this.ensureInBounds();
    }

    getRankClass(rank) {
        // Reuse classes for new ranks
        if (rank.threshold >= 60) return 'rank-sss'; // Polyglot
        if (rank.threshold >= 40) return 'rank-sss'; // Immortal
        if (rank.threshold >= 22) return 'rank-sss'; // SSS
        if (rank.threshold >= 15) return 'rank-ss';
        if (rank.threshold >= 10) return 'rank-s';
        if (rank.threshold >= 7) return 'rank-a';
        if (rank.threshold >= 5) return 'rank-b';
        if (rank.threshold >= 3) return 'rank-c';
        return 'rank-d';
    }

    triggerRankEffects(char) {
        const layer = document.getElementById('combo-effects-layer');
        if (!layer) return;

        // Threshold checks for effects
        const rankObj = this.getRank(this.streak);
        const t = rankObj.threshold;

        if (t >= 7) { // A or higher
             const flash = document.createElement('div');
             flash.className = 'combo-flash'; 
             layer.appendChild(flash);
             setTimeout(() => flash.remove(), 400);
        }

        if (t >= 10) { // S or higher
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

        if (t >= 15) { // SS or higher
            const dancer = document.createElement('div');
            dancer.textContent = Math.random() > 0.5 ? '💃' : '🕺';
            dancer.className = 'combo-dancer';
            dancer.style.left = '-50px';
            dancer.style.top = Math.random() * 80 + 10 + '%';
            layer.appendChild(dancer);
            setTimeout(() => dancer.remove(), 2500);
        }

        if (t >= 22) { // SSS or higher
             const emojis = ['🌞','🐷','🐸','🐧','🦊','🦋','🦄','🍻','🍥','🌈','🌍','🌎','🌏','🪐','💫','☄️','☃️','🦝','🐯','🎎','💸','💵','💴','💶','💷','💰','🧧'];
             const selectedEmoji = emojis[Math.floor(Math.random() * emojis.length)];
             for(let i=0; i<25; i++) {
                 const part = document.createElement('div');
                 part.textContent = selectedEmoji;
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
