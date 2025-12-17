// 1. Initialize Firebase (New Line)
import './services/firebase';

// 2. Styles & Components
import './styles/main.scss';
import { vocabService } from './services/vocabService';
import { settingsService } from './services/settingsService';
import { flashcardApp } from './components/FlashcardApp';

// 3. Mount App
flashcardApp.mount('main-content');

// 4. DOM Elements
const settingsToggle = document.getElementById('settings-toggle');
const settingsContent = document.getElementById('settings-content');
const targetSelect = document.getElementById('target-select');
const originSelect = document.getElementById('origin-select');

// 5. Initialize Selectors with Default Values
const defaults = settingsService.get();
if (targetSelect) targetSelect.value = defaults.targetLang;
if (originSelect) originSelect.value = defaults.originLang;

// 6. Toggle Settings Menu
if (settingsToggle) {
    settingsToggle.addEventListener('click', (e) => {
        e.stopPropagation(); 
        settingsContent.classList.toggle('is-open');
    });
}

// Close settings if clicking outside
document.addEventListener('click', (e) => {
    if (settingsContent && settingsToggle) {
        if (!settingsContent.contains(e.target) && e.target !== settingsToggle) {
            settingsContent.classList.remove('is-open');
        }
    }
});

// 7. Handle Changes
if (targetSelect) {
    targetSelect.addEventListener('change', (e) => {
        settingsService.setTarget(e.target.value);
        flashcardApp.refresh(); 
    });
}

if (originSelect) {
    originSelect.addEventListener('change', (e) => {
        settingsService.setOrigin(e.target.value);
        flashcardApp.refresh(); 
    });
}
