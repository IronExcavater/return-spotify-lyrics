export type AppErrorOptions = {
    cause?: unknown;
    retryAfter?: number;
};

export class AppError extends Error {
    readonly code: string;
    readonly retryAfter?: number;

    constructor(code: string, message: string, options: AppErrorOptions = {}) {
        super(message, { cause: options.cause });
        this.name = 'AppError';
        this.code = code;
        this.retryAfter = options.retryAfter;
    }
}

export function asAppError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    if (error instanceof Error) {
        return new AppError('app.unexpected', error.message || 'Something went wrong', {
            cause: error,
        });
    }

    return new AppError('app.unexpected', 'Something went wrong', {
        cause: error,
    });
}
