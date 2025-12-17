import dbData from '../data/export_rtdb_121725.json';

class VocabService {
    constructor() {
        this.vocabList = dbData.vocab || [];
        this.targetLang = 'en'; // Default to English
    }

    setTargetLanguage(langCode) {
        this.targetLang = langCode;
    }

    getAll() {
        return this.vocabList;
    }

    formatForFlashcard(item) {
        if (!item) return null;

        const lang = this.targetLang;
        
        // Dynamic Key Selection based on language
        // Example: if lang is 'es', we look for item.es and item.es_ex
        const targetMeaning = item[lang] || 'Translation unavailable';
        const targetSentence = item[lang + '_ex'] || '';
        
        // Handle special Romanization/Pinyin cases if they exist
        // Chinese has 'zh_pin', Korean has 'ko_roma', Russian has 'ru_tr' (or ru_translit)
        let romanization = '';
        if (lang === 'zh') romanization = item.zh_pin || item.zh_pinyin || '';
        if (lang === 'ko') romanization = item.ko_roma || item.ko_romaji || '';
        if (lang === 'ru') romanization = item.ru_tr || item.ru_translit || '';

        // If a romanization exists, append it to the meaning for display
        const displayMeaning = romanization 
            ? `${targetMeaning} \n(${romanization})` 
            : targetMeaning;

        return {
            id: item.id,
            // FRONT: Always Japanese
            japanese: item.ja || '',
            reading: item.ja_furi || item.ja_roma || '', 
            
            // BACK: Selected Language
            english: displayMeaning, // We reuse the 'english' field key for the Card component
            
            // SENTENCES
            sentenceJp: item.ja_ex || '',
            sentenceEn: targetSentence // We reuse 'sentenceEn' for the target sentence
        };
    }

    getFlashcardData() {
        return this.vocabList.map(item => this.formatForFlashcard(item));
    }
}

export const vocabService = new VocabService();
