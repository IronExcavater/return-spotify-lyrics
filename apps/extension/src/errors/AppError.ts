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

function serializedMetadata(error: Error) {
    const value = error as Error & { code?: unknown; retryAfter?: unknown };
    return {
        code: typeof value.code === 'string' ? value.code : undefined,
        retryAfter:
            typeof value.retryAfter === 'number' ? value.retryAfter : undefined,
    };
}

export function asAppError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    if (error instanceof Error) {
        const metadata = serializedMetadata(error);
        return new AppError(
            metadata.code ?? 'app.unexpected',
            error.message || 'Something went wrong',
            {
                cause: error,
                retryAfter: metadata.retryAfter,
            }
        );
    }

    return new AppError('app.unexpected', 'Something went wrong', {
        cause: error,
    });
}
