export async function safeRequest<T>(
    fn: () => Promise<T>,
    fallback: T,
    onError?: (error: unknown) => void
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        onError?.(error);
        return fallback;
    }
}
