// src/services/vocabService.js
import dbData from '../data/export_rtdb_121725.json';
import { settingsService } from './settingsService';

class VocabService {
    constructor() {
        this.vocabList = dbData.vocab || [];
    }

    getAll() {
        return this.vocabList;
    }

    // Helper to identify language types
    getLangType(code) {
        if (code === 'ja') return 'JAPANESE';
        if (['zh', 'ko', 'ru'].includes(code)) return 'NON_LATIN';
        return 'WESTERN'; // en, es, fr, de, it, pt
    }

    getFlashcardData() {
        const { targetLang, originLang } = settingsService.get();
        
        return this.vocabList.map(item => {
            const type = this.getLangType(targetLang);
            
            // --- FRONT CONTENT (Target Language) ---
            let frontMain = item[targetLang] || '';
            let frontSub = ''; // For Romaji/Pinyin
            let frontExtra = ''; // For Furigana (Specific to JP)

            if (type === 'JAPANESE') {
                frontExtra = item.ja_furi || ''; // Furigana
                frontSub = item.ja_roma || '';   // Romaji
            } else if (type === 'NON_LATIN') {
                // Map the specific romanization keys
                if (targetLang === 'zh') frontSub = item.zh_pin || item.zh_pinyin;
                if (targetLang === 'ko') frontSub = item.ko_roma || item.ko_romaji;
                if (targetLang === 'ru') frontSub = item.ru_tr || item.ru_translit;
            }

            // --- BACK CONTENT (Origin Language + Sentences) ---
            const definition = item[originLang] || 'No definition available';
            
            // Sentence in Target Language
            const sentenceTarget = item[targetLang + '_ex'] || '';
            // Sentence translation in Origin Language
            const sentenceOrigin = item[originLang + '_ex'] || '';

            return {
                id: item.id,
                type: type,
                front: {
                    main: frontMain,
                    sub: frontSub,
                    extra: frontExtra // Furigana
                },
                back: {
                    definition: definition,
                    sentenceTarget: sentenceTarget,
                    sentenceOrigin: sentenceOrigin
                }
            };
        });
    }
}

export const vocabService = new VocabService();
