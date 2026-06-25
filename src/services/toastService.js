class ToastService {
    constructor() {
        this.container = null;
    }

    _ensureContainer() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-[10000] flex flex-col items-center gap-2 pointer-events-none';
        document.body.appendChild(this.container);
    }

    _create(message, { type = 'info', duration = 3000 } = {}) {
        this._ensureContainer();

        const colors = {
            success: 'bg-emerald-600',
            error: 'bg-red-600',
            info: 'bg-gray-800 dark:bg-gray-700',
            warning: 'bg-amber-600',
        };

        const icons = {
            success: '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
            error: '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
            info: '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>',
            warning: '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-2.5L13.73 4c-.77-.83-1.96-.83-2.73 0L4.07 16.5c-.77.83.19 2.5 1.73 2.5z"/></svg>',
        };

        const el = document.createElement('div');
        el.className = `${colors[type] || colors.info} text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-sm font-medium pointer-events-auto max-w-xs text-center toast-enter`;
        el.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
        this.container.appendChild(el);

        // Trigger enter animation
        requestAnimationFrame(() => el.classList.add('toast-visible'));

        setTimeout(() => {
            el.classList.remove('toast-visible');
            el.classList.add('toast-exit');
            el.addEventListener('animationend', () => el.remove());
        }, duration);
    }

    success(message, duration) { this._create(message, { type: 'success', duration }); }
    error(message, duration) { this._create(message, { type: 'error', duration }); }
    info(message, duration) { this._create(message, { type: 'info', duration }); }
    warning(message, duration) { this._create(message, { type: 'warning', duration }); }

    confirm(message) {
        return new Promise((resolve) => {
            this._ensureContainer();

            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 bg-black/40 z-[10001] flex items-center justify-center pointer-events-auto';
            overlay.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full toast-enter">
                    <p class="text-gray-800 dark:text-white font-medium text-center mb-5">${message}</p>
                    <div class="flex gap-3">
                        <button class="toast-cancel flex-1 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all">Cancel</button>
                        <button class="toast-ok flex-1 h-11 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 active:scale-95 transition-all">Confirm</button>
                    </div>
                </div>`;

            const cleanup = (result) => {
                overlay.remove();
                resolve(result);
            };

            overlay.querySelector('.toast-cancel').addEventListener('click', () => cleanup(false));
            overlay.querySelector('.toast-ok').addEventListener('click', () => cleanup(true));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });

            document.body.appendChild(overlay);
        });
    }
}

export const toast = new ToastService();
