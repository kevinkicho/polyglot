/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ToastService', () => {
    let toast;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();
        document.body.innerHTML = '';
        const mod = await import('../src/services/toastService.js');
        toast = mod.toast;
        toast.container = null;
    });

    it('creates container on first use', () => {
        toast.success('Test');
        const container = document.getElementById('toast-container');
        expect(container).toBeTruthy();
    });

    it('adds toast element to container', () => {
        toast.success('Hello');
        expect(toast.container.children.length).toBe(1);
        expect(toast.container.children[0].textContent).toContain('Hello');
    });

    it('removes toast after duration', () => {
        toast.info('Temp', 1000);
        expect(toast.container.children.length).toBe(1);
        vi.advanceTimersByTime(1100);
        // Animation end fires removal — simulate it
        const el = toast.container.querySelector('.toast-exit');
        if (el) el.dispatchEvent(new Event('animationend'));
        expect(toast.container.children.length).toBe(0);
    });

    it('exposes success, error, info, warning methods', () => {
        expect(typeof toast.success).toBe('function');
        expect(typeof toast.error).toBe('function');
        expect(typeof toast.info).toBe('function');
        expect(typeof toast.warning).toBe('function');
    });

    it('confirm returns a promise', () => {
        const result = toast.confirm('Are you sure?');
        expect(result).toBeInstanceOf(Promise);
    });

    it('confirm resolves true on OK click', async () => {
        const p = toast.confirm('Delete?');
        const okBtn = document.querySelector('.toast-ok');
        okBtn.click();
        expect(await p).toBe(true);
    });

    it('confirm resolves false on Cancel click', async () => {
        const p = toast.confirm('Delete?');
        const cancelBtn = document.querySelector('.toast-cancel');
        cancelBtn.click();
        expect(await p).toBe(false);
    });
});
