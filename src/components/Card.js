import { settingsService } from '../services/settingsService';

export const Card = (item, isFlipped) => {
    const settings = settingsService.get();
    const fontClass = settings.targetLang === 'ja' ? 'font-jp' : '';
    
    // VISUAL TOGGLES
    const showVocab = settings.showVocab; // Main text
    const showSentence = settings.showSentence;
    const showEnglish = settings.showEnglish; // Back definition or origin text

    const containerClass = "w-full h-full bg-white dark:bg-dark-card rounded-[2rem] shadow-xl dark:shadow-none border-2 border-indigo-100 dark:border-dark-border p-8 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer flashcard-content";

    if (!isFlipped) {
        // --- FRONT SIDE ---
        return `
            <div class="${containerClass}" id="flashcard-box">
                <span class="absolute top-6 text-[10px] font-black text-gray-300 dark:text-gray-500 uppercase tracking-[0.2em] select-none">Vocabulary</span>
                
                <div class="flex-grow w-full flex items-center justify-center overflow-hidden">
                    <span id="flashcard-text" class="text-5xl md:text-6xl font-black text-gray-800 dark:text-white leading-tight text-center select-none ${fontClass} ${!showVocab ? 'invisible' : ''}" data-fit="true">
                        ${item.front.main}
                    </span>
                </div>
                
                ${item.front.sub ? `<div class="mt-4 text-xl text-indigo-500 dark:text-dark-primary font-bold opacity-80 select-none">${item.front.sub}</div>` : ''}
                
                <div class="absolute bottom-6 text-gray-300 dark:text-gray-600 select-none">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 13l-7 7-7-7"></path></svg>
                </div>
            </div>
        `;
    } else {
        // --- BACK SIDE ---
        return `
            <div class="${containerClass}" id="flashcard-box">
                <span class="absolute top-6 text-[10px] font-black text-gray-300 dark:text-gray-500 uppercase tracking-[0.2em] select-none">Meaning</span>
                
                <div class="flex-grow w-full flex items-center justify-center overflow-hidden">
                    <span id="flashcard-text" class="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white leading-tight text-center select-none" data-fit="true">
                        ${item.back.definition}
                    </span>
                </div>
                
                ${showSentence && item.back.sentenceTarget ? `
                    <div class="mt-6 w-full p-4 bg-white/50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p class="text-lg font-medium text-center leading-relaxed select-text text-gray-700 dark:text-gray-200 ${fontClass}">
                            ${item.back.sentenceTarget}
                        </p>
                        ${showEnglish ? `<p class="mt-2 text-sm text-gray-400 dark:text-gray-500 text-center italic leading-snug border-t border-gray-200 dark:border-gray-700 pt-2">
                            ${item.back.sentenceOrigin}
                        </p>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
};
