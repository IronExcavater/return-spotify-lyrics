import { easingCoordinates } from 'easing-coordinates';

/** A CSS timing function that eases the blend between two colour stops. */
export type Easing =
    | 'linear'
    | 'ease'
    | 'ease-in'
    | 'ease-out'
    | 'ease-in-out'
    | 'step-start'
    | 'step-end'
    | `cubic-bezier(${string})`
    | `steps(${string})`;

/** Expands the easings in a gradient, like postcss-easing-gradients: `linear-gradient(black, ease-in, transparent)`. */
export function easeGradient(gradient: string): string {
    const match = GRADIENT.exec(gradient);
    if (!match) return gradient;

    const [, name = '', body = ''] = match;
    const [first = '', ...stops] = splitTopLevel(body, ',');
    if (!isPrelude(first)) return `${name}(${easeStops(body)})`;

    return `${name}(${first}, ${easeStops(stops.join(', '))})`;
}

/** Expands the easings in a colour stop list: `transparent, ease-in, black 20px`. */
export function easeStops(stops: string): string {
    const args = splitTopLevel(stops, ',');
    if (!args.some(isEasing)) return stops;

    const parts = args.map(parsePart);
    resolvePositions(parts);

    return parts.flatMap((part, index) => expandPart(parts, index)).join(', ');
}

/** The same curve played backwards, for a gradient whose stops run the other way. */
export function reverseEasing(easing: Easing): Easing {
    switch (easing) {
        case 'linear':
        case 'ease-in-out':
            return easing;
        case 'ease-in':
            return 'ease-out';
        case 'ease-out':
            return 'ease-in';
        case 'ease':
            return reverseEasing('cubic-bezier(0.25, 0.1, 0.25, 1)');
        case 'step-start':
            return 'step-end';
        case 'step-end':
            return 'step-start';
    }

    const [kind, rawArgs = ''] = easing.split(/[()]/);
    const args = rawArgs.split(',').map((arg) => arg.trim());

    if (kind === 'cubic-bezier') {
        // A half turn of the curve around its centre swaps and mirrors the control points.
        const [x1, y1, x2, y2] = args.map(Number) as [
            number,
            number,
            number,
            number,
        ];
        return `cubic-bezier(${round(1 - x2)}, ${round(1 - y2)}, ${round(1 - x1)}, ${round(1 - y1)})`;
    }

    const [count, position = 'jump-end'] = args;
    const reversed = REVERSED_STEP_POSITION[position] ?? position;
    return `steps(${count}, ${reversed})`;
}

type Stop = { type: 'stop'; color: string; position: string | undefined };
type EasingPart = { type: 'easing'; easing: string };
type Part = Stop | EasingPart;

const GRADIENT =
    /^\s*((?:repeating-)?(?:linear|radial|conic)-gradient)\((.*)\)\s*$/s;

const REVERSED_STEP_POSITION: Record<string, string> = {
    start: 'end',
    end: 'start',
    'jump-start': 'jump-end',
    'jump-end': 'jump-start',
};

function expandPart(parts: Part[], index: number): string[] {
    const part = parts[index]!;
    if (part.type === 'stop') return [`${part.color} ${part.position}`];

    const from = parts[index - 1];
    const to = parts[index + 1];
    // An easing outside two colour stops is not valid CSS, so drop it.
    if (from?.type !== 'stop' || to?.type !== 'stop') return [];

    return easedStops(from, part.easing, to);
}

function easedStops(from: Stop, easing: string, to: Stop): string[] {
    // The list already holds `from` and `to`, so add only the points between them.
    const between = coordinatesFor(easing).filter(
        ({ x, y }) => !(x === 0 && y === 0) && !(x === 1 && y === 1)
    );

    return between.map(({ x, y }) => {
        const color = mix(from.color, to.color, y);
        const position = interpolate(from.position!, to.position!, x);
        return `${color} ${position}`;
    });
}

function coordinatesFor(easing: string): { x: number; y: number }[] {
    if (easing === 'linear') return [];
    if (easing === 'step-start') return easingCoordinates('steps(1, start)');
    if (easing === 'step-end') return easingCoordinates('steps(1, end)');

    // easing-coordinates calls the CSS `jump-*` step positions `skip-*`.
    return easingCoordinates(easing.replaceAll('jump-', 'skip-'));
}

/** Gives each stop a position, the same way that CSS places stops without one. */
function resolvePositions(parts: Part[]) {
    const stops = parts.filter((part): part is Stop => part.type === 'stop');
    const first = stops[0];
    const last = stops.at(-1);
    if (!first || !last) return;

    first.position ??= '0%';
    last.position ??= '100%';

    let previous = 0;
    stops.forEach((stop, index) => {
        if (index === 0 || stop.position === undefined) return;

        // Spread the stops without a position evenly between the two known positions.
        const gap = index - previous;
        for (let step = 1; step < gap; step++) {
            stops[previous + step]!.position = interpolate(
                stops[previous]!.position!,
                stop.position,
                step / gap
            );
        }
        previous = index;
    });
}

function parsePart(arg: string): Part {
    if (isEasing(arg)) return { type: 'easing', easing: arg };

    const tokens = splitTopLevel(arg, ' ');
    const last = tokens.at(-1);
    const hasPosition =
        tokens.length > 1 && last !== undefined && isPosition(last);
    if (!hasPosition) return { type: 'stop', color: arg, position: undefined };

    const color = tokens.slice(0, -1).join(' ');
    return { type: 'stop', color, position: last };
}

function mix(from: string, to: string, amount: number): string {
    if (amount === 0) return from;
    if (amount === 1) return to;

    // Oklab mixes to `transparent` without a grey band.
    return `color-mix(in oklab, ${to} ${round(amount * 100)}%, ${from})`;
}

/** The point `t` of the way between two positions, in plain CSS when possible. */
function interpolate(from: string, to: string, t: number): string {
    const start = parseLength(from);
    const end = parseLength(to);

    if (start && end && start.unit === end.unit) {
        const value = start.value + (end.value - start.value) * t;
        return `${round(value)}${start.unit}`;
    }
    if (start?.value === 0) return `calc(${to} * ${round(t)})`;
    return `calc(${from} + (${to} - ${from}) * ${round(t)})`;
}

function parseLength(
    value: string
): { value: number; unit: string } | undefined {
    const match = /^(-?(?:\d*\.)?\d+)([a-z%]*)$/i.exec(value);
    if (!match) return undefined;
    return { value: Number(match[1]), unit: match[2] ?? '' };
}

function isEasing(arg: string): boolean {
    return /^(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|cubic-bezier\(.*\)|steps\(.*\))$/.test(
        arg
    );
}

function isPosition(token: string): boolean {
    const isFunction = /^(calc|var|min|max|clamp)\(/.test(token);
    return isFunction || parseLength(token) !== undefined;
}

/** The first gradient argument can set the direction or shape, e.g. `to bottom` or `circle at 0 0`. */
function isPrelude(arg: string): boolean {
    const isDirection = /^(to|from|at)\s/.test(arg);
    const isAngle = /^-?(\d*\.)?\d+(deg|grad|rad|turn)$/.test(arg);
    const isShape =
        /\b(circle|ellipse|closest-side|closest-corner|farthest-side|farthest-corner)\b|\sat\s/.test(
            arg
        );
    return isDirection || isAngle || isShape;
}

/** Splits on `separator`, but not inside brackets such as `rgb(0, 0, 0)`. */
function splitTopLevel(text: string, separator: ',' | ' '): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;

    for (let index = 0; index < text.length; index++) {
        const char = text.charAt(index);
        if (char === '(') depth++;
        if (char === ')') depth--;

        const isSeparator =
            separator === ' ' ? /\s/.test(char) : char === separator;
        if (depth !== 0 || !isSeparator) continue;

        parts.push(text.slice(start, index));
        start = index + 1;
    }
    parts.push(text.slice(start));

    return parts.map((part) => part.trim()).filter(Boolean);
}

const round = (value: number) => Math.round(value * 1000) / 1000;
