import { vocabService } from './vocabService';
import { settingsService } from './settingsService';

export const blanksService = {
    generateQuestion(specificId = null) {
        const allVocab = vocabService.getAll();
        if (!allVocab || allVocab.length === 0) return null;

        // [FIX] Strict check: Must have sentenceTarget
        const candidates = allVocab.filter(item => 
            item && item.back && item.back.sentenceTarget && item.back.sentenceTarget.length > 0
        );

        if (candidates.length === 0) {
            console.warn("[BlanksService] No vocab with sentences found.");
            return null;
        }

        let target = null;
        if (specificId) {
            target = candidates.find(i => i.id === specificId);
        }
        if (!target) {
            target = candidates[Math.floor(Math.random() * candidates.length)];
        }

        const choices = [target];
        const numChoices = settingsService.get().blanksChoices || 4;
        
        let attempts = 0;
        while (choices.length < numChoices && attempts < 50) {
            attempts++;
            const random = candidates[Math.floor(Math.random() * candidates.length)];
            // Prevent duplicates
            if (random && !choices.find(c => c.id === random.id)) {
                choices.push(random);
            }
        }
        
        // Prepare sentence
        const cleanSentence = target.back.sentenceTarget.replace(/<[^>]*>?/gm, '');
        const answerWord = target.front.main; 
        // Simple masking (Replace main word with blanks)
        const maskedSentence = cleanSentence.replace(answerWord, '_______');

        return {
            target,
            sentence: maskedSentence,
            cleanSentence: cleanSentence,
            answerWord: answerWord,
            choices: choices.sort(() => Math.random() - 0.5)
        };
    }
};
