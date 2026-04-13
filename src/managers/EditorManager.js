import { vocabService } from '../services/vocabService';
import { audioService } from '../services/audioService';
import { viewManager } from './ViewManager';
import { isAdmin } from '../config/roles';
import { toast } from '../services/toastService';

class EditorManager {
    constructor() {
        this.currentEditId = null;
        this._dictionaryService = null;
    }

    async _getDictionaryService() {
        if (!this._dictionaryService) {
            const { dictionaryService } = await import('../services/dictionaryService');
            await dictionaryService.fetchData();
            this._dictionaryService = dictionaryService;
        }
        return this._dictionaryService;
    }

    init() {
        this.bindEvents();
        
        // Expose global helpers required by inline HTML onclicks (if any remain)
        window.playDictAudio = (text) => audioService.speak(text, 'zh-CN');
    }

    updatePermissions(user) {
        const admin = isAdmin(user);
        const btns = document.querySelectorAll('#btn-save-vocab, #btn-save-dict, #btn-add-dict');
        btns.forEach(btn => {
            if (admin) {
                btn.classList.remove('hidden');
                btn.disabled = false;
            } else {
                btn.classList.add('hidden');
                btn.disabled = true;
            }
        });
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.game-edit-btn')) {
                this.openEditModalForActiveApp();
            }
        });

        const tabVocabBtn = document.getElementById('tab-vocab-btn'); if(tabVocabBtn) tabVocabBtn.addEventListener('click', () => this.switchEditTab('vocab'));
        const tabDictBtn = document.getElementById('tab-dict-btn'); if(tabDictBtn) tabDictBtn.addEventListener('click', () => this.switchEditTab('dict'));
        const ec = document.getElementById('edit-close-btn'); if(ec) ec.addEventListener('click', () => { const em=document.getElementById('edit-modal'); if(em){ em.classList.add('opacity-0'); setTimeout(()=>em.classList.add('hidden'), 200); }});

        const saveVocabBtn = document.getElementById('btn-save-vocab');
        if(saveVocabBtn) {
            saveVocabBtn.addEventListener('click', async () => this.saveVocab(saveVocabBtn));
        }

        const saveDictBtn = document.getElementById('btn-save-dict');
        if(saveDictBtn) {
            saveDictBtn.addEventListener('click', async () => this.saveDict(saveDictBtn));
        }
    }

    openEditModalForActiveApp() {
        const app = viewManager.getActiveApp();
        if (!app) return;

        let item = null;
        if (app.currentData) {
            item = app.currentData.target || app.currentData.item || (app.currentData.id ? app.currentData : null);
        }
        
        // Fallback for linear games
        if (!item && app.currentIndex !== undefined) {
            const all = vocabService.getAll();
            if(all.length > app.currentIndex) item = all[app.currentIndex];
        }

        if (item && item.id !== undefined) {
            this.currentEditId = item.id;
            const fullData = vocabService.getAll().find(v => v.id == item.id);
            if(fullData) {
                const em = document.getElementById('edit-modal');
                if(em) { em.classList.remove('hidden'); setTimeout(()=>em.classList.remove('opacity-0'), 10); }
                this.switchEditTab('vocab');
                this.renderVocabEditFields(fullData); 
                
                // Construct text for dictionary lookup based on all content in the card/game
                let combinedText = "";
                const getText = (v) => {
                    if(!v) return "";
                    return (v.zh||"") + (v.zh_ex||"") + (v.front?.main||"") + (v.back?.main||"") + (v.back?.definition||"");
                };

                if (app.currentData) {
                    if (app.currentData.target) combinedText += getText(app.currentData.target);
                    if (app.currentData.choices && Array.isArray(app.currentData.choices)) {
                        app.currentData.choices.forEach(c => combinedText += getText(c));
                    }
                    if (app.currentData.item) combinedText += getText(app.currentData.item);
                    if (app.currentData.displayMeaning) combinedText += app.currentData.displayMeaning;
                    if (app.currentData.sentence) combinedText += app.currentData.sentence;
                    if (app.currentData.targetWord) combinedText += app.currentData.targetWord;
                    if (!app.currentData.target && !app.currentData.item && app.currentData.id) combinedText += getText(app.currentData);
                }
                
                if (app.cards && Array.isArray(app.cards)) {
                    app.cards.forEach(c => combinedText += (c.text || ""));
                }

                this.populateDictionaryEdit(combinedText);
            }
        }
    }

    switchEditTab(tab) {
        const tabVocab = document.getElementById('edit-tab-vocab'); const tabDict = document.getElementById('edit-tab-dict'); const tabVocabBtn = document.getElementById('tab-vocab-btn'); const tabDictBtn = document.getElementById('tab-dict-btn');
        if(!tabVocab || !tabDict) return;
        if (tab === 'vocab') { tabVocab.classList.remove('hidden'); tabDict.classList.add('hidden'); tabVocabBtn.classList.replace('bg-gray-200', 'bg-indigo-600'); tabVocabBtn.classList.replace('text-gray-600', 'text-white'); tabDictBtn.classList.replace('bg-indigo-600', 'bg-gray-200'); tabDictBtn.classList.replace('text-white', 'text-gray-600'); } 
        else { tabVocab.classList.add('hidden'); tabDict.classList.remove('hidden'); tabDictBtn.classList.replace('bg-gray-200', 'bg-indigo-600'); tabDictBtn.classList.replace('text-gray-600', 'text-white'); tabVocabBtn.classList.replace('bg-indigo-600', 'bg-gray-200'); tabVocabBtn.classList.replace('text-white', 'text-gray-600'); }
    }

    renderVocabEditFields(data) {
        const container = document.getElementById('edit-vocab-fields');
        const idLabel = document.getElementById('edit-vocab-id');
        if (idLabel) idLabel.textContent = `ID: ${data.id}`;
        container.dataset.fbKey = data.firebaseKey || '';
        if (!container) return;
        container.innerHTML = '';
        
        // NOTE: We check auth.currentUser in logic, but passing it down is cleaner. 
        // For simplicity here we assume the hidden/disabled state handles the UI security.
        const fields = ['ja', 'ja_furi', 'ja_roma', 'ja_ex', 'en', 'en_ex', 'zh', 'zh_pin', 'zh_ex', 'ko', 'ko_roma', 'ko_ex', 'de', 'de_ex', 'es', 'es_ex', 'fr', 'fr_ex', 'it', 'it_ex', 'pt', 'pt_ex', 'ru', 'ru_tr', 'ru_ex'];
        
        fields.forEach(key => {
            const val = data[key] || '';
            const content = `<input class="vocab-input w-full bg-gray-100 dark:bg-gray-800 border-none rounded-lg p-3 text-gray-800 dark:text-white font-medium focus:ring-2 ring-indigo-500 outline-none" data-key="${key}" value="${val}">`;
            container.insertAdjacentHTML('beforeend', `<div><label class="block text-xs font-bold text-gray-400 mb-1 uppercase">${key}</label>${content}</div>`);
        });
    }

    async populateDictionaryEdit(text) {
         const list = document.getElementById('edit-dict-list');
         if(!list) return;
         if(!text) { list.innerHTML = `<div class="text-gray-400 text-sm italic p-2">No text content available to look up.</div>`; return; }

         list.innerHTML = '<div class="text-gray-400 text-sm italic p-2">Loading dictionary...</div>';
         const dictService = await this._getDictionaryService();
         const uniqueChars = Array.from(new Set(text.split(''))).join('');
         const results = dictService.lookupText(uniqueChars);
         
         if (results.length === 0) { list.innerHTML = `<div class="text-gray-400 text-sm italic p-2">No dictionary entries found.</div>`; return; }

         let html = '';
         results.forEach(entry => {
             const koVal = entry.k || ''; 
             html += `<div class="p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 dict-edit-row" data-fb-key="${entry.firebaseKey}"><div class="flex gap-2 mb-2 items-center"><input class="dict-input w-16 bg-gray-100 dark:bg-gray-800 border-none rounded p-2 text-xl font-bold text-indigo-600 text-center" data-field="s" value="${entry.s}" placeholder="Char"><button class="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center hover:bg-indigo-200 active:scale-95 transition-all flex-shrink-0" onclick="window.playDictAudio('${entry.s}')"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg></button><input class="dict-input w-full bg-gray-100 dark:bg-gray-800 border-none rounded p-2 text-sm" data-field="p" value="${entry.p}" placeholder="Pinyin"></div><div class="flex gap-2 mb-2"><input class="dict-input w-full bg-gray-100 dark:bg-gray-800 border-none rounded p-2 text-sm" data-field="t" value="${entry.t}" placeholder="Traditional"><input class="dict-input w-full bg-gray-100 dark:bg-gray-800 border-none rounded p-2 text-sm" data-field="k" value="${koVal}" placeholder="Korean / Definition"></div><textarea class="dict-input w-full bg-gray-100 dark:bg-gray-800 border-none rounded p-2 text-sm h-16" data-field="e" placeholder="English">${entry.e}</textarea></div>`;
         });
         list.innerHTML = html;
    }

    async saveVocab(btn) {
        const container = document.getElementById('edit-vocab-fields');
        const key = container.dataset.fbKey;
        if(!key) return toast.error("Error: No record ID");
        btn.innerText = "Saving..."; btn.disabled = true;
        try {
            const inputs = container.querySelectorAll('.vocab-input');
            const data = {};
            inputs.forEach(i => data[i.dataset.key] = i.value);
            await vocabService.saveItem(key, data);
            toast.success("Vocabulary saved!");
        } catch(e) { console.error(e); toast.error("Save failed"); } 
        finally { btn.innerText = "SAVE VOCAB"; btn.disabled = false; }
    }

    async saveDict(btn) {
        const rows = document.querySelectorAll('.dict-edit-row');
        if(rows.length === 0) return;
        btn.innerText = "Saving..."; btn.disabled = true;
        try {
            const dictService = await this._getDictionaryService();
            const updates = [];
            rows.forEach(row => {
                const key = row.dataset.fbKey;
                if(key) {
                    const getVal = (f) => row.querySelector(`[data-field="${f}"]`).value;
                    updates.push(dictService.saveEntry(key, { s: getVal('s'), t: getVal('t'), p: getVal('p'), e: getVal('e'), k: getVal('k') }));
                }
            });
            await Promise.all(updates); toast.success("Dictionary saved!");
        } catch(e) { console.error(e); toast.error("Save failed"); } 
        finally { btn.innerText = "SAVE DICTIONARY"; btn.disabled = false; }
    }
}

export const editorManager = new EditorManager();
