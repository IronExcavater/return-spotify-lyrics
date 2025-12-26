import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Callout, Button, Flex, Popover, Text } from '@radix-ui/themes';
import clsx from 'clsx';

export type ToastTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export type ToastAction = {
    label: string;
    onClick: () => void;
};

export type ToastInput = {
    id?: string;
    title: string;
    description?: string;
    tone?: ToastTone;
    action?: ToastAction;
    durationMs?: number;
    persistent?: boolean;
    onManualDismiss?: () => void;
};

type ToastItem = ToastInput & {
    id: string;
    createdAt: number;
    visible: boolean;
    dismissedAt?: number;
};

type ToastContextValue = {
    toasts: ToastItem[];
    visibleToasts: ToastItem[];
    addToast: (input: ToastInput) => string;
    dismissToast: (id: string) => void;
    removeToast: (id: string) => void;
    clearHistory: () => void;
    hasToast: (id: string) => boolean;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 6500;
const HIDE_ANIMATION_MS = 320;

const TONE_CONFIG: Record<
    ToastTone,
    { color?: 'grass' | 'orange' | 'red' | 'gray' }
> = {
    neutral: { color: 'grass' },
    info: { color: 'grass' },
    success: { color: 'grass' },
    warning: { color: 'orange' },
    error: { color: 'red' },
};

const createToastId = () =>
    globalThis.crypto?.randomUUID?.() ??
    `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;

interface ToastProviderProps {
    children: ReactNode;
    defaultDurationMs?: number;
    maxVisible?: number;
    historyLimit?: number;
}

export function ToastProvider({
    children,
    defaultDurationMs = DEFAULT_DURATION_MS,
    maxVisible = 3,
    historyLimit = 40,
}: ToastProviderProps) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timersRef = useRef<Map<string, number>>(new Map());

    const clearTimer = useCallback((id: string) => {
        const timer = timersRef.current.get(id);
        if (timer) {
            window.clearTimeout(timer);
            timersRef.current.delete(id);
        }
    }, []);

    const dismissToast = useCallback(
        (id: string) => {
            clearTimer(id);
            setToasts((prev) =>
                prev.map((toast) =>
                    toast.id === id && toast.visible
                        ? {
                              ...toast,
                              visible: false,
                              dismissedAt: Date.now(),
                          }
                        : toast
                )
            );
            window.setTimeout(() => {
                setToasts((prev) => [...prev]);
            }, HIDE_ANIMATION_MS);
        },
        [clearTimer]
    );

    const removeToast = useCallback(
        (id: string) => {
            clearTimer(id);
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        },
        [clearTimer]
    );

    const scheduleDismiss = useCallback(
        (id: string, durationMs: number) => {
            if (durationMs <= 0) return;
            clearTimer(id);
            const timer = window.setTimeout(() => dismissToast(id), durationMs);
            timersRef.current.set(id, timer);
        },
        [clearTimer, dismissToast]
    );

    const addToast = useCallback(
        (input: ToastInput) => {
            const id = input.id ?? createToastId();
            const durationMs = input.durationMs ?? defaultDurationMs;
            const tone = input.tone ?? 'neutral';
            const next: ToastItem = {
                ...input,
                id,
                tone,
                durationMs,
                createdAt: Date.now(),
                visible: true,
                dismissedAt: undefined,
            };

            setToasts((prev) => {
                const withoutExisting = prev.filter((toast) => toast.id !== id);
                const nextList = [next, ...withoutExisting];
                return nextList.slice(0, historyLimit);
            });

            if (!input.persistent) {
                scheduleDismiss(id, durationMs);
            }

            return id;
        },
        [defaultDurationMs, historyLimit, scheduleDismiss]
    );

    const clearHistory = useCallback(() => {
        setToasts((prev) => prev.filter((toast) => toast.persistent));
    }, []);

    const hasToast = useCallback(
        (id: string) => toasts.some((toast) => toast.id === id),
        [toasts]
    );

    const visibleToasts = useMemo(
        () =>
            toasts
                .filter((toast) => {
                    if (toast.visible) return true;
                    if (!toast.dismissedAt) return false;
                    return Date.now() - toast.dismissedAt < HIDE_ANIMATION_MS;
                })
                .slice(0, maxVisible),
        [toasts, maxVisible]
    );

    const value = useMemo(
        () => ({
            toasts,
            visibleToasts,
            addToast,
            dismissToast,
            removeToast,
            clearHistory,
            hasToast,
        }),
        [
            toasts,
            visibleToasts,
            addToast,
            dismissToast,
            removeToast,
            clearHistory,
            hasToast,
        ]
    );

    return (
        <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
    );
}

export function useToasts() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToasts must be used within ToastProvider');
    }
    return context;
}

function ToastCard({
    toast,
    onDismiss,
    onRemove,
    compact = false,
}: {
    toast: ToastItem;
    onDismiss: () => void;
    onRemove?: () => void;
    compact?: boolean;
}) {
    const tone = toast.tone ?? 'neutral';
    const config = TONE_CONFIG[tone];
    const isVisible = toast.visible;

    return (
        <Callout.Root
            size="1"
            variant="surface"
            color={config.color}
            className={clsx(
                'border border-[var(--gray-a5)] shadow-lg backdrop-blur-md transition-all duration-300 ease-in-out',
                !isVisible && 'translate-y-2 scale-95 opacity-0'
            )}
            style={{
                padding: compact ? '10px 14px' : '12px 16px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
            }}
        >
            <Flex align="center" gap="4" className="min-w-0">
                <Flex direction="column" gap="2" className="min-w-0 flex-1">
                    <Text
                        size="1"
                        weight="medium"
                        className="truncate text-[11px] text-white"
                    >
                        {toast.title}
                    </Text>
                    {toast.description && (
                        <Text
                            size="1"
                            color="gray"
                            className="truncate text-[10px] leading-snug"
                        >
                            {toast.description}
                        </Text>
                    )}
                </Flex>
                <Flex align="center" gap="1" className="flex-none">
                    {toast.action && (
                        <Button
                            size="1"
                            variant="ghost"
                            onClick={toast.action.onClick}
                            className="h-5 px-2 text-[10px]"
                        >
                            {toast.action.label}
                        </Button>
                    )}
                    <Button
                        size="1"
                        variant="ghost"
                        aria-label={
                            isVisible ? 'Dismiss toast' : 'Remove toast'
                        }
                        onClick={() => {
                            if (isVisible) {
                                toast.onManualDismiss?.();
                                onDismiss();
                            } else {
                                onRemove?.();
                            }
                        }}
                        className="h-5 w-5 px-0 text-[10px]"
                    >
                        {toast.persistent ? '-' : 'x'}
                    </Button>
                </Flex>
            </Flex>
        </Callout.Root>
    );
}

function ToastHistoryButton() {
    const { toasts, dismissToast, removeToast, clearHistory } = useToasts();
    const hasPersistent = toasts.some((toast) => toast.persistent);

    if (toasts.length === 0) return null;

    return (
        <Popover.Root>
            <Popover.Trigger>
                <Button
                    size="1"
                    variant="ghost"
                    radius="full"
                    aria-label="Toast history"
                    className="border border-[var(--gray-a5)] px-2 text-[10px] backdrop-blur-md"
                    style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(14px)',
                    }}
                >
                    History
                </Button>
            </Popover.Trigger>
            <Popover.Content
                size="1"
                className="max-h-80 w-72 overflow-hidden border border-[var(--gray-a5)] backdrop-blur-md"
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(14px)',
                }}
            >
                <Flex direction="column" gap="2">
                    <Flex align="center" justify="between">
                        <Text size="1" weight="medium" className="text-white">
                            Notifications
                        </Text>
                        {!hasPersistent && (
                            <Button
                                size="1"
                                variant="ghost"
                                onClick={clearHistory}
                                className="h-5 px-2 text-[10px]"
                            >
                                Clear
                            </Button>
                        )}
                    </Flex>
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                        {toasts.map((toast) => (
                            <ToastCard
                                key={toast.id}
                                toast={toast}
                                onDismiss={() => dismissToast(toast.id)}
                                onRemove={() => removeToast(toast.id)}
                                compact
                            />
                        ))}
                    </div>
                </Flex>
            </Popover.Content>
        </Popover.Root>
    );
}

export function ToastViewport() {
    const { visibleToasts, dismissToast, removeToast, toasts } = useToasts();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-3 left-3 z-50 flex flex-col gap-1.5">
            {visibleToasts.map((toast) => (
                <ToastCard
                    key={toast.id}
                    toast={toast}
                    onDismiss={() => dismissToast(toast.id)}
                    onRemove={() => removeToast(toast.id)}
                />
            ))}
            <ToastHistoryButton />
        </div>
    );
}
