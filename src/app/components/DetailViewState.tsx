import { Flex, Text } from '@radix-ui/themes';

import { SkeletonText } from './SkeletonText';

export function DetailViewLoadingState() {
    return (
        <Flex p="3" direction="column" gap="2">
            <SkeletonText loading variant="title">
                <Text size="5" weight="bold" />
            </SkeletonText>
            <SkeletonText loading variant="subtitle">
                <Text size="2" color="gray" />
            </SkeletonText>
        </Flex>
    );
}

type DetailViewMessageProps = {
    message: string;
};

export function DetailViewMessage({ message }: DetailViewMessageProps) {
    return (
        <Flex p="3" direction="column">
            <Text size="2" color="gray">
                {message}
            </Text>
        </Flex>
    );
}
