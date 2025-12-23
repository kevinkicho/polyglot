# Polyglot.AI

**Polyglot.AI** is a robust, web-based language learning ecosystem built to help users master vocabulary and sentence structure through a wide variety of interactive game modes. It leverages Firebase for real-time data and authentication, offering a highly customizable experience with support for complex scripts (Japanese, Chinese, Korean) and intelligent audio handling.

---

## 📂 File Structure & Architecture

The application uses a modular architecture with distinct services handling logic, managers orchestrating state, and components handling the UI for each game mode.

| File Path | Description |
| :--- | :--- |
| **`src/index.html`** | The application shell containing the main menu, settings modals, and dynamic view containers for all 15 game modes. |
| **`src/index.js`** | The entry point. Initializes core services and managers (View, Auth, UI) and sets up global event listeners. |
| **`src/managers/`** | Orchestrates app-wide systems:<br>• **`ViewManager.js`**: Handles routing and view transitions.<br>• **`AuthManager.js`**: Manages Firebase user sessions.<br>• **`UIManager.js`**: Controls global UI (charts, settings).<br>• **`EditorManager.js`**: Handles Admin content editing tools. |
| **`src/services/`** | Contains core business logic: <br>• **`textService.js`**: The central engine for CJK text processing, tokenization, and smart wrapping.<br>• **`audioService.js`**: Manages TTS and prevents "Origin" language audio playback.<br>• **`vocabService.js`**: Manages data synchronization with Firebase.<br>• **`scoreService.js`** & **`achievementService.js`**: Tracks stats, streaks, and gamification badges. |
| **`src/components/`** | Individual game logic classes. Each class (e.g., `QuizApp`, `GravityApp`) encapsulates its own game loop and DOM manipulation. |

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
The app uses a custom single-page application (SPA) router managed by `src/managers/ViewManager.js`.
* **State Management**: It utilizes `history.pushState` to manage URL hashes (e.g., `#/quiz`, `#/gravity`) without reloading the page.
* **View Rendering**: A `render()` function orchestrates the transition. It hides all view containers, unmounts the current game instance (stopping audio/timers), and mounts the requested game component.
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

# Application Code Reference

This document lists every file in the codebase, detailing every function contained within components, managers, and services, along with a one-sentence declaration of its purpose.

---

## 📂 Entry Points & Configuration (`src/`)

### **`src/index.js`**
The main entry point for the application that handles initialization.
* **`populateLanguageDropdowns()`**: Populates the target and origin language select elements in the UI with the supported language options.
* **`loadApplicationData()`**: Orchestrates the application startup by initializing services, fetching data, and hiding the splash screen.
* **`document.addEventListener('DOMContentLoaded', ...)`**: Sets up the initial application state, initializes managers, and triggers authentication checks when the DOM is ready.

### **`src/sw.js`**
The Service Worker file responsible for offline capabilities (PWA).
* **`self.addEventListener('install', ...)`**: Caches the essential application shell files immediately upon service worker installation.
* **`self.addEventListener('activate', ...)`**: Cleans up outdated cache versions to ensure the user receives the latest assets.
* **`self.addEventListener('fetch', ...)`**: Intercepts network requests to serve cached assets or fall back to the network, including specific handling for Google Fonts.

---

## 💼 Managers (`src/managers/`)

### **`src/managers/AuthManager.js`**
Manages user authentication states and transitions.
* **`init(onLoginSuccess)`**: Initializes the Firebase Auth listener to handle user sessions and update the UI upon login or logout.
* **`handleLoginMigration()`**: orchestrates the process of signing in with Google and migrating any anonymous progress to the permanent account.
* **`getCurrentUser()`**: Returns the currently authenticated Firebase user object.

### **`src/managers/EditorManager.js`**
Controls the administrative content editor functionality.
* **`init()`**: Initializes global event listeners for the editor and exposes helper functions for inline HTML actions.
* **`updatePermissions(user)`**: Checks the current user's email to enable or disable admin-only buttons like "Save Vocab".
* **`bindEvents()`**: Attaches click event listeners to editor-specific buttons and the global edit icon.
* **`openEditModalForActiveApp()`**: Identifies the currently active game item and populates the editor modal with its vocabulary data.
* **`switchEditTab(tab)`**: Toggles the visibility between the vocabulary editing fields and the dictionary search results.
* **`renderVocabEditFields(data)`**: Dynamically generates and populates input fields for all properties of the selected vocabulary item.
* **`populateDictionaryEdit(text)`**: Searches the dictionary for unique characters in the text and displays editable entries.
* **`saveVocab(btn)`**: Collects data from the input fields and persists changes to the Firebase `vocab` node.
* **`saveDict(btn)`**: Collects changes from the dictionary edit list and saves them to the Firebase `dictionary` node.

### **`src/managers/UIManager.js`**
Handles global UI elements like settings, scores, and charts.
* **`init()`**: Initializes bindings for score displays, achievements, settings, and fullscreen toggles.
* **`bindAchievements()`**: Sets up listeners to display a popup notification whenever an achievement is unlocked.
* **`showAchievementsModal()`**: Fetches and displays the user's unlocked and locked achievements in a modal.
* **`bindScore()`**: Subscribes to score updates to refresh the global display and initializes the weekly progress chart logic.
* **`showScoreChart()`**: Fetches weekly stats from the database and renders an interactive bar chart of user progress.
* **`updateScoreDisplay()`**: Toggles the main score readout between the daily total and the weekly total.
* **`bindSettings()`**: Attaches event listeners to settings inputs (like dark mode or volume) to trigger immediate application updates.
* **`bindSetting(id, key, cb)`**: Helper function that links a specific DOM element to a setting key in the settings service.
* **`openSettings()`**: Populates the settings modal with current values and makes it visible.
* **`closeSettings()`**: Hides the settings modal with a fade-out animation.
* **`loadSettingsToUI()`**: Reads current values from the settings service and updates the UI inputs to match.

### **`src/managers/ViewManager.js`**
Manages navigation and view rendering.
* **`init()`**: Maps DOM elements to view names and sets up global navigation event listeners.
* **`bindNavigation()`**: Attaches click listeners to main menu buttons to handle view transitions.
* **`render(viewName)`**: Hides all view containers, mounts the requested game component, and manages browser history.
* **`getActiveApp()`**: Returns the instance of the currently running game application component.

---

## 🛠️ Services (`src/services/`)

### **`src/services/achievementService.js`**
Manages gamification logic and achievement tracking.
* **`getUserAchievements(uid)`**: Fetches the map of unlocked achievements for a specific user from Firebase.
* **`checkLoginAchievements(uid)`**: Checks and unlocks "First Login" type achievements when a user signs in.
* **`checkScoreAchievements(uid, gameKey, pointsAdded, newTodayScore)`**: Evaluates user stats against achievement criteria to unlock new badges dynamically.
* **`unlock(uid, achId, achData)`**: Writes a new achievement to the database, increments the user's score, and dispatches an unlock event.

### **`src/services/audioService.js`**
Handles Text-to-Speech (TTS) functionality.
* **`loadVoices()`**: Populates the internal list of available browser speech synthesis voices.
* **`getVoice(lang)`**: Selects the most appropriate voice object for a given language code.
* **`sanitizeText(text, lang)`**: Cleans input text by removing brackets or special characters to improve TTS pronunciation.
* **`speak(text, lang)`**: Plays the provided text using the Web Speech API and returns a promise that resolves when audio ends.
* **`stop()`**: Immediately cancels any currently playing speech synthesis utterance.

### **`src/services/blanksService.js`**
Generates data for the "Blanks" game mode.
* **`generateQuestion(targetId)`**: Creates a game object containing a sentence with a missing word and a set of distractor choices.

### **`src/services/dictionaryService.js`**
Manages dictionary data fetching and lookups.
* **`fetchData()`**: Downloads the dictionary dataset from Firebase and builds an efficient in-memory index.
* **`lookupText(text)`**: Scans a string for CJK characters and returns any matching dictionary entries.
* **`saveEntry(key, data)`**: Updates a specific dictionary entry in Firebase with new definition or pinyin data.

### **`src/services/firebase.js`**
Initializes the Firebase application connection.
* *(Exports initialized `app`, `db`, `auth`, and `googleProvider` instances alongside auth/database helper functions)*.

### **`src/services/quizService.js`**
Generates data for the "Quiz" game mode.
* **`generateQuestion(specificId)`**: Generates a multiple-choice question object with one correct answer and three random distractors.

### **`src/services/scoreService.js`**
Tracks and persists user statistics.
* **`init()`**: Sets up an authentication listener to start or stop tracking stats based on user login state.
* **`getDateStr(dateObj)`**: Formats a date object into a consistent string key (e.g., "12-25-2023") for database storage.
* **`listenToToday()`**: Subscribes to the user's realtime stats for the current day to keep the score counter updated.
* **`getSnapshot()`**: Retrieves a one-time snapshot of all user stats, primarily used during account migration.
* **`migrateStats(oldData)`**: Transfers statistics from an anonymous session to a newly signed-in Google account.
* **`addScore(gameType, points)`**: Atomically increments the score, win count, and streaks in Firebase for the given game.
* **`subscribe(cb)`**: Allows UI components to register a callback function that runs whenever the score changes.
* **`notify()`**: Broadcasts the current score to all subscribers and updates global score display elements.
* **`getUserStatsRef()`**: Returns the Firebase database reference to the current user's statistics node.

### **`src/services/settingsService.js`**
Manages user preferences and configuration.
* **`load()`**: Retrieves saved user settings from LocalStorage or returns default values if none exist.
* **`save()`**: Persists the current settings object to the browser's LocalStorage.
* **`get()`**: Returns the current settings object.
* **`set(key, value)`**: Updates a specific setting key with a new value and saves the changes.

### **`src/services/textService.js`**
Handles text processing, resizing, and tokenization.
* **`fitText(el, min, max, enforceNoWrap)`**: Iteratively adjusts the font size of an element so it fits perfectly within its container.
* **`fitGroup(elements, min, max)`**: Applies the fitText logic to a list of elements to ensure uniform sizing.
* **`smartWrap(text)`**: Wraps text containing special separators into vertical stacks for better visual layout.
* **`tokenizeJapanese(text, vocab, applyPostProcessing)`**: Breaks a Japanese sentence into morphological chunks for the Sentences game.
* **`postProcessJapanese(chunks, vocab)`**: Refines tokenized chunks by merging punctuation and particles to ensure grammatical correctness.

### **`src/services/vocabService.js`**
Manages vocabulary data synchronization.
* **`init()`**: Connects to the Firebase `vocab` node and listens for realtime data changes.
* **`processRawData(snapshot)`**: Converts the Firebase snapshot into a raw array and triggers language remapping.
* **`remapLanguages(targetCode, originCode)`**: Dynamically builds the Question and Answer objects for every item based on selected languages.
* **`saveItem(firebaseKey, data)`**: Updates a vocabulary item in Firebase with edited fields.
* **`reload()`**: Re-initializes the service to fetch fresh data.
* **`hasData()`**: Checks if the vocabulary list is populated.
* **`getAll()`**: Returns the complete list of processed vocabulary items.
* **`findIndexById(id)`**: Finds the array index of an item with the specific numeric ID.
* **`getRandomIndex()`**: Returns a random valid index from the vocabulary list.
* **`subscribe(callback)`**: Registers a listener to be notified when vocabulary data changes.
* **`notify()`**: Alerts all subscribers that the vocabulary data has been updated.

---

## 🎮 Components (`src/components/`)

### **`src/components/BlanksApp.js`**
The "Fill in the Blanks" game logic.
* **`mount(elementId)`**: Initializes the Blanks game into the DOM and loads the first question.
* **`random()`**: Selects a random vocabulary item and loads a new game round.
* **`next(id)`**: Advances to the next question in the list or jumps to a specific ID.
* **`prev()`**: Returns to the previous question in the list order.
* **`loadGame()`**: Generates the puzzle data using the blanks service and triggers the render.
* **`renderError()`**: Displays an error message if valid sentence data cannot be found.
* **`bind(selector, event, handler)`**: Attaches event listeners to game elements.
* **`playBlankedSentence()`**: Plays the audio of the sentence with a calculated pause inserted where the blank exists.
* **`handleOptionClick(id, el, choiceText)`**: Processes a user's answer selection, handling double-click safety checks if enabled.
* **`submitAnswer(id, el)`**: Validates the answer, updates the score, reveals the correct word, and advances the game.
* **`render()`**: Draws the sentence with the missing word pill and the multiple-choice options.

### **`src/components/Card.js`**
A functional component for rendering Flashcards.
* **`Card(item, isFlipped)`**: Returns the HTML string for a Flashcard, rendering either the front (Question) or back (Answer) state.

### **`src/components/ConstructorApp.js`**
The "Word Constructor" spelling game.
* **`mount(elementId)`**: Initializes the game container and sets up category filters.
* **`refresh()`**: Reloads the current game state to reflect data changes.
* **`updateCategories()`**: Extracts unique categories from the vocab list for the filter bar.
* **`setCategory(cat)`**: Filters the word list by category and restarts the game.
* **`getFilteredList()`**: Returns the vocab list filtered by the currently active category.
* **`random()`**: Picks a random word and starts a new round.
* **`next(id)`**: Moves to the next word in the list.
* **`prev()`**: Moves to the previous word in the list.
* **`gotoId(id)`**: Jumps to a specific vocabulary ID.
* **`loadGame()`**: Prepares the word by stripping special characters and shuffling the letter tiles.
* **`handlePoolClick(poolIdx)`**: Moves a selected character tile from the pool to the answer slot.
* **`handleBuiltClick(builtPos)`**: Returns a character from the answer slot back to the pool.
* **`updateTileState(poolIdx, isUsed)`**: Visually disables or enables a tile in the pool.
* **`updateSlots()`**: Re-renders the answer area with the currently built word.
* **`checkWin()`**: Compares the built word against the target and handles the win condition.
* **`playHint()`**: Plays the audio for the target word as a hint.
* **`render()`**: Generates the full HTML layout for the game, including the question box and letter grid.

### **`src/components/DecoderApp.js`**
The "Audio Decoder" listening spelling game.
* **`mount(elementId)`**: Initializes the Decoder game.
* **`refresh()`**: Reloads the current game round.
* **`updateCategories()`**: Updates category filter pills.
* **`setCategory(cat)`**: Sets the active category and restarts.
* **`getFilteredList()`**: Gets items matching the current category.
* **`random()`**: Loads a random item.
* **`next(id)`**: Moves to the next item.
* **`prev()`**: Moves to the previous item.
* **`gotoId(id)`**: Jumps to a specific ID.
* **`loadGame()`**: Sets up the game state, shuffling character tiles for the target word.
* **`playAudio()`**: Plays the target word audio, which serves as the primary clue.
* **`handlePoolClick(poolIdx)`**: Moves a tile to the answer slot.
* **`handleBuiltClick(builtPos)`**: Removes a tile from the answer slot.
* **`updateTileState(poolIdx, isUsed)`**: Updates the visual state of a tile (used/unused).
* **`updateSlots()`**: Renders the current state of the answer slots.
* **`checkWin()`**: Checks if the constructed word matches the target.
* **`render()`**: Draws the game UI, including the audio replay button and tile grid.

### **`src/components/FinderApp.js`**
The "Word Finder" grid game.
* **`mount(elementId)`**: Initializes the Finder game.
* **`updateCategories()`**: Updates category filters.
* **`setCategory(cat)`**: Sets the filter category.
* **`getFilteredList()`**: Gets filtered items.
* **`next(id)`**: Navigates to the next question.
* **`prev()`**: Navigates to the previous question.
* **`random()`**: Navigates to a random question.
* **`gotoId(id)`**: Jumps to a specific ID.
* **`loadGame()`**: Selects a target word and 8 distractors to populate the 3x3 grid.
* **`handleChoice(id, el)`**: Checks if the clicked grid item is the correct answer to the prompt.
* **`playHint()`**: Plays audio for the target word.
* **`render()`**: Renders the 3x3 grid of choices and the definition prompt.

### **`src/components/FlashcardApp.js`**
The Flashcard viewer component.
* **`mount(elementId)`**: Initializes the Flashcard viewer.
* **`bind(selector, event, handler)`**: Attaches event listeners to specific elements.
* **`refresh()`**: Deeply reloads the current card to reflect language or data changes.
* **`loadGame(index)`**: Loads data for a specific list index and renders the card.
* **`next(id)`**: Advances to the next card.
* **`prev()`**: Goes back to the previous card.
* **`goto(id)`**: Jumps to a specific card ID.
* **`handleCardClick()`**: Flips the card between front/back and triggers audio.
* **`playAudio()`**: Plays the text associated with the currently visible side of the card.
* **`render()`**: Generates the container HTML and injects the Card component content.

### **`src/components/GravityApp.js`**
The "Gravity" falling words game.
* **`mount(elementId)`**: Initializes the Gravity game container.
* **`refresh()`**: Stops the game and shows the start screen.
* **`updateCategories()`**: Updates category filters.
* **`setCategory(cat)`**: Sets the filter category.
* **`getFilteredList()`**: Gets filtered items.
* **`showStartScreen()`**: Renders the initial "Start Game" overlay.
* **`startGame()`**: Resets score and lives, then starts the game loop.
* **`stopGame()`**: Cancels the animation frame and clears the game board.
* **`gameOver()`**: Displays the Game Over screen with the final score.
* **`pickNewTarget()`**: Selects a new target meaning that the user must match.
* **`spawnAsteroid()`**: Creates a falling word element (either the target or a distractor).
* **`handleAsteroidClick(id, el)`**: Checks if the clicked asteroid matches the current target meaning.
* **`gameLoop(timestamp)`**: The main animation loop that updates asteroid positions and handles spawning.
* **`updateStats()`**: Updates the score and lives display.
* **`updateTargetDisplay()`**: Updates the target meaning text at the bottom of the screen.
* **`renderLayout()`**: Renders the static game structure (header, game area, footer).

### **`src/components/ListeningApp.js`**
The "Listening" quiz game.
* **`mount(elementId)`**: Initializes the Listening game.
* **`updateCategories()`**: Updates category filters.
* **`setCategory(cat)`**: Sets the filter category.
* **`getFilteredList()`**: Gets filtered items.
* **`bind(selector, event, handler)`**: Binds events.
* **`random()`**: Loads a random question.
* **`next(id)`**: Navigates to the next question.
* **`playAudio()`**: Plays the target word audio and updates the button visual state.
* **`loadGame()`**: Prepares a question with one audio target and three text choices.
* **`handleChoice(id, el)`**: Validates the user's selection against the played audio.
* **`renderButtonState()`**: Toggles the visual "playing" state of the main audio button.
* **`render()`**: Draws the layout with the large audio button and choice list.

### **`src/components/MatchApp.js`**
The "Match" pairs game.
* **`mount(elementId)`**: Initializes the Match game.
* **`refresh()`**: Restarts the game.
* **`updateCategories()`**: Updates filters.
* **`setCategory(cat)`**: Sets filter.
* **`getFilteredList()`**: Gets filtered items.
* **`startNewGame()`**: Selects 6 pairs of items and shuffles them into a grid.
* **`handleCardClick(idx, el)`**: Manages selection logic, checking for matches between target and origin cards.
* **`render()`**: Renders the grid of 12 cards.

### **`src/components/MemoryApp.js`**
The "Memory" concentration game.
* **`mount(elementId)`**: Initializes the Memory game.
* **`updateCategories()`**: Updates filters.
* **`setCategory(cat)`**: Sets filter.
* **`getFilteredList()`**: Gets filtered items.
* **`startNewGame()`**: Creates a deck of pairs and resets the board.
* **`handleCardClick(idx)`**: Handles card flipping logic, checking for pairs and managing the "flipped" state.
* **`next()`**: Starts a new game.
* **`prev()`**: Starts a new game.
* **`render()`**: Renders the grid of face-down (or flipped) cards.

### **`src/components/QuizApp.js`**
The "Multiple Choice" quiz game.
* **`mount(elementId)`**: Initializes the Quiz game.
* **`refresh()`**: Regenerates the current question to reflect data changes.
* **`updateCategories()`**: Updates filters.
* **`setCategory(cat)`**: Sets filter.
* **`getFilteredList()`**: Gets filtered items.
* **`bind(selector, event, handler)`**: Binds events.
* **`random()`**: Generates a random question.
* **`next(id)`**: Generates the next question.
* **`prev()`**: Generates the previous question.
* **`renderError()`**: Shows an error if there are insufficient words.
* **`handleOptionClick(id, el, choiceText)`**: Handles selection, including double-click safety logic.
* **`submitAnswer(id, el)`**: Validates the answer and updates the score.
* **`render()`**: Renders the question card and the four answer options.

### **`src/components/ReverseApp.js`**
The "Reverse Quiz" game (Definition -> Word).
* **`mount(elementId)`**: Initializes the Reverse Quiz game.
* **`updateCategories()`**: Updates filters.
* **`setCategory(cat)`**: Sets filter.
* **`getFilteredList()`**: Gets filtered items.
* **`random()`**: Navigation random.
* **`next(id)`**: Navigation next.
* **`prev()`**: Navigation prev.
* **`gotoId(id)`**: Navigation jump.
* **`loadGame()`**: Sets up a question where the prompt is the definition (Origin) and choices are the words (Target).
* **`handleChoice(id, el)`**: Validates the answer.
* **`playHint()`**: Plays audio for the target answer.
* **`render()`**: Renders the definition prompt and target word choices.

### **`src/components/SentencesApp.js`**
The "Sentence Builder" game.
* **`mount(elementId)`**: Initializes the Sentences game.
* **`refresh()`**: Reloads the game.
* **`random()`**: Navigation random.
* **`next(id)`**: Navigation next.
* **`prev()`**: Navigation prev.
* **`gotoId(id)`**: Navigation jump.
* **`loadGame()`**: Tokenizes the target sentence into a pool of shuffled words.
* **`handlePoolClick(poolIdx)`**: Moves a word from the pool to the sentence construction area.
* **`handleBuiltClick(builtPos)`**: Removes a word from the constructed sentence.
* **`updateTileVisuals(poolIdx, isUsed)`**: Toggles the visual state of pool tiles.
* **`updateSlots()`**: Renders the constructed sentence.
* **`checkWin()`**: Checks if the constructed sentence matches the target.
* **`playHint()`**: Plays the full sentence audio.
* **`render()`**: Renders the game layout with the answer area and word pool.

### **`src/components/SpeechApp.js`**
The "Speech Practice" game.
* **`mount(elementId)`**: Initializes the Speech game and speech recognition.
* **`refresh()`**: Reloads the game.
* **`initSpeech()`**: Sets up the browser's SpeechRecognition API events.
* **`updateCategories()`**: Updates filters.
* **`setCategory(cat)`**: Sets filter.
* **`getFilteredList()`**: Gets filtered items.
* **`random()`**: Navigation random.
* **`next(id)`**: Navigation next.
* **`prev()`**: Navigation prev.
* **`gotoId(id)`**: Navigation jump.
* **`loadGame()`**: Loads the current item for pronunciation practice.
* **`getLangCode()`**: Maps the target language setting to a BCP 47 language tag.
* **`toggleMic()`**: Starts or stops the speech recognition service.
* **`checkAnswer(transcript)`**: Compares the user's spoken transcript against the target word.
* **`updateMicVisuals()`**: Updates the microphone button style based on listening state.
* **`playHint()`**: Plays the correct pronunciation of the target word.
* **`render()`**: Renders the microphone button and feedback area.

### **`src/components/TrueFalseApp.js`**
The "True or False" rapid review game.
* **`mount(elementId)`**: Initializes the True/False game.
* **`updateCategories()`**: Updates filters.
* **`setCategory(cat)`**: Sets filter.
* **`getFilteredList()`**: Gets filtered items.
* **`random()`**: Navigation random.
* **`next(id)`**: Navigation next.
* **`prev()`**: Navigation prev.
* **`gotoId(id)`**: Navigation jump.
* **`loadGame()`**: Creates a pair of items that is either a correct match or a mismatch.
* **`playAudio()`**: Plays the audio for the displayed word.
* **`handleGuess(userGuessedTrue)`**: Validates the user's True/False selection against the generated pair.
* **`render()`**: Renders the word and definition pair with YES/NO buttons.

### **`src/components/WritingApp.js`**
The "Writing" translation game.
* **`mount(elementId)`**: Initializes the Writing game.
* **`refresh()`**: Reloads the game.
* **`updateCategories()`**: Updates filters.
* **`setCategory(cat)`**: Sets filter.
* **`getFilteredList()`**: Gets filtered items.
* **`random()`**: Navigation random.
* **`next(id)`**: Navigation next.
* **`prev()`**: Navigation prev.
* **`gotoId(id)`**: Navigation jump.
* **`loadGame()`**: Loads a question requiring the user to type the translation of the displayed definition.
* **`revealAnswer()`**: Fills the input with the correct answer as a hint.
* **`checkAnswer()`**: Validates the user's typed input against the correct answer variations.
* **`playHint()`**: Plays the audio of the target answer.
* **`render()`**: Renders the definition prompt and text input field.
