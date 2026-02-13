import {
    createContext,
    useCallback,
    useContext,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type HTMLAttributes,
    type ReactNode,
    type RefObject,
} from 'react';
import clsx from 'clsx';

type StickyItem = {
    id: string;
    order: number;
    height: number;
    seq: number;
};

type StickyStackContextValue = {
    register: (id: string, order: number) => void;
    unregister: (id: string) => void;
    updateHeight: (id: string, height: number) => void;
    getOffset: (id: string) => number;
    total: number;
    baseOffset: number;
};

type StickyRootContextValue = {
    total: number;
    rootStack: StickyStackContextValue;
};

const StickyRootContext = createContext<StickyRootContextValue | null>(null);
const StickyStackContext = createContext<StickyStackContextValue | null>(null);

const useStickyRoot = () => {
    const ctx = useContext(StickyRootContext);
    if (!ctx) {
        throw new Error('StickyLayout components must be used inside Root.');
    }
    return ctx;
};

const useStickyStack = () => {
    const ctx = useContext(StickyStackContext);
    if (!ctx) {
        throw new Error('StickyLayout components must be used inside Root.');
    }
    return ctx;
};

const useOptionalStickyStack = () => useContext(StickyStackContext);

type RootProps = {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    scrollRef?: RefObject<HTMLElement | null>;
};

type StickyStackState = {
    register: (id: string, order: number) => void;
    unregister: (id: string) => void;
    updateHeight: (id: string, height: number) => void;
    getOffset: (id: string) => number;
    total: number;
};

const useStickyStackState = (): StickyStackState => {
    const [items, setItems] = useState<StickyItem[]>([]);
    const seqRef = useRef(0);

    const register = useCallback((id: string, order: number) => {
        setItems((prev) => {
            if (prev.some((item) => item.id === id)) {
                return prev.map((item) =>
                    item.id === id ? { ...item, order } : item
                );
            }
            const next: StickyItem = {
                id,
                order,
                height: 0,
                seq: seqRef.current++,
            };
            return [...prev, next];
        });
    }, []);

    const unregister = useCallback((id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const updateHeight = useCallback((id: string, height: number) => {
        setItems((prev) => {
            let changed = false;
            const next = prev.map((item) => {
                if (item.id !== id) return item;
                if (Math.abs(item.height - height) < 0.5) return item;
                changed = true;
                return { ...item, height };
            });
            return changed ? next : prev;
        });
    }, []);

    const ordered = useMemo(() => {
        const next = [...items];
        next.sort((a, b) => a.order - b.order || a.seq - b.seq);
        return next;
    }, [items]);

    const offsets = useMemo(() => {
        let sum = 0;
        const map = new Map<string, number>();
        ordered.forEach((item) => {
            map.set(item.id, sum);
            sum += item.height;
        });
        return { map, total: sum };
    }, [ordered]);

    const getOffset = useCallback(
        (id: string) => offsets.map.get(id) ?? 0,
        [offsets]
    );

    return {
        register,
        unregister,
        updateHeight,
        getOffset,
        total: offsets.total,
    };
};

function Root({ children, className, style, scrollRef }: RootProps) {
    const stack = useStickyStackState();
    const rootStack = useMemo(
        () => ({
            register: stack.register,
            unregister: stack.unregister,
            updateHeight: stack.updateHeight,
            getOffset: stack.getOffset,
            total: stack.total,
            baseOffset: 0,
        }),
        [
            stack.getOffset,
            stack.register,
            stack.total,
            stack.unregister,
            stack.updateHeight,
        ]
    );
    const rootValue = useMemo(
        () => ({ total: stack.total, rootStack }),
        [rootStack, stack.total]
    );

    const rootStyle = {
        ...style,
        '--sticky-top': `${stack.total}px`,
    } as CSSProperties;

    return (
        <StickyRootContext.Provider value={rootValue}>
            <StickyStackContext.Provider value={rootStack}>
                <div
                    ref={scrollRef as RefObject<HTMLDivElement> | undefined}
                    className={className}
                    style={rootStyle}
                >
                    {children}
                </div>
            </StickyStackContext.Provider>
        </StickyRootContext.Provider>
    );
}

type StickyProps = {
    children: ReactNode;
    order?: number;
    className?: string;
    style?: CSSProperties;
    zIndex?: number;
    scope?: 'auto' | 'root';
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'children'>;

function Sticky({
    children,
    order = 0,
    className,
    style,
    zIndex = 30,
    scope = 'auto',
    ...rest
}: StickyProps) {
    const id = useId();
    const root = useStickyRoot();
    const stack = useStickyStack();
    const activeStack = scope === 'root' ? root.rootStack : stack;
    const { register, unregister, updateHeight, getOffset, baseOffset } =
        activeStack;
    const ref = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        register(id, order);
        return () => unregister(id);
    }, [id, order, register, unregister]);

    useLayoutEffect(() => {
        const node = ref.current;
        if (!node) return;
        const measureNode =
            node.querySelector<HTMLElement>('[data-sticky-size]') ?? node;
        const measure = () => {
            const rect = measureNode.getBoundingClientRect();
            const offsetRaw =
                measureNode.getAttribute('data-sticky-offset') ??
                node.getAttribute('data-sticky-offset') ??
                '0';
            const offset = Number.parseFloat(offsetRaw);
            const height = Math.max(
                0,
                Math.ceil(rect.height - (Number.isFinite(offset) ? offset : 0))
            );
            updateHeight(id, height);
            node.style.setProperty('--sticky-height', `${height}px`);
        };
        measure();
        const observer = new ResizeObserver(() => measure());
        observer.observe(measureNode);
        if (measureNode !== node) {
            observer.observe(node);
        }
        return () => observer.disconnect();
    }, [id, updateHeight]);

    const offset = baseOffset + getOffset(id);

    return (
        <div
            {...rest}
            ref={ref}
            className={clsx('sticky', className)}
            style={{ top: offset, zIndex, ...style }}
        >
            {children}
        </div>
    );
}

type BodyProps = {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
};

function Body({ children, className, style }: BodyProps) {
    return (
        <div className={clsx('relative min-w-0', className)} style={style}>
            {children}
        </div>
    );
}

type StackProps = {
    children: ReactNode;
    base?: 'root' | 'parent';
    className?: string;
    style?: CSSProperties;
};

function Stack({ children, base = 'root', className, style }: StackProps) {
    const root = useStickyRoot();
    const parent = useOptionalStickyStack();
    const baseOffset =
        base === 'parent' && parent
            ? parent.baseOffset + parent.total
            : root.total;
    const stack = useStickyStackState();
    const value = useMemo(
        () => ({
            register: stack.register,
            unregister: stack.unregister,
            updateHeight: stack.updateHeight,
            getOffset: stack.getOffset,
            total: stack.total,
            baseOffset,
        }),
        [
            baseOffset,
            stack.getOffset,
            stack.register,
            stack.total,
            stack.unregister,
            stack.updateHeight,
        ]
    );

    const stackStyle = {
        ...style,
        '--sticky-top': `${baseOffset}px`,
    } as CSSProperties;

    return (
        <StickyStackContext.Provider value={value}>
            <div className={className} style={stackStyle}>
                {children}
            </div>
        </StickyStackContext.Provider>
    );
}

type ColumnsProps = {
    main: ReactNode;
    aside?: ReactNode;
    asideWidth?: string | number;
    gap?: string | number;
    align?: 'start' | 'center' | 'end' | 'stretch';
    stack?: boolean | 'main' | 'aside' | 'both';
    className?: string;
    style?: CSSProperties;
};

function Columns({
    main,
    aside,
    asideWidth = '240px',
    gap = '16px',
    align = 'start',
    stack = false,
    className,
    style,
}: ColumnsProps) {
    const template = aside
        ? `minmax(0, 1fr) ${
              typeof asideWidth === 'number' ? `${asideWidth}px` : asideWidth
          }`
        : 'minmax(0, 1fr)';
    const stackMode = stack === true ? 'both' : stack ? stack : 'none';
    const wrapPane = (content: ReactNode, enableStack: boolean) => {
        if (enableStack) {
            return <Stack className="min-w-0">{content}</Stack>;
        }
        return <div className="min-w-0">{content}</div>;
    };
    const mainPane = wrapPane(
        main,
        stackMode === 'both' || stackMode === 'main'
    );
    const asidePane = aside
        ? wrapPane(aside, stackMode === 'both' || stackMode === 'aside')
        : null;
    return (
        <div
            className={clsx('grid min-w-0', className)}
            style={{
                gridTemplateColumns: template,
                gap,
                alignItems: align,
                ...style,
            }}
        >
            {mainPane}
            {asidePane}
        </div>
    );
}

export const StickyLayout = {
    Root,
    Sticky,
    Body,
    Stack,
    Columns,
};
