import { openDB, type DBSchema } from 'idb';

type CacheRecord = {
    key: string;
    value: unknown;
    updatedAt: number;
    expiresAt: number;
};

type LyricsDraft = {
    trackId: string;
    text: string;
    updatedAt: number;
};

interface AppDatabase extends DBSchema {
    cache: {
        key: string;
        value: CacheRecord;
        indexes: {
            'by-expiry': number;
        };
    };
    lyricsDrafts: {
        key: string;
        value: LyricsDraft;
    };
}

export const database = openDB<AppDatabase>('return-spotify-lyrics', 1, {
    upgrade(db) {
        const cache = db.createObjectStore('cache', { keyPath: 'key' });
        cache.createIndex('by-expiry', 'expiresAt');
        db.createObjectStore('lyricsDrafts', { keyPath: 'trackId' });
    },
});
