# Polyglot Flashcards

**Polyglot Flashcards** is a sophisticated, web-based language learning application focused on Japanese, Chinese, and other languages. It goes beyond simple flashcards by offering four distinct game modes, a highly customizable audio engine, and an advanced Japanese text tokenizer that understands grammar rules to create meaningful sentence chunks.

---

## File Structure & Descriptions

| File Name | Description |
| :--- | :--- |
| **`src/index.html`** | The main entry point. Contains the responsive shell, the four game views (`#flashcard-view`, `#quiz-view`, `#sentences-view`, `#blanks-view`), the Settings Modal, and the "Red Box" Error Console for mobile debugging. |
| **`src/index.js`** | The central controller. Handles routing between games, initializes the app, manages global UI state (Dark Mode, Fonts), and binds navigation events. |
| **`src/services/textService.js`** | **Core Logic Engine**. Contains the `tokenizeJapanese` algorithm which uses `Intl.Segmenter` combined with a multi-phase post-processor to merge particles, suffixes, and punctuation into logical blocks. Also handles `fitText` resizing. |
| **`src/services/audioService.js`** | A robust wrapper for the Web Speech API. Supports "Wait for Audio" (callbacks), auto-play logic, and smart string parsing (e.g., ignoring special separators like `・` or `[]` in Japanese vocab). |
| **`src/services/settingsService.js`** | Manages persistence of user preferences (Language targets, Audio toggles, Game specific options) to `localStorage`. |
| **`src/services/vocabService.js`** | Manages the vocabulary dataset, providing random fetchers and ID-based lookups. |
| **`src/services/blanksService.js`** | Generates "Fill in the Blank" questions by dynamically finding vocabulary words (or their conjugated stems) within example sentences and replacing them with underscores. |
| **`src/components/FlashcardApp.js`** | The classic study mode with 3D card flipping, auto-play audio, and random navigation. |
| **`src/components/QuizApp.js`** | A 2-4 choice vocabulary drill. Features a responsive Grid layout (Split view on Tablet) and visual/audio feedback for correct/incorrect answers. |
| **`src/components/SentencesApp.js`** | A sentence reconstruction game. Uses the `textService` to scramble sentences into logical chunks (not just characters) and features a "Sparkles" toggle to compare raw vs. smart processing. |
| **`src/components/BlanksApp.js`** | A context-based game where users identify the missing word in a sentence. Features a "non-wobbly" UI using invisible text overlays to maintain layout stability during answer reveals. |

---

## Key Features & Mechanics

### 1. Advanced Japanese Tokenizer (`textService.js`)
* **Standard Splitting**: Uses the browser's native `Intl.Segmenter` to split Japanese text into dictionary words.
* **Grammar Post-Processing**: A custom rule engine iterates through the segments to merge them into natural speaking chunks:
    * **Phonetic Glue**: Merges small kana (`っ`, `ゃ`, `ゅ`, `ょ`, `ん`) to the preceding sound.
    * **Suffixes & Particles**: Aggressively merges 50+ grammatical suffixes (`-ます`, `-した`, `-さん`, `-たい`, `-ね`, `-から`) to their root words.
    * **Punctuation**: Merges `。` and `、` to the preceding block at the very end of processing.
* **Vocab Consistency**: Ensures the target vocabulary word *never* gets chopped. If the target word (e.g., "言い訳") appears in the sentence, the tokenizer forces a merge of any split blocks (e.g., "言い" + "訳") to preserve the answer key.

### 2. Game Modes
* **Flashcards**: Standard study with "Smart Fit" text resizing and auto-play audio.
* **Quiz**: Configurable (2-4 choices). On tablets, uses a split-screen layout (Question Left / Answers Right) to maximize screen real estate.
* **Sentences**: Users build sentences from a word bank. Supports "Post-Processing Toggle" to visualize how the tokenizer groups words differently.
* **Blanks**: Context learning. Audio engine pauses intelligently where the blank is ("Kare wa ...[pause]... mashita") for a realistic listening test.

### 3. Audio Engine
* **Wait Mode**: Optional setting to force the app to wait until the current audio track finishes before loading the next question.
* **Smart Parsing**: Automatically strips reading aids (like `・` in `言い訳・言分け`) so the TTS engine pronounces words naturally.
* **Feedback Audio**: Distinct audio behaviors for clicking answer choices versus confirming the correct answer (reading the full sentence).

### 4. Developer Tools
* **Mobile Debugging**: Includes a built-in "Red Box" Error Console that intercepts JavaScript errors on mobile devices (where DevTools are unavailable) and provides a "Copy to Clipboard" button for easy reporting.
* **Responsive Design**: Tailored layouts for Portrait (Mobile) vs. Landscape/Split (Tablet) orientations across all game modes.
