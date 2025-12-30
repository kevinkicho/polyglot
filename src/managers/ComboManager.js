class ComboManager {
    constructor() {
        this.streak = 0;
        this.container = null;
        this.rankEl = null;
        this.textEl = null;
        this.timer = null;
        
        this.ranks = [
            { threshold: 0, char: 'D', text: 'Dismal', class: 'rank-d' },
            { threshold: 5, char: 'C', text: 'Crazy', class: 'rank-c' },
            { threshold: 10, char: 'B', text: 'Badass', class: 'rank-b' },
            { threshold: 15, char: 'A', text: 'Apocalyptic', class: 'rank-a' },
            { threshold: 20, char: 'S', text: 'Savage!', class: 'rank-s' },
            { threshold: 30, char: 'SS', text: 'Sick Skills!!', class: 'rank-ss' },
            { threshold: 40, char: 'SSS', text: 'Smokin\' Sexy Style!!', class: 'rank-sss' }
        ];
    }

    init() {
        if (document.getElementById('combo-container')) {
            this.bindElements();
            return;
        }
        
        this.container = document.createElement('div');
        this.container.id = 'combo-container';
        this.container.innerHTML = `
            <div id="combo-rank" class="combo-rank"></div>
            <div id="combo-text" class="combo-text"></div>
            <div id="combo-meter" class="combo-meter"><div class="bar"></div></div>
        `;
        document.body.appendChild(this.container);
        this.bindElements();
    }

    bindElements() {
        this.rankEl = document.getElementById('combo-rank');
        this.textEl = document.getElementById('combo-text');
    }

    reset() {
        // FIX: Safety check - if init() never ran, rankEl is null. 
        // We initialize now to prevent the crash, then reset.
        if (!this.rankEl) this.init();
        
        if (this.streak > 5 && this.rankEl) {
            // "Break" effect
            this.rankEl.style.transition = 'all 0.5s';
            this.rankEl.style.transform = 'translateY(50px) rotate(20deg)';
            this.rankEl.style.opacity = '0';
            if(this.textEl) this.textEl.style.opacity = '0';
        } else if (this.rankEl) {
            this.rankEl.textContent = '';
            if(this.textEl) this.textEl.textContent = '';
        }
        this.streak = 0;
    }

    increment() {
        this.init(); // Ensure UI exists
        this.streak++;
        
        if (!this.rankEl) return;

        // Reset styles for new hit
        this.rankEl.style.transition = '';
        this.rankEl.style.transform = '';
        this.rankEl.style.opacity = '1';

        const rank = this.getRank(this.streak);
        
        const isRankChange = this.rankEl.textContent !== rank.char;
        
        if (isRankChange || this.streak % 5 === 0) {
            this.renderRank(rank);
        }

        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.fadeOut(), 4000);
    }

    getRank(s) {
        for (let i = this.ranks.length - 1; i >= 0; i--) {
            if (s >= this.ranks[i].threshold) return this.ranks[i];
        }
        return this.ranks[0];
    }

    renderRank(rank) {
        this.rankEl.className = 'combo-rank'; 
        void this.rankEl.offsetWidth; 
        
        this.rankEl.textContent = rank.char;
        this.rankEl.classList.add(rank.class, 'animate-slam');
        
        this.textEl.className = 'combo-text';
        this.textEl.textContent = rank.text;
        this.textEl.classList.add('animate-slide');
        
        if (rank.char === 'SSS') {
             this.rankEl.classList.add('animate-pulse');
        }
    }

    fadeOut() {
        if(this.rankEl) this.rankEl.style.opacity = '0';
        if(this.textEl) this.textEl.style.opacity = '0';
        this.streak = 0;
    }
}

export const comboManager = new ComboManager();
