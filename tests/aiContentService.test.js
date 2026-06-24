import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/services/aiService', () => ({
    aiService: {
        isAvailable: vi.fn(() => true),
        chat: vi.fn(),
    },
}));

vi.mock('../src/services/srsService', () => ({
    srsService: {
        getBox: vi.fn(),
    },
}));

import { aiService } from '../src/services/aiService';
import { srsService } from '../src/services/srsService';
import {
    getStrugglingWords,
    generateBlankQuestion,
    generateListeningPassage,
    generateComprehensionQuestions,
    generateCulturalNote,
    generateMnemonic,
    generateSentenceExercise,
    generateQuizQuestion,
    generateTrueFalseStatement,
    generateConstructorExercise,
    generateFlashcardContent,
    generateMatchPairs,
} from '../src/services/aiContentService';

function makeWord(id, frontMain, backMain) {
    return { id, front: { main: frontMain }, back: { main: backMain, definition: backMain } };
}

beforeEach(() => {
    vi.clearAllMocks();
});

// ── getStrugglingWords ────────────────────────────────────────────

describe('getStrugglingWords', () => {
    it('returns only items with SRS box <= 3', () => {
        srsService.getBox.mockImplementation(id => ({ 1: 1, 2: 3, 3: 5, 4: 2, 5: 4 }[id]));
        const list = [
            { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 },
        ];
        const result = getStrugglingWords(list);
        expect(result.map(w => w.id)).toEqual([1, 2, 4]);
    });

    it('returns empty array when all items are mastered (box > 3)', () => {
        srsService.getBox.mockReturnValue(5);
        const list = [{ id: 1 }, { id: 2 }];
        expect(getStrugglingWords(list)).toEqual([]);
    });

    it('returns all items when all are new (box <= 3)', () => {
        srsService.getBox.mockReturnValue(1);
        const list = [{ id: 10 }, { id: 20 }, { id: 30 }];
        expect(getStrugglingWords(list)).toHaveLength(3);
    });

    it('handles empty list', () => {
        srsService.getBox.mockReturnValue(1);
        expect(getStrugglingWords([])).toEqual([]);
    });
});

// ── generateBlankQuestion ────────────────────────────────────────

describe('generateBlankQuestion', () => {
    it('returns parsed result on valid JSON response', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            sentence: 'Elle a accompli son objectif.',
            blankedSentence: 'Elle a _______ son objectif.',
            hint: 'to achieve',
            culturalNote: 'commonly used in professional contexts',
        }));

        const result = await generateBlankQuestion(makeWord(1, 'accomplir', 'to accomplish'), 'fr');
        expect(result).toEqual({
            sentence: 'Elle a accompli son objectif.',
            blankedSentence: 'Elle a _______ son objectif.',
            hint: 'to achieve',
            culturalNote: 'commonly used in professional contexts',
        });
    });

    it('strips markdown code fences from response', async () => {
        const payload = JSON.stringify({
            sentence: 'Ich lerne Deutsch.',
            blankedSentence: 'Ich _______ Deutsch.',
            hint: 'to learn',
            culturalNote: '',
        });
        aiService.chat.mockResolvedValue('```json\n' + payload + '\n```');

        const result = await generateBlankQuestion(makeWord(2, 'lernen', 'to learn'), 'de');
        expect(result).not.toBeNull();
        expect(result.blankedSentence).toBe('Ich _______ Deutsch.');
    });

    it('returns null when aiService.chat returns null', async () => {
        aiService.chat.mockResolvedValue(null);
        const result = await generateBlankQuestion(makeWord(3, 'casa', 'house'), 'es');
        expect(result).toBeNull();
    });

    it('returns null when response is not valid JSON', async () => {
        aiService.chat.mockResolvedValue('this is not json at all');
        const result = await generateBlankQuestion(makeWord(4, 'casa', 'house'), 'es');
        expect(result).toBeNull();
    });

    it('returns null when required fields are missing', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({ sentence: 'Hello' }));
        const result = await generateBlankQuestion(makeWord(5, 'bonjour', 'hello'), 'fr');
        expect(result).toBeNull();
    });

    it('returns null when targetWord has no front.main', async () => {
        const result = await generateBlankQuestion({ id: 6, front: {}, back: { main: 'hello' } }, 'es');
        expect(result).toBeNull();
    });

    it('defaults hint and culturalNote to empty strings', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            sentence: 'Le chat dort.',
            blankedSentence: 'Le _______ dort.',
        }));

        const result = await generateBlankQuestion(makeWord(7, 'chat', 'cat'), 'fr');
        expect(result.hint).toBe('');
        expect(result.culturalNote).toBe('');
    });

    it('passes originLang, signal, and opts to aiService.chat', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            sentence: 'Hola mundo.',
            blankedSentence: '_______ mundo.',
        }));
        const ctrl = new AbortController();

        await generateBlankQuestion(makeWord(8, 'hola', 'hello'), 'es', {
            originLang: 'de',
            signal: ctrl.signal,
            temperature: 0.5,
            maxTokens: 100,
        });

        expect(aiService.chat).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({ temperature: 0.5, maxTokens: 100, signal: ctrl.signal }),
        );
    });
});

// ── generateListeningPassage ──────────────────────────────────────

describe('generateListeningPassage', () => {
    it('returns parsed passage on valid response', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            passage: 'Bonjour, comment allez-vous? Je vais bien aujourd\'hui.',
            translation: 'Hello, how are you? I am doing well today.',
            contextClue: 'Listen for the greeting at the start.',
            wrongAnswers: ['Goodbye', 'Thank you', 'Sorry'],
        }));

        const result = await generateListeningPassage(makeWord(10, 'bonjour', 'hello'), 'fr');
        expect(result).toEqual({
            passage: 'Bonjour, comment allez-vous? Je vais bien aujourd\'hui.',
            translation: 'Hello, how are you? I am doing well today.',
            contextClue: 'Listen for the greeting at the start.',
            wrongAnswers: ['Goodbye', 'Thank you', 'Sorry'],
        });
    });

    it('defaults missing optional fields', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            passage: 'Ela come pão.',
        }));

        const result = await generateListeningPassage(makeWord(11, 'pão', 'bread'), 'pt');
        expect(result).not.toBeNull();
        expect(result.translation).toBe('');
        expect(result.contextClue).toBe('');
        expect(result.wrongAnswers).toEqual([]);
    });

    it('returns null when passage field is missing', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            translation: 'A translation without a passage.',
        }));

        const result = await generateListeningPassage(makeWord(12, 'hola', 'hello'), 'es');
        expect(result).toBeNull();
    });

    it('returns null on null chat response', async () => {
        aiService.chat.mockResolvedValue(null);
        const result = await generateListeningPassage(makeWord(13, 'casa', 'house'), 'es');
        expect(result).toBeNull();
    });

    it('returns null on invalid JSON', async () => {
        aiService.chat.mockResolvedValue('not json');
        const result = await generateListeningPassage(makeWord(14, 'casa', 'house'), 'es');
        expect(result).toBeNull();
    });

    it('returns null when targetWord has empty front.main', async () => {
        const result = await generateListeningPassage({ id: 15, front: { main: '' }, back: { main: 'house' } }, 'es');
        expect(result).toBeNull();
    });

    it('handles wrongAnswers as non-array gracefully', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            passage: 'Guten Morgen.',
            wrongAnswers: 'not an array',
        }));

        const result = await generateListeningPassage(makeWord(16, 'Morgen', 'morning'), 'de');
        expect(result).not.toBeNull();
        expect(result.wrongAnswers).toEqual([]);
    });
});

// ── generateComprehensionQuestions ────────────────────────────────

describe('generateComprehensionQuestions', () => {
    it('returns valid questions on proper response', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            questions: [
                { question: 'What does the passage say about Maria?', choices: ['She is tired', 'She is happy', 'She left', 'She cooked'], correctIndex: 1 },
                { question: 'Where does the passage take place?', choices: ['Park', 'School', 'Hospital', 'Restaurant'], correctIndex: 0 },
                { question: 'How is the weather described?', choices: ['Rainy', 'Sunny', 'Cold', 'Windy'], correctIndex: 2 },
            ],
        }));

        const result = await generateComprehensionQuestions('Un texto sobre Maria.', 'es');
        expect(result).toHaveLength(3);
        expect(result[0].correctIndex).toBe(1);
        expect(result[0].choices).toHaveLength(4);
    });

    it('filters out questions without exactly 4 choices', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            questions: [
                { question: 'Good Q', choices: ['A', 'B', 'C', 'D'], correctIndex: 0 },
                { question: 'Bad Q', choices: ['A', 'B'], correctIndex: 0 },
                { question: 'Another bad', choices: ['A', 'B', 'C', 'D', 'E'], correctIndex: 4 },
            ],
        }));

        const result = await generateComprehensionQuestions('Some passage.', 'es');
        expect(result).toHaveLength(1);
        expect(result[0].question).toBe('Good Q');
    });

    it('filters out questions with out-of-range correctIndex', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            questions: [
                { question: 'Valid', choices: ['A', 'B', 'C', 'D'], correctIndex: 2 },
                { question: 'Invalid index', choices: ['A', 'B', 'C', 'D'], correctIndex: 5 },
                { question: 'Negative index', choices: ['A', 'B', 'C', 'D'], correctIndex: -1 },
            ],
        }));

        const result = await generateComprehensionQuestions('Passage text.', 'fr');
        expect(result).toHaveLength(1);
        expect(result[0].correctIndex).toBe(2);
    });

    it('returns null when questions array is empty', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({ questions: [] }));
        const result = await generateComprehensionQuestions('Passage.', 'de');
        expect(result).toBeNull();
    });

    it('returns null when questions field is not an array', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({ questions: 'not an array' }));
        const result = await generateComprehensionQuestions('Passage.', 'de');
        expect(result).toBeNull();
    });

    it('returns null when aiService.chat returns null', async () => {
        aiService.chat.mockResolvedValue(null);
        const result = await generateComprehensionQuestions('Passage.', 'it');
        expect(result).toBeNull();
    });

    it('returns null on invalid JSON', async () => {
        aiService.chat.mockResolvedValue('broken {{{ json');
        const result = await generateComprehensionQuestions('Passage.', 'pt');
        expect(result).toBeNull();
    });

    it('passes opts through to aiService.chat', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            questions: [{ question: 'Q', choices: ['A', 'B', 'C', 'D'], correctIndex: 0 }],
        }));

        const ctrl = new AbortController();
        await generateComprehensionQuestions('Passage.', 'ja', {
            originLang: 'en',
            signal: ctrl.signal,
            temperature: 0.3,
            maxTokens: 200,
        });

        expect(aiService.chat).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({ temperature: 0.3, maxTokens: 200, signal: ctrl.signal }),
        );
    });

    it('returns empty array when all questions are filtered out', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            questions: [
                { question: 'Bad', choices: ['A'], correctIndex: 0 },
                { question: 'Also bad', choices: ['A', 'B'], correctIndex: 5 },
            ],
        }));

        const result = await generateComprehensionQuestions('Passage.', 'ko');
        expect(result).toEqual([]);
    });
});

// ── generateCulturalNote ──────────────────────────────────────────

describe('generateCulturalNote', () => {
    it('returns parsed note on valid response', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            note: 'In France, greeting with "bonjour" is essential before any conversation.',
            relatedPhrase: 'bonjour tout le monde',
        }));

        const result = await generateCulturalNote('Bonjour, comment allez-vous?', 'fr');
        expect(result).toEqual({
            note: 'In France, greeting with "bonjour" is essential before any conversation.',
            relatedPhrase: 'bonjour tout le monde',
        });
    });

    it('defaults relatedPhrase to empty string when missing', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            note: 'This word is used formally in German.',
        }));

        const result = await generateCulturalNote('Guten Tag.', 'de');
        expect(result).not.toBeNull();
        expect(result.relatedPhrase).toBe('');
    });

    it('returns null when note field is missing', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            relatedPhrase: 'some phrase',
        }));

        const result = await generateCulturalNote('Hola.', 'es');
        expect(result).toBeNull();
    });

    it('returns null when aiService.chat returns null', async () => {
        aiService.chat.mockResolvedValue(null);
        const result = await generateCulturalNote('Passage.', 'it');
        expect(result).toBeNull();
    });

    it('returns null on invalid JSON', async () => {
        aiService.chat.mockResolvedValue('not valid json');
        const result = await generateCulturalNote('Passage.', 'pt');
        expect(result).toBeNull();
    });

    it('strips markdown code fences', async () => {
        const payload = JSON.stringify({ note: 'Cultural insight.', relatedPhrase: '' });
        aiService.chat.mockResolvedValue('```json\n' + payload + '\n```');

        const result = await generateCulturalNote('Passage.', 'ja');
        expect(result).not.toBeNull();
        expect(result.note).toBe('Cultural insight.');
    });

    it('passes opts through to aiService.chat', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({ note: 'A note.' }));
        const ctrl = new AbortController();

        await generateCulturalNote('Passage.', 'ko', {
            originLang: 'de',
            signal: ctrl.signal,
            temperature: 0.4,
            maxTokens: 50,
        });

        expect(aiService.chat).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({ temperature: 0.4, maxTokens: 50, signal: ctrl.signal }),
        );
    });
});

// ── generateMnemonic ──────────────────────────────────────────────

describe('generateMnemonic', () => {
    it('returns parsed mnemonic on valid response', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            mnemonic: 'GATO sounds like "got oh" — imagine you "got oh!" a cat.',
            explanation: 'Sound association between the Spanish word and English phrase.',
        }));

        const result = await generateMnemonic(makeWord(20, 'gato', 'cat'), 'es');
        expect(result).toEqual({
            mnemonic: 'GATO sounds like "got oh" — imagine you "got oh!" a cat.',
            explanation: 'Sound association between the Spanish word and English phrase.',
        });
    });

    it('defaults explanation to empty string when missing', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            mnemonic: 'MAISON — think of your main house.',
        }));

        const result = await generateMnemonic(makeWord(21, 'maison', 'house'), 'fr');
        expect(result).not.toBeNull();
        expect(result.explanation).toBe('');
    });

    it('returns null when mnemonic field is missing', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            explanation: 'Some explanation without a mnemonic.',
        }));

        const result = await generateMnemonic(makeWord(22, 'Haus', 'house'), 'de');
        expect(result).toBeNull();
    });

    it('returns null when targetWord has no front.main', async () => {
        const result = await generateMnemonic({ id: 23, front: {}, back: { main: 'cat' } }, 'es');
        expect(result).toBeNull();
    });

    it('returns null when targetWord has empty front.main', async () => {
        const result = await generateMnemonic({ id: 24, front: { main: '' }, back: { main: 'cat' } }, 'es');
        expect(result).toBeNull();
    });

    it('returns null when aiService.chat returns null', async () => {
        aiService.chat.mockResolvedValue(null);
        const result = await generateMnemonic(makeWord(25, 'casa', 'house'), 'es');
        expect(result).toBeNull();
    });

    it('returns null on invalid JSON', async () => {
        aiService.chat.mockResolvedValue('garbage response');
        const result = await generateMnemonic(makeWord(26, 'casa', 'house'), 'es');
        expect(result).toBeNull();
    });

    it('uses fallback to back.definition when back.main is absent', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            mnemonic: 'Remember it this way.',
            explanation: 'Reason.',
        }));

        const result = await generateMnemonic({ id: 27, front: { main: 'gatto' }, back: { definition: 'cat' } }, 'it');
        expect(result).not.toBeNull();
        expect(result.mnemonic).toBe('Remember it this way.');
    });

    it('passes opts through to aiService.chat', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({ mnemonic: 'A mnemonic.' }));
        const ctrl = new AbortController();

        await generateMnemonic(makeWord(28, 'cão', 'dog'), 'pt', {
            originLang: 'fr',
            signal: ctrl.signal,
            temperature: 0.9,
            maxTokens: 64,
        });

        expect(aiService.chat).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({ temperature: 0.9, maxTokens: 64, signal: ctrl.signal }),
        );
    });
});

// ── generateSentenceExercise ──────────────────────────────────────

describe('generateSentenceExercise', () => {
    it('returns parsed exercise on valid response', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            sentence: 'Le chat mange du poisson.',
            translation: 'The cat eats fish.',
            words: ['Le', 'chat', 'mange', 'du', 'poisson'],
            hint: 'Subject-verb-object order',
        }));

        const result = await generateSentenceExercise(makeWord(30, 'chat', 'cat'), 'fr');
        expect(result).toEqual({
            sentence: 'Le chat mange du poisson.',
            translation: 'The cat eats fish.',
            words: ['Le', 'chat', 'mange', 'du', 'poisson'],
            hint: 'Subject-verb-object order',
        });
    });

    it('defaults translation and hint to empty strings when missing', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            sentence: 'El perro come.',
            words: ['El', 'perro', 'come'],
        }));

        const result = await generateSentenceExercise(makeWord(31, 'perro', 'dog'), 'es');
        expect(result).not.toBeNull();
        expect(result.translation).toBe('');
        expect(result.hint).toBe('');
    });

    it('returns null when sentence is missing', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            words: ['Hola', 'mundo'],
        }));

        const result = await generateSentenceExercise(makeWord(32, 'hola', 'hello'), 'es');
        expect(result).toBeNull();
    });

    it('returns null when words is not an array', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            sentence: 'Ciao mondo.',
            words: 'not an array',
        }));

        const result = await generateSentenceExercise(makeWord(33, 'ciao', 'hello'), 'it');
        expect(result).toBeNull();
    });

    it('returns null when words array is empty', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            sentence: 'Guten Tag.',
            words: [],
        }));

        const result = await generateSentenceExercise(makeWord(34, 'Tag', 'day'), 'de');
        expect(result).toBeNull();
    });

    it('returns null when targetWord has no front.main', async () => {
        const result = await generateSentenceExercise({ id: 35, front: {}, back: { main: 'house' } }, 'es');
        expect(result).toBeNull();
    });

    it('returns null when aiService.chat returns null', async () => {
        aiService.chat.mockResolvedValue(null);
        const result = await generateSentenceExercise(makeWord(36, 'casa', 'house'), 'es');
        expect(result).toBeNull();
    });

    it('returns null on invalid JSON', async () => {
        aiService.chat.mockResolvedValue('not json');
        const result = await generateSentenceExercise(makeWord(37, 'casa', 'house'), 'es');
        expect(result).toBeNull();
    });

    it('strips markdown code fences', async () => {
        const payload = JSON.stringify({
            sentence: 'O gato dorme.',
            translation: 'The cat sleeps.',
            words: ['O', 'gato', 'dorme'],
            hint: 'Simple present tense',
        });
        aiService.chat.mockResolvedValue('```json\n' + payload + '\n```');

        const result = await generateSentenceExercise(makeWord(38, 'gato', 'cat'), 'pt');
        expect(result).not.toBeNull();
        expect(result.sentence).toBe('O gato dorme.');
    });

    it('passes opts through to aiService.chat', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            sentence: 'Ich trinke Wasser.',
            words: ['Ich', 'trinke', 'Wasser'],
        }));
        const ctrl = new AbortController();

        await generateSentenceExercise(makeWord(39, 'trinken', 'to drink'), 'de', {
            originLang: 'en',
            signal: ctrl.signal,
            temperature: 0.6,
            maxTokens: 150,
        });

        expect(aiService.chat).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({ temperature: 0.6, maxTokens: 150, signal: ctrl.signal }),
        );
    });
});

// ── generateQuizQuestion ───────────────────────────────────────────

describe('generateQuizQuestion', () => {
    it('returns parsed quiz on valid response', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            question: 'What does "gato" mean?',
            correctAnswer: 'cat',
            choices: ['cat', 'dog', 'bird', 'fish'],
            correctIndex: 0,
        }));

        const result = await generateQuizQuestion(makeWord(40, 'gato', 'cat'), [], 'es');
        expect(result).toEqual({
            question: 'What does "gato" mean?',
            correctAnswer: 'cat',
            choices: ['cat', 'dog', 'bird', 'fish'],
            correctIndex: 0,
        });
    });

    it('falls back to choices[correctIndex] when correctAnswer is missing', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            question: 'What does "casa" mean?',
            choices: ['house', 'car', 'tree', 'book'],
            correctIndex: 0,
        }));

        const result = await generateQuizQuestion(makeWord(41, 'casa', 'house'), [], 'es');
        expect(result).not.toBeNull();
        expect(result.correctAnswer).toBe('house');
    });

    it('returns null when question is missing', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            choices: ['A', 'B', 'C', 'D'],
            correctIndex: 0,
        }));

        const result = await generateQuizQuestion(makeWord(42, 'chat', 'cat'), [], 'fr');
        expect(result).toBeNull();
    });

    it('returns null when choices has fewer than 2 items', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            question: 'What does this mean?',
            choices: ['only one'],
            correctIndex: 0,
        }));

        const result = await generateQuizQuestion(makeWord(43, 'Hund', 'dog'), [], 'de');
        expect(result).toBeNull();
    });

    it('returns null when correctIndex is not a number', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            question: 'What does this mean?',
            choices: ['A', 'B', 'C', 'D'],
            correctIndex: 'zero',
        }));

        const result = await generateQuizQuestion(makeWord(44, 'cane', 'dog'), [], 'it');
        expect(result).toBeNull();
    });

    it('returns null when correctIndex is out of range', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            question: 'What does this mean?',
            choices: ['A', 'B'],
            correctIndex: 5,
        }));

        const result = await generateQuizQuestion(makeWord(45, 'cão', 'dog'), [], 'pt');
        expect(result).toBeNull();
    });

    it('returns null when correctIndex is negative', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            question: 'What does this mean?',
            choices: ['A', 'B'],
            correctIndex: -1,
        }));

        const result = await generateQuizQuestion(makeWord(46, 'neko', 'cat'), [], 'ja');
        expect(result).toBeNull();
    });

    it('returns null when targetWord has no front.main', async () => {
        const result = await generateQuizQuestion({ id: 47, front: {}, back: { main: 'house' } }, [], 'es');
        expect(result).toBeNull();
    });

    it('returns null when aiService.chat returns null', async () => {
        aiService.chat.mockResolvedValue(null);
        const result = await generateQuizQuestion(makeWord(48, 'casa', 'house'), [], 'es');
        expect(result).toBeNull();
    });

    it('returns null on invalid JSON', async () => {
        aiService.chat.mockResolvedValue('bad json here');
        const result = await generateQuizQuestion(makeWord(49, 'casa', 'house'), [], 'es');
        expect(result).toBeNull();
    });

    it('uses distractor definitions when provided', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            question: 'What does "maison" mean?',
            correctAnswer: 'house',
            choices: ['house', 'building', 'garden', 'car'],
            correctIndex: 0,
        }));

        const distractors = [
            { id: 2, back: { definition: 'building' } },
            { id: 3, back: { definition: 'garden' } },
        ];
        const result = await generateQuizQuestion(makeWord(50, 'maison', 'house'), distractors, 'fr');
        expect(result).not.toBeNull();
        expect(result.question).toBe('What does "maison" mean?');

        const callMessages = aiService.chat.mock.calls[0][0];
        const userMsg = callMessages[1].content;
        expect(userMsg).toContain('building');
        expect(userMsg).toContain('garden');
    });

    it('generates no-distractor prompt when distractors are empty', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            question: 'What does "Haus" mean?',
            correctAnswer: 'house',
            choices: ['house', 'car', 'tree', 'book'],
            correctIndex: 0,
        }));

        await generateQuizQuestion(makeWord(51, 'Haus', 'house'), [], 'de');

        const callMessages = aiService.chat.mock.calls[0][0];
        const userMsg = callMessages[1].content;
        expect(userMsg).toContain('Generate 3 plausible but clearly wrong answer choices');
    });

    it('limits distractors to first 3', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            question: 'Q?',
            correctAnswer: 'house',
            choices: ['house', 'a', 'b', 'c'],
            correctIndex: 0,
        }));

        const distractors = [
            { id: 1, back: { definition: 'first' } },
            { id: 2, back: { definition: 'second' } },
            { id: 3, back: { definition: 'third' } },
            { id: 4, back: { definition: 'fourth' } },
        ];
        await generateQuizQuestion(makeWord(52, 'casa', 'house'), distractors, 'es');

        const callMessages = aiService.chat.mock.calls[0][0];
        const userMsg = callMessages[1].content;
        expect(userMsg).toContain('first');
        expect(userMsg).toContain('second');
        expect(userMsg).toContain('third');
        expect(userMsg).not.toContain('fourth');
    });

    it('strips markdown code fences', async () => {
        const payload = JSON.stringify({
            question: 'What does "sol" mean?',
            correctAnswer: 'sun',
            choices: ['sun', 'moon', 'star', 'rain'],
            correctIndex: 0,
        });
        aiService.chat.mockResolvedValue('```json\n' + payload + '\n```');

        const result = await generateQuizQuestion(makeWord(53, 'sol', 'sun'), [], 'es');
        expect(result).not.toBeNull();
        expect(result.question).toBe('What does "sol" mean?');
    });

    it('passes opts through to aiService.chat', async () => {
        aiService.chat.mockResolvedValue(JSON.stringify({
            question: 'Q?',
            correctAnswer: 'cat',
            choices: ['cat', 'dog', 'bird', 'fish'],
            correctIndex: 0,
        }));
        const ctrl = new AbortController();

        await generateQuizQuestion(makeWord(54, 'gato', 'cat'), [], 'es', {
            originLang: 'de',
            signal: ctrl.signal,
            temperature: 0.5,
            maxTokens: 100,
        });

        expect(aiService.chat).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({ temperature: 0.5, maxTokens: 100, signal: ctrl.signal }),
        );
    });
});