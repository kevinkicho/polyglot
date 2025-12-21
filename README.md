# Polyglot.AI

**Polyglot.AI** is a robust, web-based language learning ecosystem built to help users master vocabulary and sentence structure through a wide variety of interactive game modes. It leverages Firebase for real-time data and authentication, offering a highly customizable experience with support for complex scripts (Japanese, Chinese, Korean) and intelligent audio handling.

---

## 📂 File Structure & Architecture

The application uses a modular architecture with distinct services handling logic and components handling the UI for each game mode.

| File Path | Description |
| :--- | :--- |
| **`src/index.html`** | The application shell containing the main menu, settings modals, and dynamic view containers for all 12 game modes. |
| **`src/index.js`** | The entry point. Handles app initialization, routing state, Firebase auth listeners, and global event delegation. |
| **`src/services/`** | Contains core business logic: <br>• **`textService.js`**: The central engine for CJK text processing, tokenization, and smart wrapping.<br>• **`audioService.js`**: Manages TTS and prevents "Origin" language audio playback.<br>• **`vocabService.js`** & **`dictionaryService.js`**: Manages data synchronization with Firebase.<br>• **`scoreService.js`**: Tracks streaks and daily progress. |
| **`src/components/`** | Individual game logic classes. Each class (e.g., `QuizApp`, `MatchApp`) encapsulates its own game loop and DOM manipulation. |

---

## 🧩 Advanced Text & Language Algorithms

Polyglot.AI implements specific algorithms to handle the complexities of Asian languages and multi-variation vocabulary.

### 1. Special Character Handling & Smart Wrap
The application actively scans for special separators to optimize legibility in grid-based games (Finder, Match, Memory) and enforce strict rules in spelling games (Constructor).

* **Separators Detected**: `/`, `·` (Middle Dot), `・` (Katakana Middle Dot), `･` (Half-width Middle Dot), `,`, `、` (Ideographic Comma), and `。` (Ideographic Full Stop).
* **Vertical Stacking**: In "Grid" layouts, if any of these separators are detected, the `textService` splits the string and wraps each segment in a `<div>`. This stacks synonyms vertically (e.g., "Word A" above "Word B") instead of squeezing them horizontally, preventing text overflow.
* **Constructor "Cleaning"**: For the **Constructor** game, these special characters are strictly stripped from the answer pool. If a word is `襟もと·襟元`, the game logic randomly selects *one* variation (e.g., `襟もと`) and ensures the user only builds the semantic characters, ignoring the separator.

### 2. Language-Specific Tokenization
* **Japanese Morphological Analysis**: The `Sentences` game does not simply split by spaces (which don't exist in Japanese). It uses a custom tokenizer algorithm (`textService.tokenizeJapanese`) that breaks sentences into meaningful morphemes or chunks.
* **Structure**: The tokenizer returns objects containing the `surface_form` (the actual text to display) and metadata, ensuring the drag-and-drop blocks correspond to grammatically correct sentence parts.

---

## ⚙️ Global Settings & Customization

The **Settings Modal** provides granular control over the learning experience. Changes are persisted via `settingsService` and apply immediately across all games.

| Section | Button/Toggle | Functionality |
| :--- | :--- | :--- |
| **Language** | **Target / Origin** | Selects the language to learn (Target) and the user's native language (Origin). Dynamically updates flashcard content and audio sources. |
| **Audio** | **Auto Play** | Automatically speaks the target word/sentence when a new card loads. |
| | **Wait for Audio** | In Flashcards, flipping a card is delayed until the audio finishes playing (prevents "spoiling" the answer). |
| | **Touch-to-Speak** | Enables clicking any text element to hear its pronunciation on demand. |
| | **Volume Slider** | Global volume control for the TTS engine. |
| **Visuals** | **Dark Mode** | Toggles the CSS dark theme (Tailwind `dark:` classes). |
| | **Fonts** | Dropdowns to select specific font families (e.g., Noto Sans JP, serif vs. sans) and font weights. |
| **Card Display** | **Show Vocab/Sent/Eng** | Toggles visibility of specific fields on Flashcards (e.g., hide the English translation to test yourself). |
| **Game Specific** | **Double Click** | For Quiz/Blanks: First click selects (and plays audio), second click submits. Prevents accidental mis-clicks. |
| | **Win Animation** | Toggles the celebratory animation in the Sentence game. |
| **Dictionary** | **Enable Popup** | Allows Admin users to summon the edit modal. |

---

## 🧭 Navigation & UI Architecture

### Top Bar Elements
The unified header persists across all views, providing quick access to essential tools:
1.  **Home / Logo**: Returns the user to the Main Menu grid.
2.  **Score Pill**: Displays today's total XP. Clicking it opens the **Weekly Progress Chart**.
3.  **Edit Button (Admin)**: A context-aware pencil icon (visible only to Admins). It summons the Edit Modal pre-filled with the data of the *currently active* game item.
4.  **Settings Cog**: Opens the global settings modal.
5.  **User Profile**: Handles Firebase Authentication (Google Sign-In/Out).

### Navigation Implementation
The app uses a custom single-page application (SPA) router located in `src/index.js`.
* **State Management**: It utilizes `history.pushState` to manage URL hashes (e.g., `#/quiz`, `#/match`) without reloading the page.
* **View Rendering**: A `renderView(viewName)` function orchestrates the transition. It hides all view containers, unmounts the current game instance (stopping audio/timers), and mounts the requested game component.
* **Back Button Support**: Listens for the `popstate` event to handle browser "Back" button presses naturally.

---

## 🗄️ Firebase Realtime Database

Realtime Data Event Handling
The app implements "Rapid Data Event Updates" via vocabService subscriptions.

Listeners: The service attaches a .onValue() listener to the Firebase reference.

Reactivity: When data changes on the server (e.g., an Admin fixes a typo), the new snapshot is immediately pushed to the client.

UI Sync: The vocabService publishes this event. Active components (like FlashcardApp) subscribe to these updates and trigger a refresh() method, instantly updating the text on the screen without a page reload.

### Structure
The backend relies on a flat, JSON-like structure optimized for rapid retrieval and updates.

### 1. `vocab` Node
An array of objects serving as the master database for all learning content.
```json
[
  {
    "id": 0,
    "ja": "洗剤",             // Japanese (Target)
    "ja_furi": "せんざい",     // Furigana
    "ja_roma": "senzai",      // Romaji
    "en": "detergent",        // English (Origin)
    "en_ex": "Use only...",   // English Example
    "ko": "세제",             // Korean
    "zh": "洗衣粉",            // Chinese
    "category": "Household"   // Filter Category
    // ...other languages (de, es, fr, etc.)
  },
  ...
]

### 2. `dictionary` Node
```json
[
  {
    "id": 1,
    "s": "个",       // Simplified Chinese
    "t": "个",       // Traditional Chinese
    "p": "gè",       // Pinyin
    "e": "piece...", // English Definition
    "k": "낱 개"      // Korean Definition
  },
  ...
]

### 3. `users` Node
```json
{
  "USER_UID_123": {
    "stats": {
      "2023-10-27": {
        "quiz": 50,       // Points earned in Quiz
        "flashcard": 10   // Points earned in Flashcards
      }
    },
    "achievements": { ... }
  }
}
