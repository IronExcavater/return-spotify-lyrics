export async function getFromStorage<T>(key: string): Promise<T | undefined> {
    const result = await chrome.storage.local.get(key);
    return result[key] as T | undefined;
}

export async function mustGetFromStorage<T>(key: string): Promise<T> {
    const result = await chrome.storage.local.get(key);
    if (!(key in result))
        throw new Error(`Required storage key ${key} not found`);
    return result[key] as T;
}

export async function setInStorage<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
}

export async function removeInStorage(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
}
