import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';

import { AppError } from '@/errors/AppError';

let app: FirebaseApp | undefined;

export function getFirebaseApp() {
    if (app) return app;

    const existing = getApps()[0];
    if (existing) {
        app = existing;
        return app;
    }

    const config = {
        apiKey: import.meta.env.WXT_FIREBASE_API_KEY,
        authDomain: import.meta.env.WXT_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.WXT_FIREBASE_PROJECT_ID,
        appId: import.meta.env.WXT_FIREBASE_APP_ID,
        storageBucket: import.meta.env.WXT_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.WXT_FIREBASE_MESSAGING_SENDER_ID,
    };

    if (
        !config.apiKey ||
        !config.authDomain ||
        !config.projectId ||
        !config.appId
    ) {
        throw new AppError(
            'auth.not_configured',
            'Firebase authentication has not been configured for this build.'
        );
    }

    app = initializeApp(config);
    return app;
}
