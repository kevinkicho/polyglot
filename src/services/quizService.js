import { vocabService } from './vocabService';
import { settingsService } from './settingsService';

export const quizService = {
    generateQuestion(specificId = null) {
        const allVocab = vocabService.getAll();
        // Prevent crashes on empty lists
        if (!allVocab || allVocab.length < 2) return null;

        let target = null;
        if (specificId) {
            target = allVocab.find(i => i.id === specificId);
        } 
        
        if (!target) {
            target = allVocab[Math.floor(Math.random() * allVocab.length)];
        }

        const numChoices = parseInt(settingsService.get().quizChoices) || 4;
        const choices = [target];
        
        // Loop Safety
        let attempts = 0;
        while (choices.length < numChoices && attempts < 50) {
            attempts++;
            const random = allVocab[Math.floor(Math.random() * allVocab.length)];
            // Avoid duplicates
            if (random && !choices.find(c => c.id === random.id)) {
                choices.push(random);
            }
        }

        return {
            target,
            choices: choices.sort(() => Math.random() - 0.5)
        };
    }
};
