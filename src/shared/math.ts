export const hashString = (
    value: string | undefined,
    salt: number,
    fallbackMultiplier = 7
) => {
    if (!value) return salt * fallbackMultiplier;
    let h = salt | 0;
    for (let i = 0; i < value.length; i += 1) {
        h ^= value.charCodeAt(i) + 0x9e3779b9 + (h << 6) + (h >> 2);
    }
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return h >>> 0;
};

export const noise01 = (seed: number) => {
    let t = seed + 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const hashSequence = (
    parts: Array<string | undefined>,
    salts: number[],
    fallbackMultipliers?: number[]
) =>
    parts.reduce((acc, part, index) => {
        const salt = salts[index] ?? 0;
        const fallback =
            fallbackMultipliers?.[index] ?? fallbackMultipliers?.[0] ?? 7;
        return acc ^ hashString(part, salt, fallback);
    }, 0);

export const seededWidths = (
    seed: number,
    {
        titleMin = 68,
        titleRange = 28,
        subtitleMin = 28,
        subtitleRange = 32,
        titleOffset = 11,
        subtitleOffset = 29,
    } = {}
) => {
    const titleWidth = Math.round(
        titleMin + noise01(seed + titleOffset) * titleRange
    );
    const subtitleWidth = Math.round(
        subtitleMin + noise01(seed + subtitleOffset) * subtitleRange
    );
    return { titleWidth, subtitleWidth };
};
