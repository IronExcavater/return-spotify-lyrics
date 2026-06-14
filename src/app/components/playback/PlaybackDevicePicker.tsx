import { useCallback, useEffect, useState } from 'react';
import { DesktopIcon } from '@radix-ui/react-icons';
import { DropdownMenu, IconButton, Tooltip } from '@radix-ui/themes';
import type { Device } from '@spotify/web-api-ts-sdk';

import { normalizeError } from '../../../shared/logging';
import { sendSpotifyMessage } from '../../../shared/messaging';
import { usePremiumPlaybackBlocked } from '../../data/playbackAccess';
import { showToast } from '../../data/toastStore';
import { syncPlayer } from '../../hooks/usePlayer';

export function PlaybackDevicePicker() {
    const premiumRequired = usePremiumPlaybackBlocked();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [devices, setDevices] = useState<Device[]>([]);
    const [transferringId, setTransferringId] = useState<string | null>(null);

    const loadDevices = useCallback(async () => {
        setLoading(true);
        try {
            const response = await sendSpotifyMessage('getAvailableDevices');
            setDevices(response.devices ?? []);
        } catch (error) {
            showToast({
                title: 'Could not load Spotify devices',
                description: normalizeError(error).message,
                tone: 'danger',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        void loadDevices();
    }, [loadDevices, open]);

    const transfer = async (device: Device) => {
        if (
            !device.id ||
            device.is_active ||
            device.is_restricted ||
            premiumRequired
        ) {
            return;
        }
        setTransferringId(device.id);
        try {
            await sendSpotifyMessage('transferPlayback', {
                deviceId: device.id,
            });
            await Promise.all([loadDevices(), syncPlayer()]);
        } catch (error) {
            showToast({
                title: 'Could not switch Spotify device',
                description: normalizeError(error).message,
                tone: 'danger',
            });
        } finally {
            setTransferringId(null);
        }
    };

    return (
        <DropdownMenu.Root open={open} onOpenChange={setOpen}>
            <Tooltip content="Spotify devices" className="shadow-lg">
                <DropdownMenu.Trigger>
                    <IconButton
                        variant="ghost"
                        radius="full"
                        size="1"
                        aria-label="Choose Spotify device"
                    >
                        <DesktopIcon />
                    </IconButton>
                </DropdownMenu.Trigger>
            </Tooltip>
            <DropdownMenu.Content align="end" size="1">
                {loading && devices.length === 0 ? (
                    <DropdownMenu.Item disabled>
                        Loading devices...
                    </DropdownMenu.Item>
                ) : devices.length === 0 ? (
                    <DropdownMenu.Item disabled>
                        No Spotify devices found
                    </DropdownMenu.Item>
                ) : (
                    devices.map((device) => {
                        const disabled =
                            !device.id ||
                            device.is_active ||
                            device.is_restricted ||
                            premiumRequired ||
                            transferringId != null;
                        const suffix = device.is_active
                            ? ' (active)'
                            : device.is_restricted
                              ? ' (restricted)'
                              : premiumRequired
                                ? ' (Premium required)'
                                : '';

                        return (
                            <DropdownMenu.Item
                                key={device.id ?? device.name}
                                disabled={disabled}
                                onSelect={() => void transfer(device)}
                            >
                                {device.name}
                                {suffix}
                            </DropdownMenu.Item>
                        );
                    })
                )}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}
