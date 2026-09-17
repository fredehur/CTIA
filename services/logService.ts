// A simple, non-cryptographic hash function.
// Source: https://github.com/bryc/code/blob/master/jshash/cyrb53.js
export const cyrb53Hash = async (str: string, seed = 0): Promise<string> => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for(let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};


const DB_NAME = 'CTIAnalystDB';
const DB_VERSION = 1;
const LOG_STORE_NAME = 'yearlyAttemptsLog';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(LOG_STORE_NAME)) {
                db.createObjectStore(LOG_STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
            reject('Error opening IndexedDB.');
        };
    });
    return dbPromise;
};

export const addLog = async (logEntry: object): Promise<void> => {
    try {
        const db = await openDB();
        const transaction = db.transaction(LOG_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(LOG_STORE_NAME);
        store.add(logEntry);

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject('Transaction error');
        });
    } catch (error) {
        console.error('Failed to add log to IndexedDB:', error);
    }
};

export const exportLogs = async (): Promise<void> => {
    try {
        const db = await openDB();
        const transaction = db.transaction(LOG_STORE_NAME, 'readonly');
        const store = transaction.objectStore(LOG_STORE_NAME);
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = (event) => {
            const logs = (event.target as IDBRequest).result;
            if (logs && logs.length > 0) {
                const logContent = logs.map((log: object) => JSON.stringify(log)).join('\n');
                const blob = new Blob([logContent], { type: 'application/jsonl' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `yearlyAttempts_log_${new Date().toISOString()}.jsonl`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                alert('No logs to export.');
            }
        };

        getAllRequest.onerror = () => {
            console.error('Failed to retrieve logs for export.');
        };
    } catch (error) {
        console.error('Failed to export logs from IndexedDB:', error);
    }
};