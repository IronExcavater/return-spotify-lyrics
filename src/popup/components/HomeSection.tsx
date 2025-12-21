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
                <Flex direction="column" gap="1">
                    <Text size="3" weight="bold">
                        {title}
                    </Text>
                    {subtitle && (
                        <Text size="2" color="gray">
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
