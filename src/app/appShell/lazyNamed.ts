import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type ComponentExport<TModule, TExport extends keyof TModule> =
    TModule[TExport] extends ComponentType<infer TProps>
        ? ComponentType<TProps>
        : never;

export function lazyNamed<TModule, TExport extends keyof TModule>(
    loadModule: () => Promise<TModule>,
    exportName: TExport
): LazyExoticComponent<ComponentExport<TModule, TExport>> {
    return lazy(async () => {
        const module = await loadModule();

        return {
            default: module[exportName] as ComponentExport<TModule, TExport>,
        };
    });
}
