import { ChallengeResponse, Client } from 'lrclib-api';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const YIELD_EVERY = 500;

const client = new Client();
const encoder = new TextEncoder();

function hexToBytes(hex: string) {
    const clean = hex.trim().toLowerCase();
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

async function sha256Bytes(value: string) {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
    return new Uint8Array(digest);
}

function meetsTarget(hash: Uint8Array, target: Uint8Array) {
    for (let i = 0; i < target.length; i += 1) {
        if (hash[i] < target[i]) return true;
        if (hash[i] > target[i]) return false;
    }
    return true;
}

// Proof-of-work: find a nonce so sha256(prefix + nonce) <= target.
async function solveChallenge(prefix: string, targetHex: string) {
    const target = hexToBytes(targetHex);
    let nonce = 0;

    while (true) {
        const hash = await sha256Bytes(`${prefix}${nonce}`);
        if (meetsTarget(hash, target)) return String(nonce);

        nonce += 1;
        if (nonce % YIELD_EVERY === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }
}

export async function getLrcClient(): Promise<Client> {
    return client;
}

export type PublishTokenPayload = {
    token: string;
    expiresAt: number;
};

async function requestChallenge(): Promise<ChallengeResponse> {
    const challenge = await client.requestChallenge();
    if (!challenge?.prefix || !challenge.target) {
        throw new Error('LRCLIB challenge unavailable');
    }
    return challenge;
}

export async function requestPublishToken(): Promise<PublishTokenPayload> {
    const challenge = await requestChallenge();
    const nonce = await solveChallenge(challenge.prefix, challenge.target);
    return {
        token: `${challenge.prefix}:${nonce}`,
        expiresAt: Date.now() + CHALLENGE_TTL_MS,
    };
}
