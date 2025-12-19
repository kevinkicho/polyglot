# Polyglot Flashcards

**Polyglot Flashcards** is a sophisticated, web-based language learning application focused on Japanese, Chinese, and other languages. It goes beyond simple flashcards by offering four distinct game modes, a highly customizable audio engine, and a realtime cloud database with offline support.

---

## File Structure & Descriptions

| File Name | Description |
| :--- | :--- |
| **`src/index.html`** | The main entry point. Contains the responsive shell, the four game views (`#flashcard-view`, `#quiz-view`, `#sentences-view`, `#blanks-view`), the Settings Modal, and the "Red Box" Error Console for mobile debugging. |
| **`src/index.js`** | The central controller. Handles routing between games, initializes the app, manages global UI state (Dark Mode, Fonts), and binds navigation events. |
| **`src/services/firebase.js`** | **Backend Connectivity**. Manages the connection to Firebase Auth (Google Sign-In/Anonymous) and the Realtime Database. |
| **`src/services/vocabService.js`** | **Data Manager**. Handles data synchronization between Firebase and LocalStorage. Implements a robust "Offline-First" strategy where data is served immediately from cache while background updates occur. |
| **`src/services/textService.js`** | **Core Logic Engine**. Contains the advanced `tokenizeJapanese` algorithm. It uses `Intl.Segmenter` combined with a multi-phase post-processor to intelligently merge particles, suffixes, and punctuation into logical blocks for the Sentences game. |
| **`src/services/audioService.js`** | A robust wrapper for the Web Speech API. Supports global volume control, "Wait for Audio" callbacks, auto-play logic, and smart string parsing (e.g., ignoring special separators like `・` or `[]` in Japanese vocab). |
| **`src/services/settingsService.js`** | Manages persistence of user preferences (Language targets, Audio toggles, Volume, Game specific options) to `localStorage`. |
| **`src/services/blanksService.js`** | Generates "Fill in the Blank" questions by dynamically finding vocabulary words (or their conjugated stems) within example sentences and replacing them with underscores. |
| **`src/components/FlashcardApp.js`** | The classic study mode with 3D card flipping, auto-play audio, and random navigation. |
| **`src/components/QuizApp.js`** | A 2-4 choice vocabulary drill. Features a responsive Grid layout and "Double Click" protection to prevent accidental audio triggers during confirmation. |
| **`src/components/SentencesApp.js`** | A sentence reconstruction game. Uses the `textService` to scramble sentences into logical chunks (not just characters), creating a puzzle-like experience for learning grammar structure. |
| **`src/components/BlanksApp.js`** | A context-based game where users identify the missing word in a sentence. Features a "non-wobbly" UI using invisible text overlays to maintain layout stability during answer reveals. |

---

## Key Features & Mechanics

### 1. Cloud-Sync with Offline Support
* **Realtime Database**: Vocabulary and dictionary data are fetched from Firebase, allowing for instant content updates without redeploying the app.
* **Offline Caching**: The `VocabService` caches all data to `localStorage`. On app launch, it loads immediately from the cache for zero-latency startup, then silently updates from the cloud in the background.

### 2. Intelligent Japanese Tokenizer (`textService.js`)
* **Standard Splitting**: Uses the browser's native `Intl.Segmenter` (word granularity) as the foundation.
* **Grammar Post-Processing**: A sophisticated rule engine iterates through segments to create natural "speaking chunks":
    * **Phonetic Glue**: Merges small kana (`っ`, `ゃ`, `ゅ`, `ょ`, `ん`) to the preceding sound.
    * **Suffixes & Particles**: Merges grammatical suffixes (`-ます`, `-した`, `-さん`) and common particles (`-ね`, `-から`, `-は`) to their root words.
    * **Punctuation**: Merges `。` and `、` to the preceding block.
    * **Vocab Protection**: Ensures the specific target vocabulary word being tested is never split, even if the tokenizer would normally divide it.

### 3. Audio Engine
* **Global Volume**: A centralized volume slider in Settings allows users to mix the text-to-speech volume relative to their device volume.
* **Wait Mode**: Optional setting to force the app to wait until the current audio track finishes before loading the next question.
* **Smart Parsing**: Automatically strips reading aids (like `・` in `言い訳・言分け`) so the TTS engine pronounces words naturally.

### 4. Game Modes
* **Flashcards**: Standard study with "Smart Fit" text resizing and auto-play audio.
* **Quiz**: Configurable (2-4 choices). Supports "Double Click to Confirm" to prevent accidental answers.
* **Sentences**: Users build sentences from a word bank. The "chunks" are intelligently generated based on the target language's grammar rules.
* **Blanks**: Context learning. Audio engine pauses intelligently where the blank is ("Kare wa ...[pause]... mashita") for a realistic listening test.

### 5. Developer Tools
* **Mobile Debugging**: Includes a built-in "Red Box" Error Console that intercepts JavaScript errors on mobile devices and provides a "Copy to Clipboard" button for easy reporting.
* **Responsive Design**: Tailored layouts for Portrait (Mobile) vs. Landscape/Split (Tablet) orientations across all game modes.
