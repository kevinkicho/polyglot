import './styles/main.scss';
import { vocabService } from './services/vocabService';
import { flashcardApp } from './components/FlashcardApp';

// --- 1. Mount the Flashcard Component ---
// This injects the flashcard HTML/JS into the #main-content div
flashcardApp.mount('main-content');


// --- 2. Global Topbar Logic ---
const settingsToggle = document.getElementById('settings-toggle');
const settingsContent = document.getElementById('settings-content');
const langSelect = document.getElementById('language-select');

// Accordion Toggle
settingsToggle.addEventListener('click', () => {
    settingsContent.classList.toggle('is-open');
});

// Language Change Logic
langSelect.addEventListener('change', (e) => {
    const newLang = e.target.value;
    
    // Update the service data
    vocabService.setTargetLanguage(newLang);
    
    // Tell the component to re-render itself
    flashcardApp.refresh();
});
