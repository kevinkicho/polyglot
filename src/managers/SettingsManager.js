import { settingsService } from '../services/settingsService';
import { vocabService } from '../services/vocabService';


class SettingsManager {
    init() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#home-settings-btn')) this.open();
            if (e.target.closest('#modal-close-x')) this.close();
            if (e.target.id === 'modal-backdrop') this.close();
        });

        // Toggle Dark Mode
        document.getElementById('toggle-dark').addEventListener('change', () => document.documentElement.classList.toggle('dark'));

        this.bindSetting('toggle-dark', 'darkMode');
        this.bindSetting('volume-slider', 'volume');

        // Audio
        this.bindSetting('toggle-autoplay', 'autoPlay');
        this.bindSetting('toggle-wait-audio', 'waitForAudio');
        this.bindSetting('toggle-click-audio', 'clickAudio');

        // Card Visuals
        this.bindSetting('toggle-reading', 'showReading');
        this.bindSetting('toggle-sentence', 'showSentence');
        this.bindSetting('toggle-english', 'showEnglish');

        // Game-specific
        this.bindSetting('toggle-sent-anim', 'sentencesWinAnim');
        this.bindSetting('toggle-sent-word-audio', 'sentencesWordAudio');
        this.bindSetting('toggle-quiz-double', 'quizDoubleClick');
        this.bindSetting('toggle-quiz-autoplay', 'quizAutoPlayCorrect');
        this.bindSetting('toggle-blanks-double', 'blanksDoubleClick');
        this.bindSetting('toggle-blanks-answer-audio', 'blanksAnswerAudio');
        this.bindSetting('toggle-blanks-autoplay', 'blanksAutoPlayCorrect');
        this.bindSetting('toggle-combo-effects', 'comboEffects', () => {
            const comboEl = document.getElementById('combo-container');
            const effectsEl = document.getElementById('combo-effects-layer');
            if (!settingsService.get().comboEffects) {
                if (comboEl) comboEl.style.display = 'none';
                if (effectsEl) effectsEl.style.display = 'none';
            } else {
                if (comboEl) comboEl.style.display = '';
                if (effectsEl) effectsEl.style.display = '';
            }
        });

        // Language Selects
        const onLanguageChange = () => {
            const s = settingsService.get();
            vocabService.remapLanguages(s.targetLang, s.originLang);
        };
        this.bindSetting('target-select', 'targetLang', onLanguageChange);
        this.bindSetting('origin-select', 'originLang', onLanguageChange);

        // Accordion Logic
        [
            { btn: 'audio-accordion-btn', c: 'audio-options', a: 'accordion-arrow-audio' },
            { btn: 'display-accordion-btn', c: 'display-options', a: 'accordion-arrow-1' },
            { btn: 'sent-accordion-btn', c: 'sent-options', a: 'accordion-arrow-sent' },
            { btn: 'quiz-accordion-btn', c: 'quiz-options', a: 'accordion-arrow-3' },
            { btn: 'blanks-accordion-btn', c: 'blanks-options', a: 'accordion-arrow-blanks' },
            { btn: 'effects-accordion-btn', c: 'effects-options', a: 'accordion-arrow-effects' }
        ].forEach(o => {
            const b = document.getElementById(o.btn), c = document.getElementById(o.c), a = document.getElementById(o.a);
            if (b) b.addEventListener('click', () => { c.classList.toggle('open'); a.classList.toggle('rotate'); });
        });
    }

    bindSetting(id, key, cb) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', (e) => {
            settingsService.set(key, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
            if (cb) cb();
        });
    }

    open() {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            this.loadToUI();
            settingsModal.classList.remove('hidden');
            setTimeout(() => settingsModal.classList.remove('opacity-0'), 10);
        }
    }

    close() {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.classList.add('opacity-0');
            setTimeout(() => settingsModal.classList.add('hidden'), 200);
        }
    }

    loadToUI() {
        const s = settingsService.get();
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
        setVal('target-select', s.targetLang); setVal('origin-select', s.originLang);
        setChk('toggle-dark', s.darkMode); setVal('volume-slider', s.volume !== undefined ? s.volume : 1.0);

        // Audio
        setChk('toggle-autoplay', s.autoPlay !== false);
        setChk('toggle-wait-audio', s.waitForAudio !== false);
        setChk('toggle-click-audio', s.clickAudio !== false);

        // Card Visuals
        setChk('toggle-reading', s.showReading !== false);
        setChk('toggle-sentence', s.showSentence);
        setChk('toggle-english', s.showEnglish);

        // Game-specific
        setChk('toggle-sent-anim', s.sentencesWinAnim !== false);
        setChk('toggle-sent-word-audio', s.sentencesWordAudio !== false);
        setChk('toggle-quiz-double', s.quizDoubleClick);
        setChk('toggle-quiz-autoplay', s.quizAutoPlayCorrect !== false);
        setChk('toggle-blanks-double', s.blanksDoubleClick);
        setChk('toggle-blanks-answer-audio', s.blanksAnswerAudio !== false);
        setChk('toggle-blanks-autoplay', s.blanksAutoPlayCorrect !== false);
        setChk('toggle-combo-effects', s.comboEffects !== false);
    }
}

export const settingsManager = new SettingsManager();
