export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const LEVELS: Record<LogLevel, number> = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
};

const resolveDefaultLevel = (): LogLevel => {
    const mode = import.meta.env.MODE ?? 'production';
    return mode === 'development' ? 'debug' : 'warn';
};

const resolveConfiguredLevel = (): LogLevel | undefined => {
    const configured = import.meta.env.VITE_LOG_LEVEL;
    if (!configured) return undefined;
    if (configured in LEVELS) return configured as LogLevel;
    return undefined;
};

const activeLevel: LogLevel = resolveConfiguredLevel() ?? resolveDefaultLevel();

const shouldLog = (level: LogLevel) =>
    LEVELS[level] > 0 && LEVELS[level] <= LEVELS[activeLevel];

type LogFn = (message: string, ...args: unknown[]) => void;

export const createLogger = (scope: string) => {
    const prefix = `[${scope}]`;
    const log =
        (level: LogLevel, fn: LogFn): LogFn =>
        (message: string, ...args: unknown[]) => {
            if (!shouldLog(level)) return;
            fn(`${prefix} ${message}`, ...args);
        };

    return {
        debug: log('debug', console.debug.bind(console)),
        info: log('info', console.info.bind(console)),
        warn: log('warn', console.warn.bind(console)),
        error: log('error', console.error.bind(console)),
    };
};

export const normalizeError = (error: unknown): Error => {
    if (error instanceof Error) return error;
    return new Error(typeof error === 'string' ? error : String(error));
};

export const isSpotifySessionError = (error: unknown): boolean => {
    const message = normalizeError(error).message;
    return message.includes('Spotify session not initialised');
};

export const logError = (
    logger: ReturnType<typeof createLogger>,
    message: string,
    error: unknown,
    options?: {
        level?: 'warn' | 'error';
        suppress?: (err: Error) => boolean;
    }
) => {
    const normalized = normalizeError(error);
    if (options?.suppress?.(normalized)) return;
    const level = options?.level ?? 'warn';
    logger[level](message, normalized);
};

export const createOptionalRequestLogger = (
    logger: ReturnType<typeof createLogger>,
    message = 'optional request failed',
    suppress?: (err: Error) => boolean
) => {
    return (error: unknown) => {
        logError(logger, message, error, { suppress });
    };
};
