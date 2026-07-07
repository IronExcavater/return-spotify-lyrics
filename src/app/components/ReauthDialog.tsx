import { useEffect, useState } from 'react';
import { Button, Dialog, Flex } from '@radix-ui/themes';

import { SpotifyAuthNoticeList } from '../features/auth/SpotifyAuthNoticeList';
import type { SpotifyAuthNotice } from '../features/auth/spotifyAuthNotices';

interface Props {
    open: boolean;
    notices: SpotifyAuthNotice[];
    onReconnect: () => void;
}

export function ReauthDialog({ open, notices, onReconnect }: Props) {
    const [reauthing, setReauthing] = useState(false);

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
                    Sign in again to keep Spotify connected.
                </Dialog.Description>
                <SpotifyAuthNoticeList
                    notices={notices}
                    tone="panel"
                    className="mb-3"
                />
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
