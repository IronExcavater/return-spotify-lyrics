type LogArgs = readonly unknown[];

const prefix = '[Return Spotify Lyrics]';

export const logger = {
    debug(...args: LogArgs) {
        if (import.meta.env.DEV) console.debug(prefix, ...args);
    },
    info(...args: LogArgs) {
        if (import.meta.env.DEV) console.info(prefix, ...args);
    },
    warn(...args: LogArgs) {
        console.warn(prefix, ...args);
    },
    error(...args: LogArgs) {
        console.error(prefix, ...args);
    },
};
