import { vocabService } from './vocabService';
import { settingsService } from './settingsService';

class BlanksService {
    generateQuestion(specificId = null) {
        const fullList = vocabService.getFlashcardData();
        const settings = settingsService.get();
        const numChoices = parseInt(settings.blanksChoices) || 4;
        const targetLang = settings.targetLang;

        if (!fullList || fullList.length === 0) return null;

        let correctIndex, correctItem, sentence, obscuredSentence, answerWord;
        let attempts = 0;
        
        // Limit attempts to prevent freezing if few sentences exist
        const maxAttempts = fullList.length * 2;

        // Find a suitable question
        do {
            if (specificId !== null && attempts === 0) {
                correctIndex = vocabService.findIndexById(specificId);
                if (correctIndex === -1) correctIndex = vocabService.getRandomIndex();
            } else {
                correctIndex = vocabService.getRandomIndex();
            }
            
            correctItem = fullList[correctIndex];
            sentence = correctItem.back.sentenceTarget;
            const vocab = correctItem.front.main; 

            if (sentence) {
                // STRATEGY 1: Exact Match
                if (sentence.includes(vocab)) {
                    const escaped = vocab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    obscuredSentence = sentence.replace(new RegExp(escaped, 'g'), '_______');
                    answerWord = vocab;
                } 
                // STRATEGY 2: Japanese Conjugation Match (Stem Search)
                else if (targetLang === 'ja' && vocab.length > 1) {
                    const stem = vocab.slice(0, -1);
                    if (sentence.includes(stem)) {
                        obscuredSentence = sentence.replace(stem, '_______');
                        answerWord = vocab; 
                    }
                }
            }
            
            if (obscuredSentence) break;
            
            attempts++;
            // If specific ID failed to have a sentence, switch to random mode for subsequent attempts
            if (specificId !== null) specificId = null; 

        } while (attempts < maxAttempts);

        if (!obscuredSentence) return null;

        // Select Distractors
        const choices = [correctItem];
        const usedIndices = new Set([correctIndex]);
        let safetyCounter = 0;

        while (choices.length < numChoices && safetyCounter < 100) {
            const randIndex = vocabService.getRandomIndex();
            if (!usedIndices.has(randIndex)) {
                // Ensure distractor isn't same word
                if (fullList[randIndex].front.main !== correctItem.front.main) {
                    choices.push(fullList[randIndex]);
                    usedIndices.add(randIndex);
                }
            }
            safetyCounter++;
        }

        // Shuffle
        for (let i = choices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choices[i], choices[j]] = [choices[j], choices[i]];
        }

        return {
            target: correctItem,
            blankedSentence: obscuredSentence, // FIX: Renamed from 'sentence' to match App expectation
            cleanSentence: sentence,    
            answerWord: answerWord,
            choices: choices
        };
    }
}

export const blanksService = new BlanksService();
