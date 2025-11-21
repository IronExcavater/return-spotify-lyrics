export function generateRandomString(length: number): string {
    const charset =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + charset[x % charset.length], '');
}

export async function sha256(str: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    return crypto.subtle.digest('SHA-256', encoder.encode(str));
}

export function base64UrlEncode(arrayBuffer: ArrayBuffer): string {
    const bytes = new Uint8Array(arrayBuffer);
    return btoa(String.fromCharCode(...bytes))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

export async function createPkcePair() {
    const verifier = generateRandomString(64);
    const hashed = await sha256(verifier);
    const challenge = base64UrlEncode(hashed);

    return { verifier, challenge };
}
