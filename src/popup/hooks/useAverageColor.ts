import { useEffect, useState } from 'react';

const cache = new Map<string, string>();

async function computeAverage(src: string): Promise<string | undefined> {
    if (cache.has(src)) return cache.get(src);

    try {
        const response = await fetch(src);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;

        ctx.drawImage(bitmap, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        const value = `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
        cache.set(src, value);
        return value;
    } catch (_err) {
        return undefined;
    }
}

export function useAverageColor(src?: string) {
    const [color, setColor] = useState<string | undefined>(
        src ? cache.get(src) : undefined
    );

    useEffect(() => {
        let cancelled = false;
        if (!src) {
            setColor(undefined);
            return;
        }

        void computeAverage(src).then((value) => {
            if (cancelled) return;
            setColor(value);
        });

        return () => {
            cancelled = true;
        };
    }, [src]);

    return color;
}
