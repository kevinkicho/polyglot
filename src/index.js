import './styles/main.scss';
import { vocabService } from './services/vocabService';
import { settingsService } from './services/settingsService';
import { flashcardApp } from './components/FlashcardApp';

// 1. Mount App
flashcardApp.mount('main-content');

// 2. DOM Elements
const settingsToggle = document.getElementById('settings-toggle');
const settingsContent = document.getElementById('settings-content');
const targetSelect = document.getElementById('target-select');
const originSelect = document.getElementById('origin-select');

// 3. Initialize Selectors with Default Values
const defaults = settingsService.get();
targetSelect.value = defaults.targetLang;
originSelect.value = defaults.originLang;

// 4. Toggle Settings Menu
settingsToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent closing immediately
    settingsContent.classList.toggle('is-open');
});

// Close settings if clicking outside
document.addEventListener('click', (e) => {
    if (!settingsContent.contains(e.target) && e.target !== settingsToggle) {
        settingsContent.classList.remove('is-open');
    }
});

// 5. Handle Changes
targetSelect.addEventListener('change', (e) => {
    settingsService.setTarget(e.target.value);
    flashcardApp.refresh(); // Reload cards
});

originSelect.addEventListener('change', (e) => {
    settingsService.setOrigin(e.target.value);
    flashcardApp.refresh(); // Reload cards
});
