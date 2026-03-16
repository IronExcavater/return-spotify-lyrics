import {
    useCallback,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import clsx from 'clsx';
import { usePlayer } from '../hooks/usePlayer';

interface Props {
    className?: string;
    disabled?: boolean;
}

function clamp01(v: number) {
    return Math.min(1, Math.max(0, v));
}

function formatTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function SeekSlider({ className, disabled = false }: Props) {
    const { progressMs, durationMs, controls } = usePlayer();

    const trackRef = useRef<HTMLDivElement | null>(null);
    const [dragRatio, setDragRatio] = useState<number | null>(null);
    const [hoverRatio, setHoverRatio] = useState<number | null>(null);

    const progressRatio = useMemo(() => {
        if (durationMs <= 0) return 0;
        return clamp01(progressMs / durationMs);
    }, [progressMs, durationMs]);

    const effectiveRatio = dragRatio ?? progressRatio;
    const previewRatio = dragRatio ?? hoverRatio;
    const isInteracting =
        !disabled && (dragRatio !== null || hoverRatio !== null);
    const previewTimeLabel = useMemo(() => {
        if (previewRatio == null || durationMs <= 0) return null;
        return formatTime(Math.round(previewRatio * durationMs));
    }, [durationMs, previewRatio]);

    const ratioFromClientX = useCallback(
        (clientX: number) => {
            const track = trackRef.current;
            if (!track || durationMs <= 0) return null;

            const rect = track.getBoundingClientRect();
            if (!rect.width) return null;
            return clamp01((clientX - rect.left) / rect.width);
        },
        [durationMs]
    );

    const updateDragFromEvent = useCallback(
        (clientX: number) => {
            const ratio = ratioFromClientX(clientX);
            if (ratio == null) return null;
            setDragRatio(ratio);
            return ratio;
        },
        [ratioFromClientX]
    );

    const updateHoverFromEvent = useCallback(
        (clientX: number) => {
            const ratio = ratioFromClientX(clientX);
            if (ratio == null) return null;
            setHoverRatio(ratio);
            return ratio;
        },
        [ratioFromClientX]
    );

    const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (disabled || durationMs <= 0) return;
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);
        updateDragFromEvent(e.clientX);

        const handleMove = (ev: PointerEvent) =>
            updateDragFromEvent(ev.clientX);

        const handleUp = (ev: PointerEvent) => {
            target.releasePointerCapture(e.pointerId);
            document.removeEventListener('pointermove', handleMove);
            document.removeEventListener('pointerup', handleUp);

            const r = ratioFromClientX(ev.clientX);
            if (durationMs > 0 && r != null && Number.isFinite(r)) {
                void controls.seek(Math.round(r * durationMs));
            }
            setDragRatio(null);
        };

        document.addEventListener('pointermove', handleMove);
        document.addEventListener('pointerup', handleUp);
    };

    return (
        <div className={clsx('flex-1', className)}>
            <div
                ref={trackRef}
                className={clsx(
                    'relative h-4 w-full overflow-visible',
                    !disabled && 'cursor-pointer',
                    disabled && 'cursor-not-allowed opacity-60'
                )}
                style={
                    {
                        '--seek-track-height': isInteracting
                            ? '1rem'
                            : '0.75rem',
                    } as CSSProperties
                }
                onPointerDown={handlePointerDown}
                onPointerEnter={(event) => {
                    if (disabled) return;
                    updateHoverFromEvent(event.clientX);
                }}
                onPointerMove={(event) => {
                    if (disabled || dragRatio !== null) return;
                    updateHoverFromEvent(event.clientX);
                }}
                onPointerLeave={() => {
                    if (dragRatio !== null) return;
                    setHoverRatio(null);
                }}
            >
                {previewRatio != null && previewTimeLabel && (
                    <div
                        className="border-grayA-6 bg-panel-solid/95 text-gray-12 pointer-events-none absolute -top-6 z-20 -translate-x-1/2 rounded-md border px-2 py-0.5 font-mono text-[10px] shadow-sm backdrop-blur-xs"
                        style={{ left: `${previewRatio * 100}%` }}
                    >
                        {previewTimeLabel}
                    </div>
                )}
                <div
                    className={clsx(
                        'absolute inset-x-0 top-1/2 overflow-hidden rounded-full transition-[height,background-color] duration-150 ease-out',
                        isInteracting ? 'bg-(--gray-6)/80' : 'bg-(--gray-6)/60'
                    )}
                    style={{
                        height: 'var(--seek-track-height)',
                        transform: 'translateY(-50%)',
                    }}
                >
                    {previewRatio != null && (
                        <div
                            className="pointer-events-none absolute inset-y-0 z-20 w-px -translate-x-1/2 bg-white/70"
                            style={{ left: `${previewRatio * 100}%` }}
                        />
                    )}
                    {effectiveRatio > 0 && (
                        <div
                            className="bg-accent-9 absolute inset-y-0 rounded-full transition-[width] duration-75 ease-out"
                            style={{
                                left: 0,
                                width: `${effectiveRatio * 100}%`,
                                minWidth: '2px',
                            }}
                        />
                    )}
                </div>
                <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-2 font-mono text-[10px] text-white">
                    <span>{formatTime(progressMs)}</span>
                    <span>{formatTime(durationMs)}</span>
                </div>
            </div>
        </div>
    );
}
