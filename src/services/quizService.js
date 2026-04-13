import { vocabService } from './vocabService';
import { settingsService } from './settingsService';

class QuizService {
    generateQuestion(specificId = null) {
        // FIXED: Use getAll() and filter locally to avoid "getFlashcardData is not a function" error
        const fullList = vocabService.getAll().filter(item => item.front && item.front.main && item.front.main !== "???");
        
        if (fullList.length < 4) return null; // Safety check

        const settings = settingsService.get();
        const numChoices = parseInt(settings.quizChoices) || 4;

        // 1. Select Correct Answer
        let correctIndex;
        if (specificId !== null) {
            // Find index in the *filtered* list, or fallback to random
            const foundIndex = fullList.findIndex(item => item.id === parseInt(specificId));
            correctIndex = foundIndex !== -1 ? foundIndex : Math.floor(Math.random() * fullList.length);
        } else {
            correctIndex = Math.floor(Math.random() * fullList.length);
        }
        
        const correctItem = fullList[correctIndex];

        // 2. Select Distractors
        const choices = [correctItem];
        const usedIds = new Set([correctItem.id]);

        while (choices.length < numChoices) {
            const randIndex = Math.floor(Math.random() * fullList.length);
            const randomItem = fullList[randIndex];
            
            if (!usedIds.has(randomItem.id)) {
                choices.push(randomItem);
                usedIds.add(randomItem.id);
            }
        }

        // 3. Shuffle Choices
        for (let i = choices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choices[i], choices[j]] = [choices[j], choices[i]];
        }

        return {
            target: correctItem,
            choices: choices
        };
    }
}

export const quizService = new QuizService();
