import { settingsService } from '../services/settingsService';
import { vocabService } from '../services/vocabService';
import { srsService } from '../services/srsService';
import { escapeHTML } from '../utils/sanitize';
import { audioService } from '../services/audioService';
import { db, ref, get, set, auth } from '../services/firebase';

const LANG_NAMES = {
    ja: 'Japanese', ko: 'Korean', zh: 'Chinese', en: 'English',
    ru: 'Russian', fr: 'French', it: 'Italian', es: 'Spanish',
    pt: 'Portuguese', de: 'German'
};

const SPEECH_LANG_CODES = {
    'en': 'en-US', 'ja': 'ja-JP', 'ko': 'ko-KR', 'zh': 'zh-CN',
    'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'it': 'it-IT',
    'pt': 'pt-PT', 'ru': 'ru-RU'
};

const CHAT_MODES = [
    { id: 'conversation', label: 'Conversation', icon: '💬', desc: 'Practice chatting in your target language' },
    { id: 'reading', label: 'Guided Reading', icon: '📖', desc: 'Read graded passages with AI support' },
    { id: 'grammar', label: 'Grammar', icon: '📐', desc: 'Learn grammar rules and patterns' },
    { id: 'vocabulary', label: 'Word Explorer', icon: '🔍', desc: 'Deep dive into words you\'re learning' },
    { id: 'stories', label: 'Stories', icon: '📚', desc: 'Read short stories with new vocab' },
    { id: 'roleplay', label: 'Role Play', icon: '🎭', desc: 'Practice real-life scenarios' },
    { id: 'pronunciation', label: 'Pronunciation', icon: '🗣️', desc: 'Speak and get feedback on your accent' },
    { id: 'freeform', label: 'Free Chat', icon: '✨', desc: 'Ask anything about the language' },
];

const INTERLEAVED_PROMPTS = [
    'By the way, can you use one of the vocabulary words I\'m learning in a short sentence?',
    'Quick challenge: try to say something using one of your struggling words!',
    'Here\'s a mini quiz: what does **{word}** mean? (I\'ll tell you if you\'re right!)',
    'Before we continue — can you recall how to say **{meaning}** in {target}?',
    'Let me sneak in a review word: how would you use **{word}** in a sentence?',
];

export class ChatApp {
    constructor() {
        this.container = null;
        this.messages = [];
        this.currentMode = null;
        this.isStreaming = false;
        this.abortController = null;
        this.recognition = null;
        this.isListening = false;
        this.speechSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        this._chatDbRef = null;
        this._turnCount = 0;
        this._lastInterleave = 0;
        this._streamingMsgIdx = -1;
        this._streamBuf = '';
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        if (!this.container) return;
        this.messages = [];
        this.currentMode = null;
        this._turnCount = 0;
        this._lastInterleave = 0;
        this._streamingMsgIdx = -1;
        this._streamBuf = '';
        this.renderModeSelector();
        this._loadHistory();
    }

    unmount() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        if (this.recognition && this.isListening) {
            try { this.recognition.stop(); } catch (e) {}
        }
        this.isListening = false;
        if (this._chatDbRef) {
            this._chatDbRef = null;
        }
        this.isStreaming = false;
        this.container = null;
    }

    refresh() {}
    next() {}
    prev() {}
    random() {}

    getApiConfig() {
        const s = settingsService.get();
        return {
            url: s.llmApiUrl.replace(/\/+$/, ''),
            model: s.llmModel || 'gemma4:31b-cloud',
        };
    }

    getVocabContext() {
        const all = vocabService.getAll();
        if (!all.length) return '';

        const withSrs = all.map(item => ({
            ...item,
            box: srsService.getBox(item.id)
        }));

        const struggling = withSrs.filter(i => i.box <= 2).slice(0, 10);
        const sample = [...all].sort(() => 0.5 - Math.random()).slice(0, 10);

        let ctx = '';
        if (struggling.length) {
            ctx += '\n\nWords the student is struggling with (use these often for review):\n';
            struggling.forEach(w => {
                ctx += `- ${w.front?.main || ''} = ${w.back?.main || w.back?.definition || ''}\n`;
            });
        }
        if (sample.length) {
            ctx += '\nOther vocabulary the student is learning:\n';
            sample.forEach(w => {
                ctx += `- ${w.front?.main || ''} = ${w.back?.main || w.back?.definition || ''}\n`;
            });
        }
        return ctx;
    }

    buildSystemPrompt(mode) {
        const s = settingsService.get();
        const target = LANG_NAMES[s.targetLang] || s.targetLang;
        const origin = LANG_NAMES[s.originLang] || s.originLang;
        const vocabCtx = this.getVocabContext();

        const base = `You are a friendly, encouraging ${target} language tutor. The student speaks ${origin} and is learning ${target}.

CORE PRINCIPLES (follow these strictly):
1. Comprehensible Input (Krashen's i+1): Always write slightly above the student's current level — one step beyond what they can comfortably read, but still understandable from context. If they seem overwhelmed, simplify. If they breeze through, increase complexity slightly.
2. Recast, don't correct: When the student makes a mistake, respond naturally using the correct form rather than saying "You made an error." Example: if they say "I go to store" you reply "Oh, you went to the store? What did you buy?" This is more effective than explicit correction.
3. Contextual learning: Embed vocabulary in meaningful, realistic contexts. Never present isolated words without context.
4. Active recall: Ask questions that prompt the student to produce ${target}, not just recognize it. Encourage them to speak or write in ${target}.
5. Interleaved practice: Occasionally weave in review of earlier vocabulary and grammar within new material.

FORMAT RULES:
- Use ${target} script naturally (not romanization) when writing in ${target}
- Provide ${origin} translations in parentheses for ${target} words/phrases the student might not know
- Keep responses concise (2-4 paragraphs max)
- Celebrate progress and gently recast mistakes`;

        const modeInstructions = {
            conversation: `CONVERSATION MODE:
- Start a natural conversation in ${target}, keeping it simple at first
- Adapt difficulty using i+1: if the student responds easily, introduce slightly more complex structures
- If they reply in ${origin}, gently encourage them to try in ${target} by providing a partial template: "Try saying: ___"
- Every 4-6 turns, pause the conversation and ask the student to repeat or paraphrase what you said in their own words (this tests comprehension)
- Suggest useful phrases they can use right now
- Mix ${target} and ${origin} naturally — use more ${target} as they improve
- Periodically (every 5-7 turns) weave in a review question about vocabulary from their learning list`,

            reading: `GUIDED READING MODE:
- Generate a short graded reading passage (3-5 paragraphs) in ${target}
- The passage should be at i+1 level: mostly comprehensible with a few new words guessable from context
- Include 2-3 words from the student's vocabulary list in the passage
- After the passage, provide:
  1. A vocabulary breakdown of key/new words with translations
  2. 3 comprehension questions (mix of factual and inferential) in ${target}
  3. A "Read Aloud" prompt encouraging the student to read a paragraph aloud
- If the student asks for help, explain words using context clues, not direct translation first
- After they answer comprehension questions, provide gentle feedback and recast any mistakes
- Adapt difficulty: if they get all questions right, make the next passage slightly harder; if they struggle, simplify
- Read passages should feel like real content (stories, articles, dialogues), not textbook exercises`,

            grammar: `GRAMMAR MODE:
- Teach ${target} grammar in a clear, fun way using Krashen's natural approach
- Present grammar as patterns first (input), then ask the student to notice the rule themselves (induction)
- Steps: 1) Show 3 example sentences with the pattern highlighted, 2) Ask "What pattern do you notice?", 3) Give the formula, 4) Ask them to produce their own sentence
- Use the student's vocabulary in examples for contextual learning
- After teaching a pattern, immediately use it in a short conversation to reinforce
- Never present more than one grammar point at a time
- Start by asking what grammar topic interests them, or suggest one based on their vocab level`,

            vocabulary: `VOCABULARY EXPLORER MODE:
- Help the student explore words deeply using contextual and associative learning
- For each word, explain: common collocations, related words, usage in different contexts, cultural nuances, and common learner mistakes
- Make it memorable with vivid example sentences and mnemonics
- After explaining a word, immediately ask the student to: 1) use it in a sentence, or 2) answer a question that requires using it
- Focus on the student's struggling vocabulary (box 1-2 words)
- Connect new words to words they already know (build semantic networks)
- Use spaced review: after 3-4 new words, go back and quiz them on an earlier word`,

            stories: `STORIES MODE:
- Create short, engaging stories using the student's vocabulary
- Write 2-3 paragraphs in ${target} at i+1 level — mostly comprehensible with some new words
- Key vocabulary words should appear naturally in context (highlighted with **bold**)
- After the story:
  1. Vocabulary list with translations
  2. 2-3 comprehension questions in ${target}
  3. A "What happens next?" prompt to encourage the student to continue the story in ${target}
- If the student writes a continuation, recast errors naturally in your response
- Vary story types: dialogues, narratives, news-style, diary entries
- Reuse vocabulary from previous stories for spaced review`,

            roleplay: `ROLE PLAY MODE:
- Set up a real-life scenario and play a character — the student must respond in ${target}
- Scenarios: ordering food, asking directions, shopping, doctor visit, job interview, making friends, travel check-in, etc.
- Keep the scene going — stay in character and respond to what they say
- Provide a "hint" at the bottom of each response if they seem stuck: show a template phrase they could use
- After 5-6 exchanges, break character and summarize key phrases they used correctly + recast mistakes
- Vary difficulty based on their responses: if they're doing well, the scenario can get more complex
- Every couple of exchanges, throw in a small complication (e.g., "Sorry, we're out of that" in a restaurant scene)`,

            pronunciation: `PRONUNCIATION MODE:
- Help the student improve their ${target} pronunciation
- The student will speak to you using the microphone. Listen to their speech (via their transcript) and give targeted feedback.
- For each response:
  1. Tell them what you understood (confirm or clarify)
  2. Point out specific pronunciation issues (common learner errors for ${origin} speakers learning ${target})
  3. Provide a minimal pair drill: e.g., "Try saying ___ vs ___ to hear the difference"
  4. Give a short phrase for them to repeat (at i+1 difficulty)
- Focus on the most impactful pronunciation features first (tones for Chinese, pitch accent for Japanese, vowel length for Korean, etc.)
- Be encouraging — even imperfect attempts deserve praise
- If their speech wasn't understood, guess what they meant and ask them to repeat more slowly`,

            freeform: `FREE CHAT MODE:
- Answer any question about ${target} language, culture, or learning strategies
- Be creative and helpful. Share interesting cultural facts, language history, and practical tips
- Even in free chat, apply Krashen's principles: provide comprehensible input, recast mistakes, encourage production
- If the student asks something outside language learning, gently redirect while being friendly
- Offer to switch to a more structured mode if they seem unsure what to ask`
        };

        return base + '\n\n' + (modeInstructions[mode] || modeInstructions.freeform) + vocabCtx;
    }

    getInterleavedPrompt() {
        const s = settingsService.get();
        const target = LANG_NAMES[s.targetLang] || s.targetLang;
        const all = vocabService.getAll();
        const struggling = all.filter(item => srsService.getBox(item.id) <= 2);

        if (!struggling.length) return null;

        const word = struggling[Math.floor(Math.random() * struggling.length)];
        const prompt = INTERLEAVED_PROMPTS[Math.floor(Math.random() * INTERLEAVED_PROMPTS.length)];
        return prompt
            .replace('{word}', word.front?.main || '')
            .replace('{meaning}', word.back?.main || word.back?.definition || '')
            .replace('{target}', target);
    }

    selectMode(modeId) {
        this.currentMode = modeId;
        this.messages = [];
        this._turnCount = 0;
        this._lastInterleave = 0;
        this._streamingMsgIdx = -1;
        this._streamBuf = '';
        this.renderChat();

        const s = settingsService.get();
        const target = LANG_NAMES[s.targetLang] || s.targetLang;

        let greeting = '';
        switch (modeId) {
            case 'conversation': greeting = `Start a simple, friendly conversation with me in ${target}. Begin with a greeting and ask me something easy.`; break;
            case 'reading': greeting = `Generate a short graded reading passage in ${target} for me. I'm a beginner-intermediate learner. Include comprehension questions after.`; break;
            case 'grammar': greeting = `Suggest 3 ${target} grammar topics suitable for a beginner-intermediate learner, and ask which one I'd like to learn about.`; break;
            case 'vocabulary': greeting = `Pick one interesting word from my struggling/sample vocabulary list and give me a deep, fun exploration of it. Then ask me to use it in a sentence.`; break;
            case 'stories': greeting = `Write a short, fun story in ${target} using some of my vocabulary words. Keep it beginner-friendly. Include comprehension questions.`; break;
            case 'roleplay': greeting = `Suggest 3 fun real-life scenarios we could roleplay in ${target}, and ask which one I'd like to try.`; break;
            case 'pronunciation': greeting = `I want to practice my ${target} pronunciation. Give me a short phrase to repeat, and I'll speak it using the microphone. Start with something easy!`; break;
            case 'freeform': greeting = `Say hi and ask what I'd like to learn about ${target} today. Be warm and enthusiastic.`; break;
        }

        this.sendToApi(greeting, true);
    }

    async sendToApi(userMessage, isSystemKickoff = false) {
        if (this.isStreaming) return;

        const config = this.getApiConfig();
        if (!config.url) {
            this.addMessage('assistant', 'Please set your Ollama API URL in Settings first. Go to Settings > AI Tutor to configure.');
            return;
        }

        if (!isSystemKickoff) {
            this.addMessage('user', userMessage);
        }

        this.isStreaming = true;
        this.updateInputState();

        this._streamBuf = '';
        this.addMessage('assistant', '', true);

        const apiMessages = [
            { role: 'system', content: this.buildSystemPrompt(this.currentMode) },
            ...this.messages.filter(m => !m.isTyping && !m.isStreaming).map(m => ({ role: m.role, content: m.content })),
        ];

        if (isSystemKickoff) {
            apiMessages.push({ role: 'user', content: userMessage });
        }

        try {
            this.abortController = new AbortController();

            const res = await fetch(`${config.url}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.model,
                    messages: apiMessages,
                    stream: true,
                    temperature: 0.8,
                    max_tokens: 1024,
                }),
                signal: this.abortController.signal,
            });

            if (!res.ok) {
                const errText = await res.text().catch(() => res.statusText);
                throw new Error(`API error ${res.status}: ${errText}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;

                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;
                        const data = trimmed.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta?.content;
                            if (delta) {
                                this._streamBuf += delta;
                                this._updateStreamingMessage(this._streamBuf);
                            }
                        } catch (e) {}
                    }
                }
            }

            this._finalizeStreamingMessage();

        } catch (err) {
            this.messages = this.messages.filter(m => !m.isTyping && !m.isStreaming);
            if (err.name === 'AbortError') {
                if (this._streamBuf) {
                    this.addMessage('assistant', this._streamBuf);
                }
                this.isStreaming = false;
                this.abortController = null;
                this.updateInputState();
                this._saveHistory();
                return;
            }

            let errorMsg = 'Connection failed. ';
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                const isMixed = location.protocol === 'https:' && config.url.startsWith('http:');
                if (isMixed) {
                    errorMsg += `Blocked: this page is HTTPS but your Ollama server is HTTP. Solutions: (1) Use Ollama4Android on this device, (2) access the app over HTTP, or (3) configure Ollama with HTTPS.`;
                } else {
                    errorMsg += `Could not reach ${config.url}. Make sure your LLM server is running.`;
                }
            } else {
                errorMsg += err.message;
            }
            this.addMessage('assistant', errorMsg);
        } finally {
            this.isStreaming = false;
            this.abortController = null;
            this.updateInputState();
            this._saveHistory();
        }
    }

    _updateStreamingMessage(text) {
        const typingMsg = this.messages.find(m => m.isTyping);
        if (!typingMsg) return;
        typingMsg.content = text;
        typingMsg.isTyping = false;
        typingMsg.isStreaming = true;
        this.renderMessages();
        this.scrollToBottom();
    }

    _finalizeStreamingMessage() {
        const streamingMsg = this.messages.find(m => m.isStreaming);
        if (streamingMsg) {
            streamingMsg.isStreaming = false;
            this.renderMessages();
            this._turnCount++;

            if (this.currentMode === 'conversation' && this._turnCount - this._lastInterleave >= 5) {
                const interleave = this.getInterleavedPrompt();
                if (interleave) {
                    this._lastInterleave = this._turnCount;
                    this.addMessage('system_interleave', interleave);
                }
            }
        }
    }

    addMessage(role, content, isTyping = false) {
        const msg = { role, content, isTyping, isStreaming: false, ts: Date.now() };
        this.messages.push(msg);
        this.renderMessages();
        this.scrollToBottom();
    }

    scrollToBottom() {
        const msgList = this.container?.querySelector('#chat-messages');
        if (msgList) {
            requestAnimationFrame(() => { msgList.scrollTop = msgList.scrollHeight; });
        }
    }

    updateInputState() {
        if (!this.container) return;
        const input = this.container.querySelector('#chat-input');
        const sendBtn = this.container.querySelector('#chat-send-btn');
        const micBtn = this.container.querySelector('#chat-mic-btn');
        if (input) input.disabled = this.isStreaming;
        if (sendBtn) {
            sendBtn.disabled = this.isStreaming;
            sendBtn.classList.toggle('opacity-50', this.isStreaming);
        }
        if (micBtn) {
            micBtn.disabled = this.isStreaming;
            micBtn.classList.toggle('opacity-50', this.isStreaming);
        }
    }

    handleSend() {
        const input = this.container?.querySelector('#chat-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text || this.isStreaming) return;
        input.value = '';
        this.sendToApi(text);
    }

    initSpeech() {
        if (!this.speechSupported) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateMicVisuals();
        };
        this.recognition.onend = () => {
            this.isListening = false;
            this.updateMicVisuals();
        };
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (this.currentMode === 'pronunciation') {
                this.addMessage('user', `🗣️ (spoken): "${transcript}"`);
                this.sendToApi(`The student just spoke this to me and I need to give pronunciation feedback: "${transcript}". Compare it to what they should have said and give targeted tips.`);
            } else {
                this.addMessage('user', transcript);
                this.sendToApi(transcript);
            }
        };
        this.recognition.onerror = (event) => {
            this.isListening = false;
            this.updateMicVisuals();
            if (event.error === 'not-allowed') {
                this.addMessage('assistant', 'Microphone permission was denied. Please allow microphone access in your browser settings.');
            }
        };
    }

    toggleMic() {
        if (!this.speechSupported) {
            this.addMessage('assistant', 'Speech recognition is not supported in your browser. Try Chrome or Edge.');
            return;
        }
        if (!this.recognition) this.initSpeech();

        if (this.isListening) {
            this.recognition.stop();
        } else {
            const s = settingsService.get();
            this.recognition.lang = SPEECH_LANG_CODES[s.targetLang] || 'en-US';
            try { this.recognition.start(); } catch (e) { console.error(e); }
        }
    }

    updateMicVisuals() {
        if (!this.container) return;
        const btn = this.container.querySelector('#chat-mic-btn');
        if (!btn) return;
        if (this.isListening) {
            btn.classList.add('bg-red-500', 'text-white', 'animate-pulse');
            btn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-500', 'dark:text-gray-400');
        } else {
            btn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
            btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-500', 'dark:text-gray-400');
        }
    }

    speakText(text) {
        const clean = text.replace(/[*_`#]/g, '').replace(/\([^)]*\)/g, '').trim();
        const s = settingsService.get();
        audioService.speak(clean, s.targetLang);
    }

    async _saveHistory() {
        const uid = auth.currentUser?.uid;
        if (!uid || !this.currentMode) return;
        const msgs = this.messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
            role: m.role, content: m.content, ts: m.ts
        }));
        try {
            const chatRef = ref(db, `users/${uid}/chatHistory/${this.currentMode}`);
            await set(chatRef, { messages: msgs.slice(-50), updated: Date.now() });
        } catch (e) {
            console.warn('[Chat] Save history failed:', e);
        }
    }

    async _loadHistory() {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        try {
            const snap = await get(ref(db, `users/${uid}/chatHistory`));
            this._cachedHistory = snap.exists() ? snap.val() : {};
        } catch (e) {
            this._cachedHistory = {};
        }
    }

    renderModeSelector() {
        if (!this.container) return;
        const s = settingsService.get();
        const target = LANG_NAMES[s.targetLang] || s.targetLang;
        const config = this.getApiConfig();
        const hasConfig = !!config.url;

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-14 landscape:h-11 z-40 px-4 landscape:px-3 flex justify-between items-center bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg">
                <div class="flex items-center gap-2">
                    <span class="text-xl">🤖</span>
                    <h1 class="text-lg landscape:text-base font-black text-white">AI Tutor</h1>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-white/60 font-bold">${target}</span>
                    <button id="chat-close-btn" class="p-2 bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-14 landscape:pt-11 overflow-y-auto bg-gray-50 dark:bg-dark-bg">
                <div class="max-w-2xl mx-auto px-4 py-8 landscape:py-4">
                    <div class="text-center mb-8 landscape:mb-4">
                        <div class="text-5xl landscape:text-4xl mb-3">🤖</div>
                        <h2 class="text-2xl landscape:text-xl font-black text-gray-800 dark:text-white mb-2">AI Language Tutor</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Choose a learning mode to start</p>
                    </div>

                    ${!hasConfig ? `
                        <div class="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-2xl text-center">
                            <p class="text-sm font-bold text-amber-700 dark:text-amber-300 mb-1">API not configured</p>
                            <p class="text-xs text-amber-600 dark:text-amber-400">Go to Settings > AI Tutor to set your Ollama URL and model, then tap "Test Connection"</p>
                        </div>
                    ` : `
                        <div class="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl flex items-center justify-center gap-2">
                            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span class="text-xs font-bold text-green-700 dark:text-green-300">Ollama</span>
                            ${config.model ? `<span class="text-xs text-green-500">${escapeHTML(config.model)}</span>` : ''}
                        </div>
                    `}

                    <div class="grid grid-cols-2 landscape:grid-cols-4 gap-3 landscape:gap-2">
                        ${CHAT_MODES.map(mode => `
                            <button class="chat-mode-btn bg-white dark:bg-dark-card border-2 border-gray-100 dark:border-dark-border p-4 landscape:p-3 rounded-2xl shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500 transition-all active:scale-95 text-left cursor-pointer" data-mode="${mode.id}">
                                <div class="text-2xl landscape:text-xl mb-2">${mode.icon}</div>
                                <h3 class="font-black text-gray-800 dark:text-white text-sm">${mode.label}</h3>
                                <p class="text-[10px] text-gray-400 mt-1 leading-tight">${mode.desc}</p>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        this.container.querySelector('#chat-close-btn').onclick = () => {
            window.dispatchEvent(new CustomEvent('router:home'));
        };

        this.container.querySelectorAll('.chat-mode-btn').forEach(btn => {
            btn.onclick = () => this.selectMode(btn.dataset.mode);
        });
    }

    renderChat() {
        if (!this.container) return;
        const mode = CHAT_MODES.find(m => m.id === this.currentMode);
        const s = settingsService.get();
        const target = LANG_NAMES[s.targetLang] || s.targetLang;
        const isPronunciation = this.currentMode === 'pronunciation';

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-14 landscape:h-11 z-40 px-4 landscape:px-3 flex justify-between items-center bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg">
                <div class="flex items-center gap-2">
                    <button id="chat-back-btn" class="p-1.5 bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
                    <span class="text-lg">${mode?.icon || '🤖'}</span>
                    <h1 class="text-base landscape:text-sm font-black text-white">${mode?.label || 'Chat'}</h1>
                    <span class="text-xs text-white/50 font-bold hidden md:inline">${target}</span>
                </div>
                <div class="flex items-center gap-2">
                    <button id="chat-clear-btn" class="p-2 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white rounded-full transition-colors cursor-pointer text-xs font-bold" title="New conversation"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
                    <button id="chat-close-btn" class="p-2 bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
            </div>

            <div id="chat-messages" class="w-full h-full pt-14 landscape:pt-11 pb-24 landscape:pb-20 overflow-y-auto bg-gray-50 dark:bg-dark-bg px-4 space-y-3 custom-scrollbar">
            </div>

            <div class="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border px-3 py-2 landscape:py-1.5">
                <div class="max-w-2xl mx-auto flex items-center gap-2">
                    ${this.speechSupported ? `
                        <button id="chat-mic-btn" class="w-12 h-12 landscape:w-10 landscape:h-10 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer" title="${isPronunciation ? 'Tap to speak' : 'Voice input'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                        </button>
                    ` : ''}
                    <input type="text" id="chat-input" class="flex-1 h-12 landscape:h-10 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-violet-500 outline-none text-sm font-medium text-gray-800 dark:text-white transition-all" placeholder="${isPronunciation ? 'Tap the mic to speak...' : 'Type your message...'}" autocomplete="off">
                    <button id="chat-send-btn" class="w-12 h-12 landscape:w-10 landscape:h-10 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl flex items-center justify-center shrink-0 transition-colors active:scale-95 cursor-pointer">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    </button>
                </div>
            </div>
        `;

        this.container.querySelector('#chat-close-btn').onclick = () => {
            window.dispatchEvent(new CustomEvent('router:home'));
        };
        this.container.querySelector('#chat-back-btn').onclick = () => {
            if (this.abortController) this.abortController.abort();
            this.isStreaming = false;
            this.messages = [];
            this.currentMode = null;
            this.renderModeSelector();
        };
        this.container.querySelector('#chat-clear-btn').onclick = () => {
            if (this.abortController) this.abortController.abort();
            this.isStreaming = false;
            this.messages = [];
            this.renderMessages();
            this.selectMode(this.currentMode);
        };
        this.container.querySelector('#chat-send-btn').onclick = () => this.handleSend();

        const micBtn = this.container.querySelector('#chat-mic-btn');
        if (micBtn) micBtn.onclick = () => this.toggleMic();

        const input = this.container.querySelector('#chat-input');
        input.addEventListener('keydown', (e) => e.stopPropagation());
        input.addEventListener('keypress', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });
    }

    formatMessage(text) {
        let html = escapeHTML(text);
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-black">$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/`(.+?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    renderMessages() {
        const msgList = this.container?.querySelector('#chat-messages');
        if (!msgList) return;

        msgList.innerHTML = this.messages.map((msg, i) => {
            if (msg.role === 'user') {
                return `
                    <div class="flex justify-end">
                        <div class="max-w-[80%] bg-violet-600 text-white px-4 py-3 rounded-2xl rounded-br-md shadow-sm">
                            <p class="text-sm leading-relaxed">${this.formatMessage(msg.content)}</p>
                        </div>
                    </div>
                `;
            } else if (msg.role === 'system_interleave') {
                return `
                    <div class="flex justify-center">
                        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-xl text-xs text-center max-w-[85%]">
                            💡 ${this.formatMessage(msg.content)}
                        </div>
                    </div>
                `;
            } else {
                const isTyping = msg.isTyping;
                const isStreaming = msg.isStreaming;
                const showActions = !isTyping && !isStreaming;

                return `
                    <div class="flex justify-start gap-2">
                        <div class="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center shrink-0 mt-1">
                            <span class="text-sm">🤖</span>
                        </div>
                        <div class="max-w-[80%]">
                            <div class="bg-white dark:bg-dark-card px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 dark:border-dark-border">
                                ${isTyping
                                    ? '<div class="flex gap-1"><span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span><span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:.15s"></span><span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:.3s"></span></div>'
                                    : `<p class="text-sm leading-relaxed text-gray-800 dark:text-gray-200">${this.formatMessage(msg.content)}${isStreaming ? '<span class="inline-block w-1.5 h-4 bg-violet-500 ml-0.5 animate-pulse align-text-bottom"></span>' : ''}</p>`
                                }
                            </div>
                            ${showActions ? `
                                <div class="flex gap-1 mt-1 ml-1">
                                    <button class="chat-speak-btn p-1 text-gray-400 hover:text-violet-500 transition-colors cursor-pointer" data-idx="${i}" title="Listen">
                                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                                    </button>
                                    <button class="chat-copy-btn p-1 text-gray-400 hover:text-violet-500 transition-colors cursor-pointer" data-idx="${i}" title="Copy">
                                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
        }).join('');

        msgList.querySelectorAll('.chat-speak-btn').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx);
                if (this.messages[idx]) this.speakText(this.messages[idx].content);
            };
        });
        msgList.querySelectorAll('.chat-copy-btn').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx);
                if (this.messages[idx]) {
                    navigator.clipboard?.writeText(this.messages[idx].content);
                    btn.innerHTML = '<svg class="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
                    setTimeout(() => {
                        btn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>';
                    }, 1500);
                }
            };
        });
    }
}

export const chatApp = new ChatApp();