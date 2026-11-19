import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const themePath = fileURLToPath(new URL('./theme.css', import.meta.url));

const resolveStylesheet = (id: string, base: string) => {
    if (id.startsWith('.')) return resolve(base, id);
    // The tailwindcss main export is JavaScript, so the stylesheet sits beside its package.json.
    if (id === 'tailwindcss') {
        return join(
            dirname(require.resolve('tailwindcss/package.json')),
            'index.css'
        );
    }
    return require.resolve(id);
};

const loadStylesheet = async (id: string, base: string) => {
    const path = resolveStylesheet(id, base);
    return { path, base: dirname(path), content: await readFile(path, 'utf8') };
};

const compileTheme = async () =>
    compile(await readFile(themePath, 'utf8'), {
        base: dirname(themePath),
        loadStylesheet,
    });

const compiler = await compileTheme();

const ruleOf = (css: string, className: string) =>
    new RegExp(`\\.${className} \\{([^}]*)\\}`).exec(css)?.[1];

describe('theme', () => {
    it('makes a class for every token', () => {
        const classes = [
            'bg-default',
            'bg-raised',
            'bg-overlay',
            'bg-tint',
            'bg-tint-strong',
            'bg-shade',
            'bg-shade-strong',
            'bg-accent',
            'bg-accent-strong',
            'bg-negative',
            'bg-negative-strong',
            'bg-inverse',
            'text-default',
            'text-subdued',
            'text-faint',
            'text-accent',
            'text-negative',
            'text-warning',
            'text-info',
            'text-inverse',
            'border-strong',
            'border-default',
            'border-faint',
            'border-accent',
            'border-negative',
            'outline-focus',
            'text-small',
            'text-medium',
            'text-large',
            'text-x-large',
            'text-xx-large',
            'rounded-small',
            'rounded-medium',
            'shadow-overlay',
            'duration-fast',
            'duration-default',
            'duration-slow',
            'z-sticky',
            'z-overlay',
            'z-modal',
            'z-top',
            'opacity-disabled',
        ];
        const css = compiler.build(classes);
        for (const name of classes)
            expect(ruleOf(css, name), name).toBeDefined();
    });

    it('sets only the colour with text-default', () => {
        const rule = ruleOf(compiler.build(['text-default']), 'text-default');
        expect(rule).toContain('color: var(--text-color-default)');
        expect(rule).not.toContain('font-size');
    });

    it('sets only the size with text-medium', () => {
        const rule = ruleOf(compiler.build(['text-medium']), 'text-medium');
        expect(rule).toContain('font-size: var(--text-medium)');
        expect(rule).not.toMatch(/(^|[^-])color:/);
    });

    it('makes no class for a cleared Tailwind value', () => {
        const cleared = [
            'bg-neutral-300',
            'text-red-500',
            'text-sm',
            'rounded-lg',
            'shadow-md',
            'drop-shadow-md',
            'inset-shadow-sm',
            'text-shadow-md',
        ];
        const css = compiler.build(cleared);
        for (const name of cleared) {
            expect(ruleOf(css, name), name).toBeUndefined();
        }
    });

    it('keeps Tailwind spacing, weights and easings', () => {
        const kept = ['p-4', 'font-bold', 'ease-in-out'];
        const css = compiler.build(kept);
        for (const name of kept) expect(ruleOf(css, name), name).toBeDefined();
    });

    it('writes every token to :root, even when no class uses it', async () => {
        // A fresh compiler, because build() keeps every class from earlier calls.
        const css = (await compileTheme()).build([]);
        expect(css).toContain('--background-color-raised:');
        expect(css).toContain('--z-index-modal:');
    });

    it('removes motion under prefers-reduced-motion', () => {
        const css = compiler.build([]);
        expect(css).toMatch(
            /prefers-reduced-motion: reduce[\s\S]*--transition-duration-slow: 0s/
        );
    });
});
