import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store = {};
const localStorageMock = {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, val) => { store[key] = val; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
};
vi.stubGlobal('localStorage', localStorageMock);

describe('SettingsService', () => {
    let SettingsService;

    beforeEach(async () => {
        localStorageMock.clear();
        vi.resetModules();
        const mod = await import('../src/services/settingsService.js');
        SettingsService = mod.settingsService;
    });

    it('returns defaults when no saved settings', () => {
        const s = SettingsService.get();
        expect(s.targetLang).toBe('ja');
        expect(s.originLang).toBe('en');
        expect(s.darkMode).toBe(false);
        expect(s.volume).toBe(1.0);
    });

    it('sets and persists a value', () => {
        SettingsService.set('darkMode', true);
        expect(SettingsService.get().darkMode).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('merges saved settings with defaults', () => {
        store['polyglot_settings'] = JSON.stringify({ targetLang: 'zh', volume: 0.5 });
        vi.resetModules();

        return import('../src/services/settingsService.js').then(mod => {
            const s = mod.settingsService.get();
            expect(s.targetLang).toBe('zh');
            expect(s.volume).toBe(0.5);
            // Defaults preserved
            expect(s.originLang).toBe('en');
            expect(s.showVocab).toBe(true);
        });
    });

    it('handles corrupted localStorage gracefully', () => {
        store['polyglot_settings'] = '{invalid json!!!';
        vi.resetModules();

        return import('../src/services/settingsService.js').then(mod => {
            const s = mod.settingsService.get();
            expect(s.targetLang).toBe('ja');
        });
    });
});
