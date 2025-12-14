import { useCallback, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { usePlayer } from '../hooks/usePlayer';

interface Props {
    className?: string;
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

export function PlaybackSeek({ className }: Props) {
    const { progressMs, durationMs, controls } = usePlayer();

    const trackRef = useRef<HTMLDivElement | null>(null);
    const [dragRatio, setDragRatio] = useState<number | null>(null);

    const progressRatio = useMemo(() => {
        if (durationMs <= 0) return 0;
        return clamp01(progressMs / durationMs);
    }, [progressMs, durationMs]);

    const effectiveRatio = dragRatio ?? progressRatio;

    const updateFromEvent = useCallback(
        (clientX: number) => {
            const track = trackRef.current;
            if (!track || durationMs <= 0) return 0;

            const rect = track.getBoundingClientRect();
            const ratio = clamp01((clientX - rect.left) / rect.width);
            setDragRatio(ratio);
            return ratio;
        },
        [durationMs]
    );

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (durationMs <= 0) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        updateFromEvent(e.clientX);

        const handleMove = (ev: PointerEvent) => updateFromEvent(ev.clientX);

        const handleUp = (ev: PointerEvent) => {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            document.removeEventListener('pointermove', handleMove);
            document.removeEventListener('pointerup', handleUp);

            const r = updateFromEvent(ev.clientX);
            if (durationMs > 0) void controls.seek(r * durationMs);
            setDragRatio(null);
        };

        document.addEventListener('pointermove', handleMove);
        document.addEventListener('pointerup', handleUp);
    };

    return (
        <div className={clsx('flex-1', className)}>
            <div
                ref={trackRef}
                className="relative h-4 w-full cursor-pointer overflow-hidden rounded-full bg-[var(--gray-6)]/60"
                onPointerDown={handlePointerDown}
            >
                <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-9)]"
                    style={{ width: `${effectiveRatio * 100}%` }}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2 font-mono text-[10px] text-white">
                    <span>{formatTime(progressMs)}</span>
                    <span>{formatTime(durationMs)}</span>
                </div>
            </div>
        </div>
    );
}
