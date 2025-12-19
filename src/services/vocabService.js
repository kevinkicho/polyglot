import { db } from './firebase';
import { ref, onValue } from 'firebase/database';

class VocabService {
    constructor() {
        this.vocabData = [];
        this.categoryMap = {};
        this.subscribers = [];
        this.isInitialized = false;
    }

    /**
     * Initialize the service:
     * 1. Load from LocalStorage (Instant / Offline support)
     * 2. Listen to Firebase (Realtime / Online support)
     */
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        // 1. Load Local Cached Data (Offline Support)
        const cached = localStorage.getItem('polyglot_vocab_cache');
        if (cached) {
            try {
                this.processData(JSON.parse(cached));
                console.log("[Vocab] Loaded from cache (Offline ready)");
            } catch (e) {
                console.error("Cache parse error", e);
            }
        }

        // 2. Subscribe to Realtime Updates
        console.log("[Vocab] Subscribing to realtime updates...");
        const vocabRef = ref(db, 'vocab');
        
        onValue(vocabRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                // Convert object {0: {..}, 1: {..}} or array to array
                const data = Array.isArray(val) ? val : Object.values(val);
                
                // Save to cache for next time (Persistence)
                localStorage.setItem('polyglot_vocab_cache', JSON.stringify(data));
                
                this.processData(data);
                console.log(`[Vocab] Realtime update: ${this.vocabData.length} items.`);
            } else {
                console.warn("[Vocab] No data in DB.");
            }
        }, (error) => {
            console.error("[Vocab] Permission denied or network error:", error);
        });
    }

    processData(data) {
        this.vocabData = data.map(item => ({
            ...item,
            // Ensure essential fields exist
            id: item.id,
            category: item.category || 'General',
            front: {
                main: item.ja || item.zh || item.ko || item.en || '?',
                sub: item.zh_pin || item.ja_furi || item.ja_roma || ''
            },
            back: {
                definition: item.en || '?',
                sentenceTarget: item.ja_ex || item.zh_ex || item.ko_ex || '',
                sentenceOrigin: item.en_ex || ''
            }
        }));

        this.categoryMap = {};
        this.vocabData.forEach(item => {
            const cat = item.category || 'General';
            if (!this.categoryMap[cat]) this.categoryMap[cat] = [];
            this.categoryMap[cat].push(item);
        });

        // Notify all UI components that data has changed
        this.notifySubscribers();
    }

    // --- Subscription System ---
    subscribe(callback) {
        this.subscribers.push(callback);
        // If we already have data, trigger immediately
        if (this.vocabData.length > 0) callback();
    }

    notifySubscribers() {
        this.subscribers.forEach(cb => cb());
    }

    // --- Data Accessors ---
    getAll() { return this.vocabData; }
    getFlashcardData() { return this.vocabData; } // Filter logic can go here later
    
    findIndexById(id) {
        return this.vocabData.findIndex(item => item.id == id); // Loose equality for string/int safety
    }

    getRandomIndex() {
        return this.vocabData.length > 0 ? Math.floor(Math.random() * this.vocabData.length) : 0;
    }
}

export const vocabService = new VocabService();
