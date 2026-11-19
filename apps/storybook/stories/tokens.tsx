import { Unstyled } from '@storybook/addon-docs/blocks';
import type { ReactNode } from 'react';

/** The live value of a variable on `:root`, so that the page shows an override. */
export const readToken = (variable: string) =>
    getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim();

/** A list of tokens on the page background. */
export function Panel({ children }: { children: ReactNode }) {
    return (
        <Unstyled>
            <div className="divide-y divide-faint rounded-medium bg-default px-6 font-sans text-default">
                {children}
            </div>
        </Unstyled>
    );
}

export type TokenProps = {
    name: string;
    value: string;
    use: string;
    /** A preview of the token. */
    children?: ReactNode;
};

/** One token in a row: a preview, its name, its typical use and its value. */
export function Token({ name, value, use, children }: TokenProps) {
    return (
        <div className="grid grid-cols-[5rem_10rem_1fr_auto] items-center gap-x-6 py-3">
            <div className="flex">{children}</div>
            <div className="font-mono">{name}</div>
            <div className="text-subdued">{use}</div>
            <div className="max-w-56 text-right font-mono text-small text-subdued">
                {value}
            </div>
        </div>
    );
}

/** A colour over bg-raised, so that a see-through colour shows. */
export function Swatch({ variable }: { variable: string }) {
    const color = `var(${variable})`;
    return (
        <div
            className="size-10 rounded-small border border-faint"
            style={{
                background: `linear-gradient(${color}, ${color}), var(--background-color-raised)`,
            }}
        />
    );
}
