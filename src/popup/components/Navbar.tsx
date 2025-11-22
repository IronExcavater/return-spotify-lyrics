import { Flex, Avatar, IconButton, Heading } from '@radix-ui/themes';
import { useNavigate } from 'react-router-dom';
import { PersonIcon } from '@radix-ui/react-icons';
import { User } from '@spotify/web-api-ts-sdk';

interface Props {
    profile: User | undefined;
}

export function Navbar({ profile }: Props) {
    const navigate = useNavigate();

    const image = profile?.images?.[0]?.url;

    return (
        <Flex
            px="3"
            py="2"
            align="center"
            justify="between"
            style={{ borderBottom: '2px solid var(--gray-a6)' }}
        >
            <Heading
                size="5"
                weight="bold"
                onClick={() => navigate('/')}
                className={'cursor-pointer select-none'}
            >
                Return Spotify Lyrics
            </Heading>

            <Avatar
                fallback={<PersonIcon />}
                radius="full"
                src={image}
                className={'cursor-pointer'}
                asChild
            >
                <IconButton onClick={() => navigate('/profile')} />
            </Avatar>
        </Flex>
    );
}
