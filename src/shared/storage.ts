export function getFromStorage<T>(key: string): Promise<T | undefined>;
export function getFromStorage<T>(
    key: string,
    callback: (value: T | undefined) => void
): void;

// Implementation
export function getFromStorage<T>(
    key: string,
    callback?: (value: T | undefined) => void
): Promise<T | undefined> | void {
    const read = (res: Record<string, unknown>): T | undefined =>
        res[key] as T | undefined;

    if (callback) {
        chrome.storage.local.get(key, (r) => callback(read(r)));
        return;
    }

    return new Promise((resolve) => {
        chrome.storage.local.get(key, (r) => resolve(read(r)));
    });
}

export function mustGetFromStorage<T>(key: string): Promise<T>;
export function mustGetFromStorage<T>(
    key: string,
    callback: (value: T) => void
): void;

// Implementation
export function mustGetFromStorage<T>(
    key: string,
    callback?: (value: T) => void
): Promise<T> | void {
    const read = (res: Record<string, unknown>): T => {
        if (!(key in res))
            throw new Error(`Required storage key ${key} not found`);
        return res[key] as T;
    };

    if (callback) {
        chrome.storage.local.get(key, (r) => callback(read(r)));
        return;
    }

    return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, (r) => {
            try {
                resolve(read(r));
            } catch (err) {
                reject(err);
            }
        });
    });
}

export async function setInStorage<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
}

export async function removeInStorage(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
}
