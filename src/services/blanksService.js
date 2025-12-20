import { vocabService } from './vocabService';

class BlanksService {
    generateQuestion(targetId) {
        const list = vocabService.getAll();
        if (!list || list.length === 0) return null;

        // 1. Find the target item
        const targetItem = list.find(item => item.id === targetId);
        
        // 2. Validation: We need the item, a target sentence, and the main word
        if (!targetItem || !targetItem.back.sentenceTarget || !targetItem.front.main) {
            return null;
        }

        const sentence = targetItem.back.sentenceTarget;
        const word = targetItem.front.main;

        // 3. Validation: The word must actually exist in the sentence to be blanked out
        // (Simple string matching is used here)
        if (!sentence.includes(word)) {
            return null; 
        }

        // 4. Create the blanked sentence
        // We replace the word with underscores. The BlanksApp will turn underscores into the UI pill.
        const blankedSentence = sentence.replace(word, '_______');

        // 5. Generate Distractors (3 random other words)
        const others = list
            .filter(item => item.id !== targetId && item.front.main)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

        // 6. Combine correct answer with distractors and shuffle
        const choices = [targetItem, ...others].sort(() => 0.5 - Math.random());

        return {
            target: targetItem,
            sentence: sentence,       // The full sentence (for audio/checking)
            blankedSentence: blankedSentence, // The sentence with '_______'
            answerWord: word,         // The correct word to fill in
            choices: choices          // The 4 options
        };
    }
}

export const blanksService = new BlanksService();
