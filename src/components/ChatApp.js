import { settingsService } from '../services/settingsService';
import { vocabService } from '../services/vocabService';
import { srsService } from '../services/srsService';
import { escapeHTML } from '../utils/sanitize';
import { audioService } from '../services/audioService';

const LANG_NAMES = {
    ja: 'Japanese', ko: 'Korean', zh: 'Chinese', en: 'English',
    ru: 'Russian', fr: 'French', it: 'Italian', es: 'Spanish',
    pt: 'Portuguese', de: 'German'
};

const CHAT_MODES = [
    { id: 'conversation', label: 'Conversation', icon: '💬', desc: 'Practice chatting in your target language' },
    { id: 'grammar', label: 'Grammar', icon: '📖', desc: 'Learn grammar rules and patterns' },
    { id: 'vocabulary', label: 'Word Explorer', icon: '🔍', desc: 'Deep dive into words you\'re learning' },
    { id: 'stories', label: 'Stories', icon: '📚', desc: 'Read short stories with new vocab' },
    { id: 'roleplay', label: 'Role Play', icon: '🎭', desc: 'Practice real-life scenarios' },
    { id: 'freeform', label: 'Free Chat', icon: '✨', desc: 'Ask anything about the language' },
];

const DEFAULT_MODELS = [
    'llama3.1:8b',
    'llama3.2:3b',
    'gemma2:9b',
    'mistral:7b',
    'qwen2.5:7b',
    'phi3:mini',
];

export class ChatApp {
    constructor() {
        this.container = null;
        this.messages = [];
        this.currentMode = null;
        this.isStreaming = false;
        this.abortController = null;
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        if (!this.container) return;
        this.messages = [];
        this.currentMode = null;
        this.renderModeSelector();
    }

    unmount() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
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
            url: (s.llmApiUrl || 'http://localhost:11434').replace(/\/+$/, ''),
            key: s.llmApiKey || '',
            model: s.llmModel || 'llama3.1:8b',
        };
    }

    getVocabContext() {
        const all = vocabService.getAll();
        if (!all.length) return '';

        const s = settingsService.get();
        // Get struggling words (box 1-2) and recent words
        const withSrs = all.map(item => ({
            ...item,
            box: srsService.getBox(item.id)
        }));

        const struggling = withSrs.filter(i => i.box <= 2).slice(0, 10);
        const sample = [...all].sort(() => 0.5 - Math.random()).slice(0, 10);

        let ctx = '';
        if (struggling.length) {
            ctx += '\n\nWords the student is struggling with:\n';
            struggling.forEach(w => {
                ctx += `- ${w.front?.main || ''} = ${w.back?.main || w.back?.definition || ''}\n`;
            });
        }
        if (sample.length) {
            ctx += '\nSample vocabulary the student is learning:\n';
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

        const base = `You are a friendly, encouraging ${target} language tutor. The student speaks ${origin} and is learning ${target}. Keep responses concise and conversational. Use ${target} script naturally (not romanization) when writing in ${target}. Always provide ${origin} translations in parentheses for ${target} words/phrases the student might not know yet. Celebrate their progress and gently correct mistakes.`;

        const modeInstructions = {
            conversation: `Start a natural conversation in ${target}, keeping it simple at first. Adapt difficulty based on the student's responses. If they reply in ${origin}, gently encourage them to try in ${target}. Suggest useful phrases they can use. Mix ${target} and ${origin} naturally — use more ${target} as they improve.`,
            grammar: `Teach ${target} grammar in a clear, fun way. Use simple examples with the student's vocabulary when possible. Explain one concept at a time. Give pattern formulas, then show 3 example sentences. Ask the student to try making their own sentence using the pattern. Start by asking what grammar topic interests them, or suggest one based on their vocab level.`,
            vocabulary: `Help the student explore words deeply. For each word, explain: etymology/origin story if interesting, common collocations, related words, usage in different contexts, cultural nuances, and common mistakes. Make it memorable with mnemonics or fun associations. Focus on the student's current vocabulary list, especially words they're struggling with.`,
            stories: `Create short, engaging stories using the student's vocabulary. Write 2-3 paragraphs in ${target} with key words highlighted. After the story, provide a vocabulary list and 2-3 comprehension questions. Adjust difficulty based on their level. Stories can be funny, mysterious, or slice-of-life — keep them interesting!`,
            roleplay: `Set up a real-life scenario (ordering food, asking directions, shopping, meeting someone new, etc.) and play a character. Guide the student through the conversation in ${target}. Provide hints in ${origin} when they're stuck. After the roleplay, summarize useful phrases they learned. Start by suggesting a scenario or ask what situation they'd like to practice.`,
            freeform: `Answer any question about ${target} language, culture, or learning strategies. Be creative and helpful. Share interesting cultural facts, language history, and practical tips. If the student asks something outside language learning, gently redirect while being friendly.`
        };

        return base + '\n\n' + (modeInstructions[mode] || modeInstructions.freeform) + vocabCtx;
    }

    selectMode(modeId) {
        this.currentMode = modeId;
        this.messages = [];
        this.renderChat();

        // Send initial greeting
        const s = settingsService.get();
        const target = LANG_NAMES[s.targetLang] || s.targetLang;
        const mode = CHAT_MODES.find(m => m.id === modeId);

        let greeting = '';
        switch (modeId) {
            case 'conversation': greeting = `Start a simple, friendly conversation with me in ${target}. Begin with a greeting and ask me something easy.`; break;
            case 'grammar': greeting = `Suggest 3 ${target} grammar topics suitable for a beginner-intermediate learner, and ask which one I'd like to learn about.`; break;
            case 'vocabulary': greeting = `Pick one interesting word from my struggling/sample vocabulary list and give me a deep, fun exploration of it.`; break;
            case 'stories': greeting = `Write a short, fun story in ${target} using some of my vocabulary words. Keep it beginner-friendly.`; break;
            case 'roleplay': greeting = `Suggest 3 fun real-life scenarios we could roleplay in ${target}, and ask which one I'd like to try.`; break;
            case 'freeform': greeting = `Say hi and ask what I'd like to learn about ${target} today. Be warm and enthusiastic.`; break;
        }

        this.sendToApi(greeting, true);
    }

    async sendToApi(userMessage, isSystemKickoff = false) {
        if (this.isStreaming) return;

        const config = this.getApiConfig();
        if (!config.url) {
            this.addMessage('assistant', 'Please set your LLM API URL in Settings first. Go to Settings > AI Tutor to configure.');
            return;
        }

        if (!isSystemKickoff) {
            this.addMessage('user', userMessage);
        }

        this.isStreaming = true;
        this.updateInputState();

        // Add typing indicator
        this.addMessage('assistant', '...', true);

        const apiMessages = [
            { role: 'system', content: this.buildSystemPrompt(this.currentMode) },
            ...this.messages.filter(m => !m.isTyping).map(m => ({ role: m.role, content: m.content })),
        ];

        if (isSystemKickoff) {
            apiMessages.push({ role: 'user', content: userMessage });
        }

        try {
            this.abortController = new AbortController();

            const headers = { 'Content-Type': 'application/json' };
            if (config.key) headers['Authorization'] = `Bearer ${config.key}`;

            const res = await fetch(`${config.url}/v1/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: config.model,
                    messages: apiMessages,
                    stream: false,
                    temperature: 0.8,
                    max_tokens: 1024,
                }),
                signal: this.abortController.signal,
            });

            if (!res.ok) {
                const errText = await res.text().catch(() => res.statusText);
                throw new Error(`API error ${res.status}: ${errText}`);
            }

            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content || 'No response received.';

            // Remove typing indicator and add real response
            this.messages = this.messages.filter(m => !m.isTyping);
            this.addMessage('assistant', reply);

        } catch (err) {
            this.messages = this.messages.filter(m => !m.isTyping);
            if (err.name === 'AbortError') return;

            let errorMsg = 'Connection failed. ';
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                errorMsg += `Could not reach ${config.url}. Make sure your LLM server is running.`;
            } else {
                errorMsg += err.message;
            }
            this.addMessage('assistant', errorMsg);
        } finally {
            this.isStreaming = false;
            this.abortController = null;
            this.updateInputState();
        }
    }

    addMessage(role, content, isTyping = false) {
        this.messages.push({ role, content, isTyping, ts: Date.now() });
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
        if (input) input.disabled = this.isStreaming;
        if (sendBtn) {
            sendBtn.disabled = this.isStreaming;
            sendBtn.classList.toggle('opacity-50', this.isStreaming);
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

    speakText(text) {
        // Strip markdown and parenthetical translations for cleaner speech
        const clean = text.replace(/[*_`#]/g, '').replace(/\([^)]*\)/g, '').trim();
        const s = settingsService.get();
        audioService.speak(clean, s.targetLang);
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
                        <p class="text-sm text-gray-500 dark:text-gray-400">Choose a learning mode to start chatting</p>
                    </div>

                    ${!hasConfig ? `
                        <div class="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-2xl text-center">
                            <p class="text-sm font-bold text-amber-700 dark:text-amber-300 mb-1">API not configured</p>
                            <p class="text-xs text-amber-600 dark:text-amber-400">Go to Settings > AI Tutor to add your LLM API endpoint</p>
                        </div>
                    ` : `
                        <div class="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl flex items-center justify-center gap-2">
                            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span class="text-xs font-bold text-green-700 dark:text-green-300">${escapeHTML(config.model)}</span>
                            <span class="text-xs text-green-500">@ ${escapeHTML(config.url.replace(/^https?:\/\//, '').slice(0, 30))}</span>
                        </div>
                    `}

                    <div class="grid grid-cols-2 landscape:grid-cols-3 gap-3 landscape:gap-2">
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

            <div id="chat-messages" class="w-full h-full pt-14 landscape:pt-11 pb-20 landscape:pb-16 overflow-y-auto bg-gray-50 dark:bg-dark-bg px-4 space-y-3 custom-scrollbar">
            </div>

            <div class="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border px-3 py-2 landscape:py-1.5">
                <div class="max-w-2xl mx-auto flex items-center gap-2">
                    <input type="text" id="chat-input" class="flex-1 h-12 landscape:h-10 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-violet-500 outline-none text-sm font-medium text-gray-800 dark:text-white transition-all" placeholder="Type your message..." autocomplete="off">
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
        // Simple markdown-like formatting
        let html = escapeHTML(text);
        // Bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-black">$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // Inline code
        html = html.replace(/`(.+?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
        // Line breaks
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
            } else {
                const isTyping = msg.isTyping;
                return `
                    <div class="flex justify-start gap-2">
                        <div class="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center shrink-0 mt-1">
                            <span class="text-sm">🤖</span>
                        </div>
                        <div class="max-w-[80%]">
                            <div class="bg-white dark:bg-dark-card px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 dark:border-dark-border">
                                ${isTyping
                                    ? '<div class="flex gap-1"><span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span><span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:.15s"></span><span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:.3s"></span></div>'
                                    : `<p class="text-sm leading-relaxed text-gray-800 dark:text-gray-200">${this.formatMessage(msg.content)}</p>`
                                }
                            </div>
                            ${!isTyping ? `
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

        // Bind speak/copy buttons
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
