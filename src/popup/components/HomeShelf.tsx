import { ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

export function HomeShelf({ children }: Props) {
    return (
        <div className="flex gap-2 overflow-x-auto pr-1 pb-2">{children}</div>
    );
}
