import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

export type RevealMode = 'linear' | 'exp' | 'log';

export interface RevealDistance {
    min?: number;
    max?: number;
}

export interface Range {
    hidden?: number;
    visible?: number;
}

export interface ProximityRevealConfig {
    distance?: RevealDistance;
    mode?: RevealMode;
    position?: Range;
    opacity?: Range;
    scale?: Range;
    disabled?: boolean;
}

interface ProximityRevealResult {
    containerRef: RefObject<HTMLDivElement>;
    targetRef: RefObject<HTMLDivElement>;
    style: CSSProperties;
    amount: number;
}

export function useProximityReveal(
    config?: ProximityRevealConfig
): ProximityRevealResult {
    const containerRef = useRef<HTMLDivElement>(null);
    const targetRef = useRef<HTMLDivElement>(null);
    const [reveal, setReveal] = useState(0);

    const minDistance = Math.max(0, config?.distance?.min ?? 12);
    const maxDistance = Math.max(minDistance + 1, config?.distance?.max ?? 140);
    const mode = config?.mode ?? 'exp';
    const positionRange = {
        hidden: config?.position?.hidden ?? -16,
        visible: config?.position?.visible ?? 0,
    };
    const opacityRange = {
        hidden: config?.opacity?.hidden ?? 0,
        visible: config?.opacity?.visible ?? 1,
    };
    const scaleRange = {
        hidden: config?.scale?.hidden ?? 0.96,
        visible: config?.scale?.visible ?? 1,
    };
    const disabled = config?.disabled ?? false;

    useEffect(() => {
        if (disabled) {
            setReveal(1);
            return;
        }

        const handleMove = (event: MouseEvent) => {
            const rect =
                targetRef.current?.getBoundingClientRect() ??
                containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const horizontalDistance =
                event.clientX < rect.left
                    ? rect.left - event.clientX
                    : event.clientX > rect.right
                      ? event.clientX - rect.right
                      : 0;
            const verticalDistance =
                event.clientY < rect.top
                    ? rect.top - event.clientY
                    : event.clientY > rect.bottom
                      ? event.clientY - rect.bottom
                      : 0;

            const distance = Math.hypot(horizontalDistance, verticalDistance);

            if (distance <= minDistance) {
                setReveal(1);
                return;
            }
            if (distance >= maxDistance) {
                setReveal(0);
                return;
            }

            const normalized =
                (maxDistance - distance) / (maxDistance - minDistance);
            setReveal(applySmoothing(normalized, mode));
        };

        const handleLeave = () => setReveal(0);

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseleave', handleLeave);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseleave', handleLeave);
        };
    }, [disabled, maxDistance, minDistance, mode]);

    const amount = disabled ? 1 : Math.max(0, Math.min(1, reveal));

    const style = useMemo<CSSProperties>(() => {
        const translateY =
            positionRange.hidden +
            (positionRange.visible - positionRange.hidden) * amount;
        const opacity =
            opacityRange.hidden +
            (opacityRange.visible - opacityRange.hidden) * amount;
        const scale =
            scaleRange.hidden +
            (scaleRange.visible - scaleRange.hidden) * amount;

        return {
            opacity,
            transform: `translateY(${translateY}px) scale(${scale})`,
            pointerEvents: amount > 0.05 ? 'auto' : 'none',
        };
    }, [
        amount,
        opacityRange.hidden,
        opacityRange.visible,
        positionRange.hidden,
        positionRange.visible,
        scaleRange.hidden,
        scaleRange.visible,
    ]);

    return { containerRef, targetRef, style, amount };
}

function applySmoothing(value: number, mode: RevealMode): number {
    const clamped = Math.max(0, Math.min(1, value));
    if (clamped === 0) return 0;
    switch (mode) {
        case 'log': {
            const base = 9;
            return Math.log10(1 + clamped * base);
        }
        case 'exp':
            return (1 - Math.exp(-clamped * 4)) / (1 - Math.exp(-4));
        case 'linear':
        default:
            return clamped;
    }
}
