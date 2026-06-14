import { useState } from 'react';
import { Button, Flex, Text, TextArea, TextField } from '@radix-ui/themes';

import { normalizeError } from '../../../shared/logging';
import { sendSpotifyMessage } from '../../../shared/messaging';
import { showToast } from '../../data/toastStore';
import { markTrackPlaylistCatalogStale } from '../../features/playlists/store';
import { useAuth } from '../../hooks/useAuth';
import { FullPageDialog } from '../FullPageDialog';

type ConfirmRemovalProps = {
    open: boolean;
    playlistName: string;
    removing: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function ConfirmPlaylistRemovalDialog({
    open,
    playlistName,
    removing,
    onOpenChange,
    onConfirm,
}: ConfirmRemovalProps) {
    return (
        <FullPageDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Remove playlist?"
            description={`"${playlistName}" will be removed from your Spotify library. Spotify does not expose permanent deletion through its API.`}
        >
            <Flex justify="end" gap="2">
                <Button
                    size="1"
                    variant="soft"
                    disabled={removing}
                    onClick={() => onOpenChange(false)}
                >
                    Cancel
                </Button>
                <Button
                    size="1"
                    color="red"
                    disabled={removing}
                    onClick={onConfirm}
                >
                    {removing ? 'Removing...' : 'Remove'}
                </Button>
            </Flex>
        </FullPageDialog>
    );
}

type CreatePlaylistProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: () => void;
};

export function CreatePlaylistDialog({
    open,
    onOpenChange,
    onCreated,
}: CreatePlaylistProps) {
    const { profile } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const canSubmit = Boolean(profile?.id && name.trim()) && !saving;

    const close = () => {
        if (saving) return;
        setName('');
        setDescription('');
        onOpenChange(false);
    };

    const handleCreate = async () => {
        if (!profile?.id || !name.trim() || saving) return;
        setSaving(true);
        try {
            await sendSpotifyMessage('createPlaylist', {
                userId: profile.id,
                name: name.trim(),
                description: description.trim() || undefined,
                public: false,
            });
            await markTrackPlaylistCatalogStale();
            showToast({ title: 'Playlist created', tone: 'success' });
            setName('');
            setDescription('');
            onOpenChange(false);
            onCreated?.();
        } catch (error) {
            showToast({
                title: 'Could not create playlist',
                description: normalizeError(error).message,
                tone: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <FullPageDialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (nextOpen) onOpenChange(true);
                else close();
            }}
            title="Create playlist"
            description="New playlists are private until you change their visibility."
        >
            <Flex direction="column" gap="3">
                <Flex direction="column" gap="1">
                    <Text size="1" color="gray">
                        Name
                    </Text>
                    <TextField.Root
                        value={name}
                        disabled={saving}
                        onChange={(event) => setName(event.target.value)}
                    />
                </Flex>
                <Flex direction="column" gap="1">
                    <Text size="1" color="gray">
                        Description
                    </Text>
                    <TextArea
                        value={description}
                        disabled={saving}
                        resize="vertical"
                        rows={4}
                        onChange={(event) => setDescription(event.target.value)}
                    />
                </Flex>
                <Flex justify="end" gap="2">
                    <Button
                        size="1"
                        variant="soft"
                        disabled={saving}
                        onClick={close}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="1"
                        disabled={!canSubmit}
                        onClick={() => void handleCreate()}
                    >
                        {saving ? 'Creating...' : 'Create'}
                    </Button>
                </Flex>
            </Flex>
        </FullPageDialog>
    );
}

type ManageCollaboratorsProps = {
    open: boolean;
    spotifyUrl?: string;
    onOpenChange: (open: boolean) => void;
};

export function ManageCollaboratorsDialog({
    open,
    spotifyUrl,
    onOpenChange,
}: ManageCollaboratorsProps) {
    return (
        <FullPageDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Manage collaborators"
            description="Spotify manages named collaborator invites in its own app. Open this playlist in Spotify to invite or remove people."
        >
            <Flex justify="end" gap="2">
                <Button
                    size="1"
                    variant="soft"
                    onClick={() => onOpenChange(false)}
                >
                    Close
                </Button>
                <Button
                    size="1"
                    disabled={!spotifyUrl}
                    onClick={() => {
                        if (!spotifyUrl) return;
                        window.open(
                            spotifyUrl,
                            '_blank',
                            'noopener,noreferrer'
                        );
                        onOpenChange(false);
                    }}
                >
                    Open in Spotify
                </Button>
            </Flex>
        </FullPageDialog>
    );
}
