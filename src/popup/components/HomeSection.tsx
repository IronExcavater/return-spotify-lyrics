import { ReactNode } from 'react';
import { Flex, Text } from '@radix-ui/themes';

interface Props {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    children: ReactNode;
}

export function HomeSection({ title, subtitle, action, children }: Props) {
    return (
        <Flex direction="column" gap="2">
            <Flex align="center" justify="between" gap="2">
                <Flex align="baseline" gap="2" className="min-w-0">
                    <Text size="3" weight="bold" className="truncate">
                        {title}
                    </Text>
                    {subtitle && (
                        <Text size="1" color="gray" className="truncate">
                            {subtitle}
                        </Text>
                    )}
                </Flex>
                {action}
            </Flex>
            {children}
        </Flex>
    );
}
