import './services/firebase';
import './styles/main.scss';
import { settingsService } from './services/settingsService';
import { flashcardApp } from './components/FlashcardApp';
import { quizApp } from './components/QuizApp';
import { sentencesApp } from './components/SentencesApp';
import { blanksApp } from './components/BlanksApp';
import { audioService } from './services/audioService';

// Remove loading class if imports succeed
if(document.body.classList.contains('is-loading')) {
    document.body.classList.remove('is-loading');
}

// --- ELEMENTS ---
const mainMenu = document.getElementById('main-menu');
const flashcardView = document.getElementById('flashcard-view');
const quizView = document.getElementById('quiz-view');
const sentencesView = document.getElementById('sentences-view');
const blanksView = document.getElementById('blanks-view');

const menuFlashcardBtn = document.getElementById('menu-flashcard-btn');
const menuQuizBtn = document.getElementById('menu-quiz-btn');
const menuSentencesBtn = document.getElementById('menu-sentences-btn');
const menuBlanksBtn = document.getElementById('menu-blanks-btn');

const splash = document.getElementById('splash-screen');
const startBtn = document.getElementById('start-app-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

// --- ROUTER ---
function showMenu() {
    audioService.stop();
    if(flashcardView) flashcardView.classList.add('hidden');
    if(quizView) quizView.classList.add('hidden');
    if(sentencesView) sentencesView.classList.add('hidden');
    if(blanksView) blanksView.classList.add('hidden');
    if(mainMenu) setTimeout(() => mainMenu.classList.remove('translate-y-full', 'opacity-0'), 50);
}

function showFlashcard() {
    if(mainMenu) mainMenu.classList.add('translate-y-full', 'opacity-0');
    setTimeout(() => { if(flashcardView) { flashcardView.classList.remove('hidden'); flashcardApp.mount('flashcard-view'); } }, 1000);
}

function showQuiz() {
    if(mainMenu) mainMenu.classList.add('translate-y-full', 'opacity-0');
    setTimeout(() => { if(quizView) { quizView.classList.remove('hidden'); quizApp.mount('quiz-view'); } }, 1000);
}

function showSentences() {
    if(mainMenu) mainMenu.classList.add('translate-y-full', 'opacity-0');
    setTimeout(() => { if(sentencesView) { sentencesView.classList.remove('hidden'); sentencesApp.mount('sentences-view'); } }, 1000);
}

function showBlanks() {
    if(mainMenu) mainMenu.classList.add('translate-y-full', 'opacity-0');
    setTimeout(() => { if(blanksView) { blanksView.classList.remove('hidden'); blanksApp.mount('blanks-view'); } }, 1000);
}

window.addEventListener('router:home', showMenu);
if(menuFlashcardBtn) menuFlashcardBtn.addEventListener('click', showFlashcard);
if(menuQuizBtn) menuQuizBtn.addEventListener('click', showQuiz);
if(menuSentencesBtn) menuSentencesBtn.addEventListener('click', showSentences);
if(menuBlanksBtn) menuBlanksBtn.addEventListener('click', showBlanks);

// --- STARTUP ---
const checks = [document.getElementById('check-1'), document.getElementById('check-2'), document.getElementById('check-3')];
function initApp() {
    try {
        const saved = settingsService.get();
        if (saved.darkMode) document.documentElement.classList.add('dark');
        applyTypography(saved.fontFamily, saved.fontWeight);
    } catch(e) { console.error(e); }

    let delay = 500;
    checks.forEach((check, index) => {
        setTimeout(() => {
            if(check) {
                check.className = "w-4 h-4 bg-green-500 rounded-full flex items-center justify-center transition-colors shadow-lg shadow-green-200";
                check.innerHTML = `<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;
            }
            if (index === checks.length - 1) {
                setTimeout(() => {
                    if(startBtn) {
                        startBtn.disabled = false;
                        startBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'scale-95');
                        startBtn.classList.add('bg-indigo-600', 'dark:bg-dark-primary', 'text-white', 'shadow-xl', 'hover:bg-indigo-700', 'active:scale-95');
                        startBtn.textContent = "Start Learning";
                    }
                }, 500);
            }
        }, delay);
        delay += 600;
    });
}

if(startBtn) {
    startBtn.addEventListener('click', () => { 
        if(splash) splash.classList.add('opacity-0', 'pointer-events-none'); 
        setTimeout(() => { if(splash) splash.style.display = 'none'; showMenu(); }, 1000); 
    });
}
initApp();

function applyTypography(family, weight) {
    document.body.classList.remove('font-inter', 'font-lato', 'font-roboto', 'font-light', 'font-normal', 'font-bold', 'font-black');
    document.body.classList.add(family, weight);
}

// --- SETTINGS UI ---
const modal = document.getElementById('settings-modal');
const backdrop = document.getElementById('modal-backdrop');
const openBtn = document.getElementById('settings-open-btn');
const doneBtn = document.getElementById('modal-done-btn');

// Toggles & Inputs
const targetSelect = document.getElementById('target-select');
const originSelect = document.getElementById('origin-select');
const darkToggle = document.getElementById('toggle-dark');
const fontFamilySelect = document.getElementById('font-family-select');
const fontWeightSelect = document.getElementById('font-weight-select');
const vocabToggle = document.getElementById('toggle-vocab');
const readingToggle = document.getElementById('toggle-reading');
const sentenceToggle = document.getElementById('toggle-sentence');
const englishToggle = document.getElementById('toggle-english');
const audioToggle = document.getElementById('toggle-audio');
const gameWaitToggle = document.getElementById('toggle-game-wait');
// Quiz
const quizChoicesSelect = document.getElementById('quiz-choices-select');
const quizAudioToggle = document.getElementById('toggle-quiz-audio');
const quizClickToggle = document.getElementById('toggle-quiz-click');
const quizAutoCorrectToggle = document.getElementById('toggle-quiz-autoplay-correct');
// Sentences
const sentAudioToggle = document.getElementById('toggle-sent-audio');
const sentAutoCorrectToggle = document.getElementById('toggle-sent-autoplay-correct');
// Blanks
const blanksChoicesSelect = document.getElementById('blanks-choices-select');
const blanksAudioToggle = document.getElementById('toggle-blanks-audio');
const blanksAutoCorrectToggle = document.getElementById('toggle-blanks-autoplay-correct');

// Accordions
const accFontBtn = document.getElementById('font-accordion-btn'); const accFontContent = document.getElementById('font-options'); const accFontArrow = document.getElementById('accordion-arrow-font');
const acc1Btn = document.getElementById('display-accordion-btn'); const acc1Content = document.getElementById('display-options'); const acc1Arrow = document.getElementById('accordion-arrow-1');
const acc2Btn = document.getElementById('audio-accordion-btn'); const acc2Content = document.getElementById('audio-options'); const acc2Arrow = document.getElementById('accordion-arrow-2');
const acc3Btn = document.getElementById('quiz-accordion-btn'); const acc3Content = document.getElementById('quiz-options'); const acc3Arrow = document.getElementById('accordion-arrow-3');
const accSentBtn = document.getElementById('sent-accordion-btn'); const accSentContent = document.getElementById('sent-options'); const accSentArrow = document.getElementById('accordion-arrow-sent');
const accBlanksBtn = document.getElementById('blanks-accordion-btn'); const accBlanksContent = document.getElementById('blanks-options'); const accBlanksArrow = document.getElementById('accordion-arrow-blanks');

function openModal() { if(modal) { modal.classList.remove('hidden'); setTimeout(() => modal.classList.remove('opacity-0'), 10); }}
function closeModal() { if(modal) { modal.classList.add('opacity-0'); setTimeout(() => modal.classList.add('hidden'), 200); }}
function toggleAccordion(c, a) { if(c && a) { c.classList.toggle('hidden'); a.style.transform = c.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)'; }}

if(openBtn) openBtn.addEventListener('click', openModal);
if(doneBtn) doneBtn.addEventListener('click', closeModal);
if(backdrop) backdrop.addEventListener('click', closeModal);

if(accFontBtn) accFontBtn.addEventListener('click', () => toggleAccordion(accFontContent, accFontArrow));
if(acc1Btn) acc1Btn.addEventListener('click', () => toggleAccordion(acc1Content, acc1Arrow));
if(acc2Btn) acc2Btn.addEventListener('click', () => toggleAccordion(acc2Content, acc2Arrow));
if(acc3Btn) acc3Btn.addEventListener('click', () => toggleAccordion(acc3Content, acc3Arrow));
if(accSentBtn) accSentBtn.addEventListener('click', () => toggleAccordion(accSentContent, accSentArrow));
if(accBlanksBtn) accBlanksBtn.addEventListener('click', () => toggleAccordion(accBlanksContent, accBlanksArrow));

// Updates
if(targetSelect) targetSelect.addEventListener('change', (e) => { settingsService.setTarget(e.target.value); flashcardApp.refresh(); });
if(originSelect) originSelect.addEventListener('change', (e) => { settingsService.setOrigin(e.target.value); flashcardApp.refresh(); });
if(darkToggle) darkToggle.addEventListener('change', (e) => { settingsService.set('darkMode', e.target.checked); e.target.checked ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark'); });
if(fontFamilySelect) fontFamilySelect.addEventListener('change', (e) => { settingsService.set('fontFamily', e.target.value); applyTypography(e.target.value, settingsService.get().fontWeight); });
if(fontWeightSelect) fontWeightSelect.addEventListener('change', (e) => { settingsService.set('fontWeight', e.target.value); applyTypography(settingsService.get().fontFamily, e.target.value); });

if(vocabToggle) vocabToggle.addEventListener('change', (e) => { settingsService.set('showVocab', e.target.checked); flashcardApp.refresh(); });
if(readingToggle) readingToggle.addEventListener('change', (e) => { settingsService.set('showReading', e.target.checked); flashcardApp.refresh(); });
if(sentenceToggle) sentenceToggle.addEventListener('change', (e) => { settingsService.set('showSentence', e.target.checked); flashcardApp.refresh(); });
if(englishToggle) englishToggle.addEventListener('change', (e) => { settingsService.set('showEnglish', e.target.checked); flashcardApp.refresh(); });
if(audioToggle) audioToggle.addEventListener('change', (e) => { settingsService.set('autoPlay', e.target.checked); });
if(gameWaitToggle) gameWaitToggle.addEventListener('change', (e) => { settingsService.set('gameWaitAudio', e.target.checked); });

if(quizChoicesSelect) quizChoicesSelect.addEventListener('change', (e) => { settingsService.set('quizChoices', e.target.value); });
if(quizAudioToggle) quizAudioToggle.addEventListener('change', (e) => { settingsService.set('quizAnswerAudio', e.target.checked); });
if(quizClickToggle) quizClickToggle.addEventListener('change', (e) => { settingsService.set('quizClickMode', e.target.checked ? 'double' : 'single'); });
if(quizAutoCorrectToggle) quizAutoCorrectToggle.addEventListener('change', (e) => { settingsService.set('quizAutoPlayCorrect', e.target.checked); });

if(sentAudioToggle) sentAudioToggle.addEventListener('change', (e) => { settingsService.set('sentencesWordAudio', e.target.checked); });
if(sentAutoCorrectToggle) sentAutoCorrectToggle.addEventListener('change', (e) => { settingsService.set('sentAutoPlayCorrect', e.target.checked); });

if(blanksChoicesSelect) blanksChoicesSelect.addEventListener('change', (e) => { settingsService.set('blanksChoices', e.target.value); });
if(blanksAudioToggle) blanksAudioToggle.addEventListener('change', (e) => { settingsService.set('blanksAnswerAudio', e.target.checked); });
if(blanksAutoCorrectToggle) blanksAutoCorrectToggle.addEventListener('change', (e) => { settingsService.set('blanksAutoPlayCorrect', e.target.checked); });

// Load Saved
const saved = settingsService.get();
if(targetSelect) targetSelect.value = saved.targetLang;
if(originSelect) originSelect.value = saved.originLang;
if(darkToggle) darkToggle.checked = saved.darkMode;
if(fontFamilySelect) fontFamilySelect.value = saved.fontFamily;
if(fontWeightSelect) fontWeightSelect.value = saved.fontWeight;
if(vocabToggle) vocabToggle.checked = saved.showVocab;
if(readingToggle) readingToggle.checked = saved.showReading;
if(sentenceToggle) sentenceToggle.checked = saved.showSentence;
if(englishToggle) englishToggle.checked = saved.showEnglish;
if(audioToggle) audioToggle.checked = saved.autoPlay;
if(gameWaitToggle) gameWaitToggle.checked = saved.gameWaitAudio;

if(quizChoicesSelect) quizChoicesSelect.value = saved.quizChoices;
if(quizAudioToggle) quizAudioToggle.checked = saved.quizAnswerAudio;
if(quizClickToggle) quizClickToggle.checked = (saved.quizClickMode === 'double');
if(quizAutoCorrectToggle) quizAutoCorrectToggle.checked = saved.quizAutoPlayCorrect;

if(sentAudioToggle) sentAudioToggle.checked = saved.sentencesWordAudio;
if(sentAutoCorrectToggle) sentAutoCorrectToggle.checked = saved.sentAutoPlayCorrect;

if(blanksChoicesSelect) blanksChoicesSelect.value = saved.blanksChoices;
if(blanksAudioToggle) blanksAudioToggle.checked = saved.blanksAnswerAudio;
if(blanksAutoCorrectToggle) blanksAutoCorrectToggle.checked = saved.blanksAutoPlayCorrect;

// Global Nav Listeners
document.addEventListener('click', (e) => {
    if (e.target.closest('#quiz-prev-btn')) quizApp.prev();
    if (e.target.closest('#quiz-next-btn')) quizApp.next();
    if (e.target.closest('#sent-prev-btn')) sentencesApp.prev();
    if (e.target.closest('#sent-next-btn')) sentencesApp.next();
    if (e.target.closest('#blanks-prev-btn')) blanksApp.prev();
    if (e.target.closest('#blanks-next-btn')) blanksApp.next();
});
if(fullscreenBtn) fullscreenBtn.addEventListener('click', () => { (!document.fullscreenElement) ? document.documentElement.requestFullscreen().catch(console.log) : document.exitFullscreen(); });
