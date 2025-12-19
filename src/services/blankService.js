import { vocabService } from './vocabService';
import { settingsService } from './settingsService';

class BlanksService {
    generateQuestion(currentId = null) {
        const list = vocabService.getAll();
        
        // GUARD: Stop if no data
        if (!list || list.length < 4) {
            console.warn("BlanksService: Not enough data.");
            return null;
        }

        let targetIndex = -1;
        if (currentId !== null) {
            targetIndex = vocabService.findIndexById(currentId);
        }
        
        if (targetIndex === -1) {
            targetIndex = Math.floor(Math.random() * list.length);
        }

        const target = list[targetIndex];

        // GUARD: Stop if target invalid
        if (!target) {
            return null;
        }

        // Generate choices safely
        const choices = [target];
        let attempts = 0;
        while (choices.length < 4 && attempts < 50) {
            const r = list[Math.floor(Math.random() * list.length)];
            if (r && r.id !== target.id && !choices.find(c => c.id === r.id)) {
                choices.push(r);
            }
            attempts++;
        }

        const settings = settingsService.get();
        let sentence = "";
        
        // SAFE ACCESS to back properties
        const tBack = target.back || {};
        
        if (settings.targetLang === 'ja') sentence = target.ja_ex || tBack.sentenceTarget || "";
        else if (settings.targetLang === 'ko') sentence = target.ko_ex || tBack.sentenceTarget || "";
        else if (settings.targetLang === 'zh') sentence = target.zh_ex || tBack.sentenceTarget || "";
        else sentence = tBack.sentenceTarget || "";

        // Fallback to Main Word
        if (!sentence) {
            sentence = target.front ? target.front.main : "???";
        }

        let cleanSentence = sentence.replace(/<[^>]*>?/gm, '');
        const answerWord = target.front ? target.front.main : "???";
        
        let blankedSentence = cleanSentence;
        if (cleanSentence.includes(answerWord)) {
            blankedSentence = cleanSentence.replace(answerWord, '______');
        } else {
            blankedSentence = "______ " + cleanSentence; 
        }

        return {
            target,
            choices: choices.sort(() => Math.random() - 0.5),
            sentence: cleanSentence,
            blankedSentence: blankedSentence,
            answerWord: answerWord
        };
    }
}

export const blanksService = new BlanksService();
