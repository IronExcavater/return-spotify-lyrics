import { useEffect, useState } from 'react';
import { Button, Dialog, Flex, Text, Tooltip } from '@radix-ui/themes';

interface Props {
    open: boolean;
    missingScopes: string[];
    reasons: Array<'missing-scopes' | string>;
    onReconnect: () => void;
}

const resolveDescription = (reasons: Props['reasons']) => {
    if (reasons.includes('missing-scopes')) {
        return 'Some Spotify permissions are missing. Please reconnect to restore full access.';
    }
    return 'We need to reconnect your Spotify account to continue.';
};

const scopeDescriptions: Record<string, string> = {
    'playlist-read-private': 'Read your private playlists',
    'playlist-read-collaborative': 'Read collaborative playlists you follow',
    'playlist-modify-public': 'Edit your public playlists',
    'playlist-modify-private': 'Edit your private playlists',
    'user-read-playback-state': 'Read your current playback state',
    'user-read-currently-playing': 'Read the currently playing track',
    'user-read-recently-played': 'Read your recently played tracks',
    'user-top-read': 'Read your top artists and tracks',
    'user-library-read': 'Read your saved tracks and albums',
};

const renderScopeChip = (scope: string) => {
    const description = scopeDescriptions[scope];
    const chip = (
        <Text
            key={scope}
            size="1"
            className="text-gray-11 rounded-full bg-white/5 px-2 py-0.5 transition-colors hover:bg-white/8"
        >
            {scope}
        </Text>
    );
    if (!description) return chip;
    return (
        <Tooltip key={scope} content={description}>
            {chip}
        </Tooltip>
    );
};

export function ReauthDialog({
    open,
    missingScopes,
    reasons,
    onReconnect,
}: Props) {
    const [reauthing, setReauthing] = useState(false);
    const description = resolveDescription(reasons);

    useEffect(() => {
        if (!open && reauthing) setReauthing(false);
    }, [open, reauthing]);

    const handleReconnect = () => {
        if (reauthing) return;
        setReauthing(true);
        onReconnect();
    };

    return (
        <Dialog.Root open={open} onOpenChange={() => undefined}>
            <Dialog.Content size="1" maxWidth="360px">
                <Dialog.Title size="3">Reconnect Spotify</Dialog.Title>
                <Dialog.Description size="2" color="gray" mb="3">
                    {description}
                </Dialog.Description>
                {missingScopes.length > 0 && (
                    <Flex direction="column" gap="2" mb="3">
                        <Flex gap="1" wrap="wrap">
                            {missingScopes.map((scope) =>
                                renderScopeChip(scope)
                            )}
                        </Flex>
                    </Flex>
                )}
                <Flex justify="end" gap="2">
                    <Button
                        size="1"
                        variant="solid"
                        onClick={handleReconnect}
                        disabled={reauthing}
                    >
                        {reauthing ? 'Reconnecting…' : 'Reconnect'}
                    </Button>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
