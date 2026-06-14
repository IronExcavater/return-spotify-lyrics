export type ToastTone = 'neutral' | 'success' | 'danger';

export type ToastInput = {
    title: string;
    description?: string;
    durationMs?: number;
    tone?: ToastTone;
    dismissLabel?: string;
};

export type ToastRecord = {
    id: string;
    title: string;
    description?: string;
    durationMs: number;
    tone: ToastTone;
    dismissLabel: string;
    state: 'open' | 'closing';
};

const DEFAULT_TOAST_DURATION_MS = 2600;
export const TOAST_EXIT_DURATION_MS = 150;

let sequence = 0;
let toasts: ToastRecord[] = [];

const listeners = new Set<() => void>();
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();
const removeTimers = new Map<string, ReturnType<typeof setTimeout>>();

const emitToastStore = () => {
    listeners.forEach((listener) => listener());
};

const setToasts = (next: ToastRecord[]) => {
    toasts = next;
    emitToastStore();
};

const clearTimer = (
    timers: Map<string, ReturnType<typeof setTimeout>>,
    id: string
) => {
    const timer = timers.get(id);
    if (!timer) return;
    clearTimeout(timer);
    timers.delete(id);
};

const clearToastTimers = (id: string) => {
    clearTimer(dismissTimers, id);
    clearTimer(removeTimers, id);
};

const removeToast = (id: string) => {
    clearToastTimers(id);
    if (!toasts.some((toast) => toast.id === id)) return;
    setToasts(toasts.filter((toast) => toast.id !== id));
};

const scheduleAutoDismiss = (toast: ToastRecord) => {
    clearTimer(dismissTimers, toast.id);
    dismissTimers.set(
        toast.id,
        setTimeout(() => dismissToast(toast.id), toast.durationMs)
    );
};

export const showToast = ({
    title,
    description,
    durationMs = DEFAULT_TOAST_DURATION_MS,
    tone = 'neutral',
    dismissLabel = 'Dismiss',
}: ToastInput) => {
    const toast: ToastRecord = {
        id: `toast-${Date.now()}-${sequence++}`,
        title,
        description,
        durationMs,
        tone,
        dismissLabel,
        state: 'open',
    };

    setToasts([...toasts, toast]);
    scheduleAutoDismiss(toast);
    return toast.id;
};

export const dismissToast = (id: string) => {
    const nextToasts = toasts.map((toast) => {
        if (toast.id !== id || toast.state === 'closing') return toast;
        return { ...toast, state: 'closing' as const };
    });

    if (nextToasts.every((toast, index) => toast === toasts[index])) return;

    setToasts(nextToasts);

    clearTimer(dismissTimers, id);
    clearTimer(removeTimers, id);
    removeTimers.set(
        id,
        setTimeout(() => removeToast(id), TOAST_EXIT_DURATION_MS)
    );
};

export const clearToasts = () => {
    toasts.forEach((toast) => clearToastTimers(toast.id));
    toasts = [];
    emitToastStore();
};

export const subscribeToToastStore = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const readToastSnapshot = () => toasts;
