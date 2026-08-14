import {
    getAuth,
    signInWithCustomToken,
    signOut,
    type User,
} from 'firebase/auth/web-extension';

import { AppError } from '@/errors/AppError';

import { getFirebaseApp } from './app';

export type AuthSession = {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
};

function toSession(user: User): AuthSession {
    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
    };
}

export function getFirebaseAuth() {
    return getAuth(getFirebaseApp());
}

export function getAuthSession(): AuthSession | null {
    const user = getFirebaseAuth().currentUser;
    return user ? toSession(user) : null;
}

export async function loginWithCustomToken(customToken: string) {
    if (!customToken.trim()) {
        throw new AppError(
            'auth.invalid_token',
            'A sign-in token is required.'
        );
    }

    try {
        const credential = await signInWithCustomToken(
            getFirebaseAuth(),
            customToken
        );
        return toSession(credential.user);
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('auth.login_failed', 'Could not sign in.', {
            cause: error,
        });
    }
}

export async function logout() {
    await signOut(getFirebaseAuth());
}
