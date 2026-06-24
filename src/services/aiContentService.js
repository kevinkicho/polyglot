import { aiService } from './aiService';
import { srsService } from './srsService';

const LANG_NAMES = {
    aa: 'Afar', ab: 'Abkhazian', af: 'Afrikaans', ak: 'Akan', am: 'Amharic',
    an: 'Aragonese', ar: 'Arabic', as: 'Assamese', av: 'Avaric', ay: 'Aymara',
    az: 'Azerbaijani', ba: 'Bashkir', be: 'Belarusian', bg: 'Bulgarian', bh: 'Bihari',
    bi: 'Bislama', bm: 'Bambara', bn: 'Bengali', bo: 'Tibetan', br: 'Breton',
    bs: 'Bosnian', ca: 'Catalan', ce: 'Chechen', ch: 'Chamorro', co: 'Corsican',
    cr: 'Cree', cs: 'Czech', cu: 'Church Slavic', cv: 'Chuvash', cy: 'Welsh',
    da: 'Danish', de: 'German', dv: 'Divehi', dz: 'Dzongkha', ee: 'Ewe',
    el: 'Greek', en: 'English', eo: 'Esperanto', es: 'Spanish', et: 'Estonian',
    eu: 'Basque', fa: 'Persian', ff: 'Fulah', fi: 'Finnish', fj: 'Fijian',
    fo: 'Faroese', fr: 'French', fy: 'Western Frisian', ga: 'Irish', gd: 'Scottish Gaelic',
    gl: 'Galician', gn: 'Guarani', gu: 'Gujarati', gv: 'Manx', ha: 'Hausa',
    he: 'Hebrew', hi: 'Hindi', ho: 'Hiri Motu', hr: 'Croatian', ht: 'Haitian',
    hu: 'Hungarian', hy: 'Armenian', hz: 'Herero', ia: 'Interlingua', id: 'Indonesian',
    ie: 'Interlingue', ig: 'Igbo', ii: 'Sichuan Yi', ik: 'Inupiaq', io: 'Ido',
    is: 'Icelandic', it: 'Italian', iu: 'Inuktitut', ja: 'Japanese', jv: 'Javanese',
    ka: 'Georgian', kg: 'Kongo', ki: 'Kikuyu', kk: 'Kazakh', kl: 'Kalaallisut',
    km: 'Khmer', kn: 'Kannada', ko: 'Korean', kr: 'Kanuri', ks: 'Kashmiri',
    ku: 'Kurdish', kv: 'Komi', kw: 'Cornish', ky: 'Kirghiz', la: 'Latin',
    lb: 'Luxembourgish', lg: 'Ganda', li: 'Limburgish', ln: 'Lingala', lo: 'Lao',
    lt: 'Lithuanian', lu: 'Luba-Katanga', lv: 'Latvian', mg: 'Malagasy', mh: 'Marshallese',
    mi: 'Maori', mk: 'Macedonian', ml: 'Malayalam', mn: 'Mongolian', mr: 'Marathi',
    ms: 'Malay', mt: 'Maltese', my: 'Burmese', na: 'Nauru', nb: 'Norwegian Bokmål',
    nd: 'North Ndebele', ne: 'Nepali', ng: 'Ndonga', nl: 'Dutch', nn: 'Norwegian Nynorsk',
    no: 'Norwegian', nr: 'South Ndebele', nv: 'Navajo', ny: 'Chichewa', oc: 'Occitan',
    oj: 'Ojibwa', om: 'Oromo', or: 'Oriya', os: 'Ossetian', pa: 'Panjabi',
    pi: 'Pali', pl: 'Polish', ps: 'Pashto', pt: 'Portuguese', qu: 'Quechua',
    rm: 'Romansh', rn: 'Rundi', ro: 'Romanian', ru: 'Russian', rw: 'Kinyarwanda',
    sa: 'Sanskrit', sc: 'Sardinian', sd: 'Sindhi', se: 'Northern Sami', sg: 'Sango',
    si: 'Sinhala', sk: 'Slovak', sl: 'Slovenian', sm: 'Samoan', sn: 'Shona',
    so: 'Somali', sq: 'Albanian', sr: 'Serbian', ss: 'Swati', st: 'Southern Sotho',
    su: 'Sundanese', sv: 'Swedish', sw: 'Swahili', ta: 'Tamil', te: 'Telugu',
    tg: 'Tajik', th: 'Thai', ti: 'Tigrinya', tk: 'Turkmen', tl: 'Tagalog',
    tn: 'Tswana', to: 'Tonga', tr: 'Turkish', ts: 'Tsonga', tt: 'Tatar',
    tw: 'Twi', ty: 'Tahitian', ug: 'Uighur', uk: 'Ukrainian', ur: 'Urdu',
    uz: 'Uzbek', ve: 'Venda', vi: 'Vietnamese', vo: 'Volapük', wa: 'Walloon',
    wo: 'Wolof', xh: 'Xhosa', yi: 'Yiddish', yo: 'Yoruba', za: 'Zhuang',
    zh: 'Chinese', zu: 'Zulu',
};

function buildPrompt(word, wordText, meaningText, targetLang, originLang) {
    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;
    return `You are a language learning content generator. Create a fill-in-the-blank exercise for the word "${wordText}" (meaning: ${meaningText}) in ${targetName}.

Rules:
- Write a natural, realistic sentence in ${targetName} that uses the word "${wordText}"
- The sentence should be at a beginner-intermediate level (i+1 comprehensible input)
- Replace the word with underscores to create the blanked version
- Provide a short hint in ${originName} that helps the student without giving away the answer
- Optionally include a brief cultural/usage note about the word

Respond with ONLY valid JSON, no other text:
{"sentence":"full sentence with the word","blankedSentence":"sentence with _______ replacing the word","hint":"a short hint in ${originName}","culturalNote":"brief note or empty string"}`;
}

export function getStrugglingWords(vocabList) {
    return vocabList.filter(item => srsService.getBox(item.id) <= 3);
}

export async function generateBlankQuestion(targetWord, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const messages = [
        { role: 'system', content: `You are a language exercise generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: buildPrompt(targetWord, wordText, meaningText, targetLang, originLang) },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 256,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!parsed.sentence || !parsed.blankedSentence) return null;

        return {
            sentence: parsed.sentence,
            blankedSentence: parsed.blankedSentence,
            hint: parsed.hint || '',
            culturalNote: parsed.culturalNote || '',
        };
    } catch (e) {
        return null;
    }
}

export async function generateListeningPassage(targetWord, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language exercise generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Create a short listening comprehension passage in ${targetName} for the word "${wordText}" (meaning: ${meaningText}).

Rules:
- Write 2-3 natural sentences in ${targetName} at beginner-intermediate level (i+1 comprehensible input)
- The word "${wordText}" must appear in the passage
- The passage should be suitable for listening practice: clear, conversational, not too fast-paced
- Provide a translation of the full passage in ${originName}
- Provide 3 wrong answer options in ${originName} that are plausible but clearly different from the real meaning
- Provide a brief context clue that would help a student identify the word from listening

Respond with ONLY valid JSON:
{"passage":"the full passage in ${targetName}","translation":"full translation in ${originName}","contextClue":"a brief listening tip in ${originName}","wrongAnswers":["wrong1","wrong2","wrong3"]}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 256,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!parsed.passage) return null;

        return {
            passage: parsed.passage,
            translation: parsed.translation || '',
            contextClue: parsed.contextClue || '',
            wrongAnswers: Array.isArray(parsed.wrongAnswers) ? parsed.wrongAnswers : [],
        };
    } catch (e) {
        return null;
    }
}

export async function generateComprehensionQuestions(passageText, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language exercise generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Based on this ${targetName} passage, create 3 comprehension questions.

Passage: "${passageText}"

Rules:
- Each question should test understanding of the passage
- Questions should be in ${originName}
- Each question has exactly 4 choices in ${originName}
- One choice is correct (indicated by correctIndex 0-3)
- Questions should range from factual recall to inference

Respond with ONLY valid JSON:
{"questions":[{"question":"question text","choices":["choice A","choice B","choice C","choice D"],"correctIndex":0},{"question":"...","choices":["..."],"correctIndex":1},{"question":"...","choices":["..."],"correctIndex":2}]}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.6,
        maxTokens: opts.maxTokens ?? 384,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;

        return parsed.questions.filter(q =>
            typeof q.question === 'string' &&
            Array.isArray(q.choices) && q.choices.length === 4 &&
            typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3
        );
    } catch (e) {
        return null;
    }
}

export async function generateCulturalNote(passageText, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language and culture expert. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Given this ${targetName} passage, write a brief cultural note about any idioms, customs, or cultural context a learner should know.

Passage: "${passageText}"

Rules:
- The note should be 1-2 sentences in ${originName}, explaining a cultural nuance, idiom, or custom related to the passage
- Also provide a related ${targetName} phrase or expression that connects to the same cultural theme

Respond with ONLY valid JSON:
{"note":"brief cultural explanation in ${originName}","relatedPhrase":"a related ${targetName} phrase or expression"}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 128,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!parsed.note) return null;

        return {
            note: parsed.note,
            relatedPhrase: parsed.relatedPhrase || '',
        };
    } catch (e) {
        return null;
    }
}

export async function generateMnemonic(targetWord, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language learning expert. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Create a memorable mnemonic or memory aid for the ${targetName} word "${wordText}" (meaning: ${meaningText}).

Rules:
- The mnemonic should help a ${originName} speaker remember the word "${wordText}"
- Use vivid imagery, wordplay, sound associations, or cultural connections
- Keep the mnemonic short and catchy (1 sentence)
- Provide a brief explanation of why the mnemonic works

Respond with ONLY valid JSON:
{"mnemonic":"short catchy mnemonic in ${originName}","explanation":"brief explanation of why it helps remember"}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.8,
        maxTokens: opts.maxTokens ?? 128,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!parsed.mnemonic) return null;

        return {
            mnemonic: parsed.mnemonic,
            explanation: parsed.explanation || '',
        };
    } catch (e) {
        return null;
    }
}

export async function generateSentenceExercise(targetWord, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language learning content generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Create a sentence construction exercise for the ${targetName} word "${wordText}" (meaning: ${meaningText}).

Rules:
- Write a natural, realistic sentence in ${targetName} at beginner-intermediate level that uses the word "${wordText}"
- Provide a translation of the sentence in ${originName}
- Split the sentence into individual words/tokens in ${targetName} order
- Do NOT add any words that are not in the original sentence
- Provide a short hint in ${originName} about the sentence structure or word order

Respond with ONLY valid JSON:
{"sentence":"full sentence in ${targetName}","translation":"translation in ${originName}","words":["word1","word2","word3"],"hint":"short hint in ${originName}"}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 256,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!parsed.sentence || !Array.isArray(parsed.words) || parsed.words.length === 0) return null;

        return {
            sentence: parsed.sentence,
            translation: parsed.translation || '',
            words: parsed.words,
            hint: parsed.hint || '',
        };
    } catch (e) {
        return null;
    }
}

export async function generateQuizQuestion(targetWord, distractors, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const distractorTexts = (distractors || []).slice(0, 3).map(d =>
        d.back?.definition || d.back?.main || ''
    ).filter(Boolean);

    const distractorPrompt = distractorTexts.length > 0
        ? `Use these distractor meanings as wrong answers where appropriate: ${distractorTexts.join(', ')}. You may also generate additional plausible wrong answers.`
        : 'Generate 3 plausible but clearly wrong answer choices.';

    const messages = [
        { role: 'system', content: `You are a language quiz generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Create a quiz question for the ${targetName} word "${wordText}" (meaning: ${meaningText}).

Rules:
- Write a clear question in ${originName} that asks the learner to identify the meaning of "${wordText}"
- The correct answer must be: "${meaningText}"
- ${distractorPrompt}
- Wrong answers must be plausible but clearly different from the correct answer
- Shuffle the answer order randomly

Respond with ONLY valid JSON:
{"question":"the quiz question in ${originName}","correctAnswer":"${meaningText}","choices":["${meaningText}","wrong1","wrong2","wrong3"],"correctIndex":0}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 256,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!parsed.question || !Array.isArray(parsed.choices) || parsed.choices.length < 2 || typeof parsed.correctIndex !== 'number') return null;
        if (parsed.correctIndex < 0 || parsed.correctIndex >= parsed.choices.length) return null;

        return {
            question: parsed.question,
            correctAnswer: parsed.correctAnswer || parsed.choices[parsed.correctIndex],
            choices: parsed.choices,
            correctIndex: parsed.correctIndex,
        };
    } catch (e) {
        return null;
    }
}

export async function generateTrueFalseStatement(targetWord, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language learning assessment generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Create a true/false statement for the ${targetName} word "${wordText}" (meaning: ${meaningText}).

Rules:
- Randomly decide whether the statement should be true or false
- If TRUE: write a factual statement in ${originName} that correctly describes the meaning of "${wordText}"
- If FALSE: write a plausible-sounding but incorrect statement in ${originName} about the word "${wordText}"
- The statement must be clearly and unambiguously either true or false
- Do NOT make it a trick question — the truth value should be unambiguous
- For FALSE statements, make the error meaningful (not just a swapped word), but still educationally useful

Respond with ONLY valid JSON:
{"statement":"the statement in ${originName}","isTrue":true_or_false,"explanation":"brief explanation of why it is true or false in ${originName}"}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 200,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!parsed.statement || typeof parsed.isTrue !== 'boolean') return null;

        return {
            statement: parsed.statement,
            isTrue: parsed.isTrue,
            explanation: parsed.explanation || '',
        };
    } catch (e) {
        return null;
    }
}

export async function generateConstructorExercise(targetWord, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language learning content generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Create a character construction exercise for the ${targetName} word "${wordText}" (meaning: ${meaningText}).

Rules:
- The word "${wordText}" must be the target the learner needs to spell
- Provide the individual characters of "${wordText}" in ${targetName} order
- Provide a hint in ${originName} about the word's meaning or usage
- If the language uses characters (like Japanese/CJK), break into meaningful sub-units or individual characters
- If the language uses an alphabet, break into individual letters

Respond with ONLY valid JSON:
{"word":"${wordText}","characters":["char1","char2","char3"],"hint":"short hint in ${originName} about what this word means or how it is used"}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.6,
        maxTokens: opts.maxTokens ?? 128,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!parsed.word || !Array.isArray(parsed.characters) || parsed.characters.length === 0) return null;

        return {
            word: parsed.word,
            characters: parsed.characters,
            hint: parsed.hint || '',
        };
    } catch (e) {
        return null;
    }
}

export async function generateFlashcardContent(targetWord, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language learning content generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Create flashcard enrichment content for the ${targetName} word "${wordText}" (meaning: ${meaningText}).

Rules:
- Write a natural example sentence in ${targetName} that uses "${wordText}" in context
- Provide a translation of the sentence in ${originName}
- Give a short contextual hint in ${originName} about when or how the word is used
- Provide a brief cultural note in ${originName} about the word's usage or significance

Respond with ONLY valid JSON:
{"exampleSentence":"sentence in ${targetName} using ${wordText}","exampleTranslation":"translation in ${originName}","hint":"contextual hint in ${originName}","culturalNote":"brief cultural note in ${originName}"}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 256,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!parsed.exampleSentence) return null;

        return {
            exampleSentence: parsed.exampleSentence,
            exampleTranslation: parsed.exampleTranslation || '',
            hint: parsed.hint || '',
            culturalNote: parsed.culturalNote || '',
        };
    } catch (e) {
        return null;
    }
}

export async function generateMatchPairs(targetWord, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language learning content generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Create a set of 6 matching pairs for a memory card game about the ${targetName} word "${wordText}" (meaning: ${meaningText}).

Rules:
- Include "${wordText}" as one of the words
- Provide 5 additional related ${targetName} words that are thematically connected to "${wordText}"
- For each word, give the ${targetName} word and its ${originName} definition
- Words should be at a beginner-intermediate level
- Pairs must be distinct and not confusing with each other

Respond with ONLY valid JSON:
{"pairs":[{"word":"word in ${targetName}","definition":"definition in ${originName}"},{"word":"word2","definition":"def2"},{"word":"word3","definition":"def3"},{"word":"word4","definition":"def4"},{"word":"word5","definition":"def5"},{"word":"word6","definition":"def6"}]}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 256,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!Array.isArray(parsed.pairs) || parsed.pairs.length < 4) return null;

        const validPairs = parsed.pairs.filter(p => p.word && p.definition);
        if (validPairs.length < 4) return null;

        return { pairs: validPairs.slice(0, 6) };
    } catch (e) {
        return null;
    }
}

export async function generateMemoryPairs(targetWord, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language learning content generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Create a set of 6 word-translation pairs for a memory card game about the ${targetName} word "${wordText}" (meaning: ${meaningText}).

Rules:
- Include "${wordText}" as one of the words
- Provide 5 additional related ${targetName} words that are thematically connected to "${wordText}"
- For each word, give the ${targetName} word and its ${originName} translation
- Words should be at a beginner-intermediate level
- Pairs must be distinct and not confusing with each other

Respond with ONLY valid JSON:
{"pairs":[{"word":"${wordText}","translation":"${meaningText}"},{"word":"word2","translation":"translation2"},{"word":"word3","translation":"translation3"},{"word":"word4","translation":"translation4"},{"word":"word5","translation":"translation5"},{"word":"word6","translation":"translation6"}]}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 256,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!Array.isArray(parsed.pairs) || parsed.pairs.length < 4) return null;

        const validPairs = parsed.pairs.filter(p => p.word && p.translation);
        if (validPairs.length < 4) return null;

        return { pairs: validPairs.slice(0, 6) };
    } catch (e) {
        return null;
    }
}

export async function generateFinderExercise(targetWord, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language learning content generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Create a "find the word" exercise for the ${targetName} word "${wordText}" (meaning: ${meaningText}).

Rules:
- "${wordText}" must be one of the choices and must be the correct answer
- Provide 8 other plausible ${targetName} words that are NOT the correct answer — they should be related but clearly different
- The distractor words should be at a similar difficulty level and not too similar to the correct answer
- Shuffle the order randomly so the correct answer is not always in the same position

Respond with ONLY valid JSON:
{"prompt":"a short question or clue in ${originName} about the word","correctWord":"${wordText}","correctMeaning":"${meaningText}","choices":["${wordText}","distractor1","distractor2","distractor3","distractor4","distractor5","distractor6","distractor7","distractor8"]}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 256,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!parsed.prompt || !parsed.correctWord || !Array.isArray(parsed.choices) || parsed.choices.length < 4) return null;

        return {
            prompt: parsed.prompt,
            correctWord: parsed.correctWord,
            correctMeaning: parsed.correctMeaning || meaningText,
            choices: parsed.choices.slice(0, 9),
        };
    } catch (e) {
        return null;
    }
}

export async function generateReverseExercise(targetWord, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language learning content generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Create a reverse translation exercise for the ${targetName} word "${wordText}" (meaning in ${originName}: ${meaningText}).

Rules:
- Write a question/prompt in ${originName} asking the learner to find the ${targetName} translation
- "${wordText}" must be the correct answer
- Provide 3 plausible but wrong ${targetName} distractor words that are related but not correct
- Shuffle the choices randomly

Respond with ONLY valid JSON:
{"prompt":"question in ${originName}","correctWord":"${wordText}","correctMeaning":"${meaningText}","distractors":["wrong1","wrong2","wrong3"]}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 200,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!parsed.prompt || !parsed.correctWord || !Array.isArray(parsed.distractors) || parsed.distractors.length < 2) return null;

        return {
            prompt: parsed.prompt,
            correctWord: parsed.correctWord,
            correctMeaning: parsed.correctMeaning || meaningText,
            distractors: parsed.distractors.slice(0, 3),
        };
    } catch (e) {
        return null;
    }
}

export async function generateDecoderExercise(targetWord, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language learning content generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Create a decoder/spelling exercise for the ${targetName} word "${wordText}" (meaning: ${meaningText}).

Rules:
- The word "${wordText}" must be the target the learner needs to spell
- Provide the individual characters of "${wordText}" in ${targetName} order, split into a characters array
- Remove any punctuation, spaces, or special characters from the characters array
- Provide a hint in ${originName} about the word's meaning

Respond with ONLY valid JSON:
{"word":"${wordText}","characters":["char1","char2","char3"],"hint":"short hint in ${originName}"}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.6,
        maxTokens: opts.maxTokens ?? 128,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!parsed.word || !Array.isArray(parsed.characters) || parsed.characters.length === 0) return null;

        return {
            word: parsed.word,
            characters: parsed.characters,
            hint: parsed.hint || '',
        };
    } catch (e) {
        return null;
    }
}

export async function generateGravityExercise(targetWord, targetLang, opts = {}) {
    const originLang = opts.originLang || 'en';
    const wordText = targetWord.front?.main || '';
    const meaningText = targetWord.back?.main || targetWord.back?.definition || '';

    if (!wordText) return null;

    const originName = LANG_NAMES[originLang] || originLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const messages = [
        { role: 'system', content: `You are a language learning content generator. Always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.` },
        { role: 'user', content: `Create a gravity-style vocabulary exercise for the ${targetName} word "${wordText}" (meaning: ${meaningText}).

Rules:
- "${wordText}" must be one of the words the learner needs to match
- Provide the ${originName} meaning that should be displayed as a target
- Provide 2 additional ${originName} meanings as distractor targets that are related but different
- Provide 5 additional ${targetName} distractor words that are plausible but wrong

Respond with ONLY valid JSON:
{"targetMeaning":"${meaningText}","distractorMeanings":["meaning1","meaning2"],"targetWord":"${wordText}","distractorWords":["word1","word2","word3","word4","word5"]}` },
    ];

    const response = await aiService.chat(messages, {
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 256,
        signal: opts.signal ?? null,
    });

    if (!response) return null;

    try {
        let cleaned = response.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) cleaned = fenceMatch[1].trim();

        const parsed = JSON.parse(cleaned);

        if (!parsed.targetMeaning || !parsed.targetWord || !Array.isArray(parsed.distractorMeanings) || parsed.distractorMeanings.length < 2 || !Array.isArray(parsed.distractorWords) || parsed.distractorWords.length < 3) return null;

        return {
            targetMeaning: parsed.targetMeaning,
            distractorMeanings: parsed.distractorMeanings.slice(0, 2),
            targetWord: parsed.targetWord,
            distractorWords: parsed.distractorWords.slice(0, 5),
        };
    } catch (e) {
        return null;
    }
}
