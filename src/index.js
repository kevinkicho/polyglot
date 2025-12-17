import './services/firebase';
import './styles/main.scss'; // Imports Tailwind & Fonts
import { settingsService } from './services/settingsService';
import { flashcardApp } from './components/FlashcardApp';

// 1. Mount App
flashcardApp.mount('main-content');

// 2. Elements
const openBtn = document.getElementById('settings-open-btn');
const closeBtn = document.getElementById('settings-close-btn');
const doneBtn = document.getElementById('modal-done-btn');
const modal = document.getElementById('settings-modal');
const backdrop = document.getElementById('modal-backdrop');

const targetSelect = document.getElementById('target-select');
const originSelect = document.getElementById('origin-select');
const fontSelect = document.getElementById('font-select');

// 3. Load Saved Settings
const saved = settingsService.get();

// Apply values to dropdowns
if(targetSelect) targetSelect.value = saved.targetLang;
if(originSelect) originSelect.value = saved.originLang;
if(fontSelect) fontSelect.value = saved.font;

// Apply Font Immediately
applyFont(saved.font);

// 4. Modal Functions
function openModal() {
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
}

function applyFont(fontClass) {
    // Remove old fonts
    document.body.classList.remove('font-inter', 'font-lato', 'font-roboto');
    // Add new font
    document.body.classList.add(fontClass);
}

// 5. Event Listeners
openBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
doneBtn.addEventListener('click', closeModal);
backdrop.addEventListener('click', closeModal); // Close when clicking background

// Settings Changes
targetSelect.addEventListener('change', (e) => {
    settingsService.setTarget(e.target.value);
    flashcardApp.refresh();
});

originSelect.addEventListener('change', (e) => {
    settingsService.setOrigin(e.target.value);
    flashcardApp.refresh();
});

fontSelect.addEventListener('change', (e) => {
    const newFont = e.target.value;
    settingsService.setFont(newFont);
    applyFont(newFont);
});
