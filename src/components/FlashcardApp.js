import { createCardDOM } from './Card';
import { vocabService } from '../services/vocabService';

export class FlashcardApp {
    constructor() {
        this.currentIndex = 0;
        this.container = null;
    }

    // This method injects the Component's HTML into the page
    mount(elementId) {
        const root = document.getElementById(elementId);
        if (!root) return;

        // The Component HTML Template
        root.innerHTML = `
            <header>
                <h1>単語 Master</h1>
            </header>
            <main id="card-display-area"></main>
            <div class="controls">
                <button id="prev-btn">Previous</button>
                <button id="next-btn">Next</button>
            </div>
        `;

        // Grab references to the new elements we just created
        this.container = document.getElementById('card-display-area');
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        document.getElementById('prev-btn').addEventListener('click', () => this.prev());
        document.getElementById('next-btn').addEventListener('click', () => this.next());
    }

    next() {
        const list = vocabService.getAll();
        if (this.currentIndex < list.length - 1) {
            this.currentIndex++;
            this.render();
        } else {
            this.currentIndex = 0;
            this.render();
        }
    }

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.render();
        }
    }

    // Public method to force a refresh (e.g. when language changes)
    refresh() {
        this.render();
    }

    render() {
        const list = vocabService.getFlashcardData();
        
        if (!list || list.length === 0) {
            this.container.innerHTML = '<p>No data found.</p>';
            return;
        }

        this.container.innerHTML = '';
        const data = list[this.currentIndex];
        const card = createCardDOM(data);
        this.container.appendChild(card);
    }
}

// Export a single instance
export const flashcardApp = new FlashcardApp();
