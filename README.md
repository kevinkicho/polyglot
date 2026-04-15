# Polyglot.AI

**Polyglot.AI** is a robust, web-based language learning ecosystem built to help users master vocabulary and sentence structure through 15 interactive game modes. It leverages Firebase for real-time data and authentication, offering a highly customizable experience with support for complex scripts (Japanese, Chinese, Korean) and intelligent audio handling.

---

## Tech Stack

- **Frontend**: Vanilla JS (ES Modules), Webpack 5, Tailwind CSS 3.4
- **Backend**: Firebase Realtime Database (v9+ modular SDK), Firebase Auth (Google + Anonymous)
- **PWA**: Service Worker with cache-first strategy and offline vocab caching
- **Testing**: Vitest + jsdom
- **Deployment**: Firebase Hosting
- **Responsive**: Portrait + landscape layouts for mobile, tablet, and desktop via custom `landscape:` Tailwind variant

---

## File Structure & Architecture

The application uses a modular architecture with services handling business logic, managers orchestrating state, and components handling game UI. All 15 game components extend a shared `BaseGameComponent` base class.

| File Path | Description |
| :--- | :--- |
| **`src/index.html`** | The application shell containing the main menu, settings modals, and dynamic view containers for all 15 game modes. |
| **`src/index.js`** | Entry point. Initializes core services (vocab, score, SRS) and managers (View, Auth, UI). |
| **`src/sw.js`** | Service Worker (v4). Network-first for vocab data, stale-while-revalidate for JS bundles, cache-first for app shell. |
| **`src/config/roles.js`** | Configurable admin email list with `isAdmin(user)` helper — replaces hardcoded email checks. |
| **`src/managers/`** | App-wide orchestrators: |
| | **`ViewManager.js`** — SPA router with `history.pushState` and view transitions. |
| | **`AuthManager.js`** — Firebase user sessions, Google sign-in, anonymous-to-permanent migration. |
| | **`UIManager.js`** — Thin coordinator that delegates to ScoreChartManager, AchievementManager, and SettingsManager. |
| | **`ScoreChartManager.js`** — Weekly score chart rendering, daily/weekly toggle, bar tooltips. |
| | **`AchievementManager.js`** — Achievement popup notifications and achievement list modal. |
| | **`SettingsManager.js`** — Settings modal, dark mode, volume, language selects. Auto-saves on change. |
| | **`EditorManager.js`** — Admin content editing with lazy-loaded dictionary service. |
| | **`ComboManager.js`** — Streak state, fuse timer, draggable combo UI, rank effects. |
| **`src/services/`** | Core business logic: |
| | **`textService.js`** — CJK text processing, fitText algorithm, tokenization, smart wrapping. |
| | **`audioService.js`** — TTS via Web Speech API with language-specific voice selection. |
| | **`vocabService.js`** — Firebase realtime sync, language remapping (front/back faces). |
| | **`scoreService.js`** — Score tracking, daily stats, achievement triggers. |
| | **`srsService.js`** — Leitner-box spaced repetition (5 boxes, weighted random selection). |
| | **`toastService.js`** — Toast/snackbar notifications (success/error/info/warning/confirm). |
| | **`achievementService.js`** — Gamification badges and unlock logic. |
| | **`settingsService.js`** — User preferences persisted to localStorage. |
| | **`dictionaryService.js`** — CJK dictionary lookups (lazy-loaded on first use). |
| **`src/components/`** | 15 game classes extending `BaseGameComponent`: FlashcardApp, QuizApp, BlanksApp, SentencesApp, ConstructorApp, FinderApp, MatchApp, MemoryApp, ListeningApp, WritingApp, TrueFalseApp, ReverseApp, SpeechApp, DecoderApp, GravityApp. |
| **`tests/`** | Unit tests (Vitest): settingsService, srsService, toastService. |

---

## Core Architecture

### BaseGameComponent

All 15 game components extend `BaseGameComponent`, which provides:

- **Lifecycle management**: `mount()`, `unmount()`, `refresh()` with auto-tracked timers and animation frames
- **Category filtering**: `updateCategories()`, `setCategory()`, `getFilteredList()`
- **Navigation**: `next()`, `prev()`, `random()`, `gotoId()` with SRS-weighted random selection
- **SRS integration**: `recordAnswer(vocabId, correct)` updates Leitner box levels
- **HTML rendering**: `renderHeader()`, `renderFooter()`, `renderCategoryPills()`, `renderError()`
- **Event binding**: `bindCommonEvents(prefix)` wires up close/prev/next/random/keyboard/category
- **Service accessors**: `vocabService`, `audioService`, `scoreService`, `settingsService`, `textService`, `toast`
- **Responsive layout**: `renderSplitLayout()` stacks vertically in portrait, splits 50/50 in landscape

### Spaced Repetition (SRS)

The app uses a Leitner-box system to prioritize weak vocabulary:

| Box | Weight | Meaning |
| :-- | :----- | :------ |
| 1 | 8x | New or incorrect — highest review priority |
| 2 | 4x | Early learning |
| 3 | 2x | Intermediate |
| 4 | 1x | Near mastery |
| 5 | 0.5x | Mastered — lowest priority |

- **Correct answer**: box goes up (max 5)
- **Wrong answer**: drops back to box 1
- **Random selection**: `weightedRandom()` picks items with lower boxes more frequently
- **Data stored at**: `users/{uid}/srs/{vocabId}` = `{ box, lastReview }`
- **Games tracking answers**: Quiz, Writing, Reverse, Finder, TrueFalse, Listening, Constructor (7 games actively track; all 15 benefit from weighted random)

### Toast Notification System

Replaces all native `alert()` and `confirm()` calls with styled toast notifications:

- **Methods**: `toast.success()`, `toast.error()`, `toast.info()`, `toast.warning()`
- **Confirm dialog**: `await toast.confirm(message)` returns a Promise (true/false)
- **Auto-dismiss**: Configurable duration with slide-in/out animations

---

## Text & Language Algorithms

### Special Character Handling & Smart Wrap
The application scans for special separators (`/`, `·`, `・`, `･`, `,`, `、`, `。`) to optimize display:

- **Grid layouts** (Finder, Match, Memory): Splits and stacks synonyms vertically
- **Constructor game**: Strips separators, randomly selects one variation for spelling

### fitText Algorithm
Dynamically sizes text to fill its container:

1. Starts at `max` font size, shrinks until `scrollWidth <= clientWidth` AND `scrollHeight <= clientHeight`
2. For flashcards: temporarily sets explicit height before measurement, then clears it so flex layout packs elements naturally
3. Text starts with `opacity-0` and fades in after sizing to prevent flash of unstyled content

### Language-Specific Tokenization
- **Japanese**: Custom morphological tokenizer (`textService.tokenizeJapanese`) breaks sentences into grammatically correct chunks for the Sentence Builder game
- **Post-processing**: Merges punctuation and particles for natural sentence segments

---

## Settings & Customization

| Section | Setting | Description |
| :--- | :--- | :--- |
| **Language** | Target / Origin | Language to learn vs. native language. Dynamically updates all game content. |
| **Audio** | Auto Play | Speaks the target word when a new card loads. |
| | Wait for Audio | Delays card flip until audio finishes. |
| | Touch-to-Speak | Click any text to hear pronunciation. |
| | Volume Slider | Global TTS volume control. |
| **Visuals** | Dark Mode | Tailwind `dark:` theme toggle. |
| | Fonts | Font family and weight selection. |
| **Card Display** | Show Vocab/Sent/Eng | Toggle flashcard field visibility. |
| **Game** | Double Click | First click selects, second submits (prevents mis-clicks). |
| | Win Animation | Toggle Sentence game celebration. |
| **Dictionary** | Enable Popup | Admin-only edit modal. |

---

## Navigation & UI

### SPA Router
Managed by `ViewManager.js` using `history.pushState` for hash-based routing (e.g., `#/quiz`, `#/gravity`). Supports browser back button via `popstate`.

### Top Bar
1. **Score Pill** — Today's total XP; opens Weekly Progress Chart
2. **Edit Button** (Admin) — Context-aware editor for current vocab item
3. **Settings Cog** — Global settings modal
4. **User Profile** — Firebase Auth (Google Sign-In/Out)

### Admin Access
Admin permissions are controlled via `src/config/roles.js` — a configurable array of admin email addresses. Admins can edit vocabulary and dictionary entries.

---

## Combo System

### Decaying Fuse Timer
- 5-second fuse; expiry drops to previous rank threshold (not full reset)
- Timer pauses during TTS audio playback

### Right-Anchored Drag Physics
- Combo UI position stored relative to right edge — survives resize/rotation

### Progressive Rank Effects (20 ranks)
- **A+**: Screen flash
- **S**: Random paint splats
- **SS**: Animated dancers
- **SSS+**: Gold rain particle simulation

---

## Firebase Realtime Database

### Realtime Data Sync
`vocabService` attaches an `onValue()` listener. When data changes server-side, all active game components receive updates via the subscriber pattern and call `refresh()`.

### Database Structure

#### `vocab` Node
```json
{
  "id": 0,
  "ja": "洗剤",
  "ja_furi": "せんざい",
  "ja_roma": "senzai",
  "en": "detergent",
  "en_ex": "Use only...",
  "ko": "세제",
  "zh": "洗衣粉",
  "category": "Household"
}
```

#### `dictionary` Node
```json
{
  "id": 1,
  "s": "个",
  "t": "个",
  "p": "gè",
  "e": "piece...",
  "k": "낱 개"
}
```

#### `users/{uid}` Node
```json
{
  "stats": {
    "01-15-2025": { "quiz": 50, "flashcard": 10 },
    "total": { "score": 1200, "quiz": 800, "quiz_wins": 160 }
  },
  "achievements": { "first_login": { "unlockedAt": 1700000000000 } },
  "srs": {
    "42": { "box": 3, "lastReview": 1700000000000 }
  }
}
```

### Security Rules
- **`vocab`** / **`dictionary`**: Authenticated read, admin-only write
- **`users/$uid`**: Owner read/write only
- **`stats`**: Values validated as numbers
- **`srs`**: Validated shape (`box` and `lastReview` must be numbers)
- **`achievements`**: Validated shape (`unlockedAt` must be a number)

---

## Service Worker (PWA)

Version 4 with three caching strategies:

| Strategy | Scope | Behavior |
| :--- | :--- | :--- |
| Cache-first | App shell (`/`, `index.html`, icons) | Serve from cache, update in background |
| Stale-while-revalidate | JS bundles (`*.js`, `*.chunk.js`) | Serve cached, fetch fresh copy for next load |
| Network-first | Vocab data (`polyglot-data` cache) | Try network, fall back to cache for offline |
| Bypass | Firebase API, Google APIs | Always fetch from network |

---

## Testing

Unit tests use **Vitest** with **jsdom** environment:

```bash
npm test          # Run all tests
npx vitest        # Watch mode
```

| Test File | Coverage |
| :--- | :--- |
| `tests/settingsService.test.js` | Defaults, set/persist, merge, corrupted localStorage |
| `tests/srsService.test.js` | Box defaults, correct/wrong answers, cap at 5, weighted random distribution |
| `tests/toastService.test.js` | Container creation, toast elements, auto-remove, confirm promise |

---

## Development

```bash
npm install       # Install dependencies
npm start         # Start dev server (webpack-dev-server)
npm run build     # Production build
npm test          # Run unit tests
```

## Deployment

```bash
npm run build                    # Build production bundle
npx firebase deploy              # Deploy to Firebase Hosting
npx firebase deploy --only database  # Deploy database rules only
```
