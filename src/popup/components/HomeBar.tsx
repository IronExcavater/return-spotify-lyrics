import { Flex, Heading } from '@radix-ui/themes';
import { HomeIcon } from '@radix-ui/react-icons';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
    profileSlot?: ReactNode;
}

export function HomeBar({ profileSlot }: Props) {
    const navigate = useNavigate();

    return (
        <Flex align="center" justify="between" gap="2">
            <Heading
                as="h1"
                size="5"
                role="button"
                tabIndex={0}
                onClick={() => navigate('/home')}
                className="flex cursor-pointer items-center gap-2 px-3 py-1 text-left font-semibold select-none"
            >
                <HomeIcon width="20" height="20" />
                <span>Return Spotify Lyrics</span>
            </Heading>
            {profileSlot ?? null}
        </Flex>
    );
}
