export type SidebarImplementation = 'chromium' | 'firefox' | 'opera' | 'none';

export type SidebarCapability = {
    implementation: SidebarImplementation;
    available: boolean;
    programmaticOpen: boolean;
};

export type SidebarApis = {
    sidePanelOpen?: () => Promise<void>;
    sidebarActionOpen?: () => Promise<void>;
    operaSidebarPresent?: boolean;
};

export type SidebarOpenResult =
    | { status: 'opened'; implementation: 'chromium' | 'firefox' }
    | { status: 'manual'; implementation: 'opera' }
    | { status: 'unsupported'; implementation: 'none' };

type RuntimeExtensions = typeof globalThis & {
    chrome?: {
        sidePanel?: {
            open(options: { windowId: number }): Promise<void>;
        };
        windows?: {
            getCurrent(): Promise<{ id?: number }>;
        };
    };
    browser?: {
        sidebarAction?: {
            open(): Promise<void>;
        };
    };
    opr?: {
        sidebarAction?: object;
    };
};

export function resolveSidebarCapability(apis: SidebarApis): SidebarCapability {
    if (apis.sidePanelOpen) {
        return {
            implementation: 'chromium',
            available: true,
            programmaticOpen: true,
        };
    }

    if (apis.sidebarActionOpen) {
        return {
            implementation: 'firefox',
            available: true,
            programmaticOpen: true,
        };
    }

    if (apis.operaSidebarPresent) {
        return {
            implementation: 'opera',
            available: true,
            programmaticOpen: false,
        };
    }

    return {
        implementation: 'none',
        available: false,
        programmaticOpen: false,
    };
}

export function getRuntimeSidebarApis(): SidebarApis {
    const runtime = globalThis as RuntimeExtensions;
    const chromeApi = runtime.chrome;
    const browserApi = runtime.browser;

    const sidePanelOpen =
        chromeApi?.sidePanel?.open && chromeApi.windows?.getCurrent
            ? async () => {
                  const currentWindow = await chromeApi.windows!.getCurrent();
                  if (typeof currentWindow.id !== 'number') {
                      throw new Error(
                          'Unable to resolve the current browser window'
                      );
                  }
                  await chromeApi.sidePanel!.open({
                      windowId: currentWindow.id,
                  });
              }
            : undefined;

    const sidebarActionOpen = browserApi?.sidebarAction?.open
        ? async () => {
              await browserApi.sidebarAction!.open();
          }
        : undefined;

    return {
        sidePanelOpen,
        sidebarActionOpen,
        operaSidebarPresent: Boolean(runtime.opr?.sidebarAction),
    };
}

export async function openSidebar(
    apis: SidebarApis = getRuntimeSidebarApis()
): Promise<SidebarOpenResult> {
    const capability = resolveSidebarCapability(apis);

    switch (capability.implementation) {
        case 'chromium':
            await apis.sidePanelOpen!();
            return { status: 'opened', implementation: 'chromium' };
        case 'firefox':
            await apis.sidebarActionOpen!();
            return { status: 'opened', implementation: 'firefox' };
        case 'opera':
            return { status: 'manual', implementation: 'opera' };
        case 'none':
            return { status: 'unsupported', implementation: 'none' };
    }
}
