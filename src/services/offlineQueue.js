import { db, ref, update } from './firebase';

const DB_NAME = 'polyglot-offline';
const STORE_NAME = 'pending-writes';
const DB_VERSION = 1;

/**
 * Offline write queue using IndexedDB.
 * Queues Firebase writes when offline and flushes them when back online.
 */
class OfflineQueue {
    constructor() {
        this._db = null;
        this._flushing = false;
    }

    async _open() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const idb = req.result;
                if (!idb.objectStoreNames.contains(STORE_NAME)) {
                    idb.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            };
            req.onsuccess = () => { this._db = req.result; resolve(this._db); };
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Queue a Firebase update for later sync.
     * @param {Object} updates - Firebase multi-path update object
     */
    async enqueue(updates) {
        try {
            const idb = await this._open();
            const tx = idb.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).add({ updates, timestamp: Date.now() });
            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
        } catch (e) {
            console.error('[OfflineQueue] enqueue failed:', e);
        }
    }

    /**
     * Flush all pending writes to Firebase.
     */
    async flush() {
        if (this._flushing) return;
        this._flushing = true;

        try {
            const idb = await this._open();
            const tx = idb.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);

            const items = await new Promise((resolve, reject) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

            if (items.length === 0) { this._flushing = false; return; }

            // Merge all pending updates into a single batch
            const merged = {};
            for (const item of items) {
                Object.assign(merged, item.updates);
            }

            await update(ref(db), merged);

            // Clear the store after successful write
            const clearTx = idb.transaction(STORE_NAME, 'readwrite');
            clearTx.objectStore(STORE_NAME).clear();
            await new Promise((resolve, reject) => {
                clearTx.oncomplete = resolve;
                clearTx.onerror = () => reject(clearTx.error);
            });

            console.log(`[OfflineQueue] Flushed ${items.length} pending writes`);
        } catch (e) {
            console.error('[OfflineQueue] flush failed:', e);
        }

        this._flushing = false;
    }

    /**
     * Initialize: listen for online events and flush on reconnect.
     */
    init() {
        window.addEventListener('online', () => {
            console.log('[OfflineQueue] Back online, flushing...');
            this.flush();
        });

        // Try flushing on startup in case we came back from offline
        if (navigator.onLine) this.flush();
    }
}

export const offlineQueue = new OfflineQueue();
