import { settingsService } from '../services/settingsService';
import { vocabService } from '../services/vocabService';
import { toast } from '../services/toastService';

class SettingsManager {
    init() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#home-settings-btn')) this.open();
            if (e.target.closest('#modal-done-btn')) this.close();
        });

        // Toggle Dark Mode
        document.getElementById('toggle-dark').addEventListener('change', () => document.documentElement.classList.toggle('dark'));

        this.bindSetting('toggle-dark', 'darkMode');
        this.bindSetting('volume-slider', 'volume');
        this.bindSetting('toggle-vocab', 'showVocab');
        this.bindSetting('toggle-sentence', 'showSentence');
        this.bindSetting('toggle-english', 'showEnglish');
        this.bindSetting('toggle-sent-anim', 'sentencesWinAnim');
        this.bindSetting('toggle-quiz-double', 'quizDoubleClick');
        this.bindSetting('toggle-blanks-double', 'blanksDoubleClick');

        // Language Selects
        const onLanguageChange = () => {
            const s = settingsService.get();
            vocabService.remapLanguages(s.targetLang, s.originLang);
        };
        this.bindSetting('target-select', 'targetLang', onLanguageChange);
        this.bindSetting('origin-select', 'originLang', onLanguageChange);

        // Export / Import
        const exportBtn = document.getElementById('btn-export-vocab');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportVocab());

        const importInput = document.getElementById('btn-import-vocab');
        if (importInput) importInput.addEventListener('change', (e) => this.importVocab(e));

        // Accordion Logic
        [
            { btn: 'display-accordion-btn', c: 'display-options', a: 'accordion-arrow-1' },
            { btn: 'sent-accordion-btn', c: 'sent-options', a: 'accordion-arrow-sent' },
            { btn: 'quiz-accordion-btn', c: 'quiz-options', a: 'accordion-arrow-3' },
            { btn: 'blanks-accordion-btn', c: 'blanks-options', a: 'accordion-arrow-blanks' }
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
        setChk('toggle-vocab', s.showVocab); setChk('toggle-sentence', s.showSentence); setChk('toggle-english', s.showEnglish);
        setChk('toggle-sent-anim', s.sentencesWinAnim !== false);
        setChk('toggle-quiz-double', s.quizDoubleClick);
        setChk('toggle-blanks-double', s.blanksDoubleClick);
    }
    exportVocab() {
        const data = vocabService.getAll();
        if (!data.length) { toast.warning('No vocabulary to export'); return; }

        // Export raw data (without computed front/back) for clean reimport
        const raw = data.map(item => {
            const copy = { ...item };
            delete copy.front;
            delete copy.back;
            return copy;
        });

        const blob = new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `polyglot-vocab-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${raw.length} items`);
    }

    async importVocab(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!Array.isArray(data) || data.length === 0) {
                toast.error('Invalid file: expected a JSON array');
                return;
            }

            const confirmed = await toast.confirm(`Import ${data.length} vocab items? This will update existing entries and add new ones.`);
            if (!confirmed) return;

            let updated = 0;
            for (const item of data) {
                if (item.firebaseKey) {
                    const fields = {};
                    Object.keys(item).forEach(k => {
                        if (k !== 'firebaseKey' && k !== 'id' && k !== 'front' && k !== 'back') {
                            fields[k] = item[k];
                        }
                    });
                    await vocabService.saveItem(item.firebaseKey, fields);
                    updated++;
                }
            }
            toast.success(`Imported ${updated} items`);
        } catch (err) {
            console.error('Import error:', err);
            toast.error('Import failed: invalid JSON file');
        }

        // Reset input so same file can be selected again
        e.target.value = '';
    }
}

export const settingsManager = new SettingsManager();
