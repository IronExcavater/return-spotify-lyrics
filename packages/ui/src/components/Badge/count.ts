/** The text of a count badge: the count, or the maximum and a plus when the count goes past it. */
export function formatCount(count: number, max: number): string {
    if (Number.isNaN(count)) return '0';
    if (count > max) return `${max}+`;
    return String(Math.max(0, Math.floor(count)));
}
