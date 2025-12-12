import { useEffect, useState } from 'react';

export function useAverageColor(src?: string) {
    const [color, setColor] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!src) {
            setColor(undefined);
            return;
        }

        let cancelled = false;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;

        img.onload = () => {
            if (cancelled) return;
            try {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', {
                    willReadFrequently: true,
                });
                if (!context) return;
                const width = 10;
                const height = 10;
                canvas.width = width;
                canvas.height = height;
                context.drawImage(img, 0, 0, width, height);
                const { data } = context.getImageData(0, 0, width, height);
                let r = 0;
                let g = 0;
                let b = 0;
                const total = data.length / 4;
                for (let i = 0; i < data.length; i += 4) {
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                }
                setColor(
                    `rgb(${Math.round(r / total)}, ${Math.round(g / total)}, ${Math.round(
                        b / total
                    )})`
                );
            } catch {
                // Ignore cross-origin failures and fallback to default styling
            }
        };

        img.onerror = () => {
            if (!cancelled) setColor(undefined);
        };

        return () => {
            cancelled = true;
        };
    }, [src]);

    return color;
}
