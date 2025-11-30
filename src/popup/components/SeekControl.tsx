// src/components/SeekBar.tsx
import { useCallback, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

interface Props {
    currentMs: number;
    durationMs: number;
    onSeek?: (ms: number) => void;
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

export function SeekControl({
    currentMs,
    durationMs,
    onSeek,
    className,
}: Props) {
    const trackRef = useRef<HTMLDivElement | null>(null);
    const [hoverRatio, setHoverRatio] = useState<number | null>(null);
    const [dragRatio, setDragRatio] = useState<number | null>(null);

    const progressRatio = useMemo(() => {
        if (durationMs <= 0) return 0;
        return clamp01(currentMs / durationMs);
    }, [currentMs, durationMs]);

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
        const ratio = updateFromEvent(e.clientX);

        const handleMove = (ev: PointerEvent) => {
            updateFromEvent(ev.clientX);
        };

        const handleUp = (ev: PointerEvent) => {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            document.removeEventListener('pointermove', handleMove);
            document.removeEventListener('pointerup', handleUp);

            const r = updateFromEvent(ev.clientX);
            if (onSeek && durationMs > 0) {
                onSeek(r * durationMs);
            }
            setDragRatio(null);
        };

        document.addEventListener('pointermove', handleMove);
        document.addEventListener('pointerup', handleUp);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const track = trackRef.current;
        if (!track || durationMs <= 0) return;

        const rect = track.getBoundingClientRect();
        const ratio = clamp01((e.clientX - rect.left) / rect.width);
        setHoverRatio(ratio);
    };

    const handleMouseLeave = () => setHoverRatio(null);

    const hoverTime =
        hoverRatio != null && durationMs > 0
            ? hoverRatio * durationMs
            : undefined;

    return (
        <div className={clsx('flex-1', className)}>
            <div
                ref={trackRef}
                className={clsx(
                    'relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full',
                    'bg-gray-6/60 hover:bg-gray-7'
                )}
                onPointerDown={handlePointerDown}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Filled progress */}
                <div
                    className="absolute inset-y-0 left-0 bg-[var(--accent-9)]"
                    style={{ width: `${effectiveRatio * 100}%` }}
                />

                {/* Hover preview line + time tooltip */}
                {hoverRatio != null && (
                    <div
                        className="absolute inset-y-[-4px]"
                        style={{ left: `${hoverRatio * 100}%` }}
                    >
                        <div className="mx-auto h-3 w-[2px] rounded-full bg-white/80" />
                        {hoverTime != null && (
                            <div className="text-gray-2 absolute top-3 left-1/2 mt-1 -translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] leading-none shadow">
                                {formatTime(hoverTime)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Current / total time, bottom-right */}
            <div className="text-gray-11 mt-1 text-right font-mono text-[11px]">
                {formatTime(currentMs)} / {formatTime(durationMs)}
            </div>
        </div>
    );
}
