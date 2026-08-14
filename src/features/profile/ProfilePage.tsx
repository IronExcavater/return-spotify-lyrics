import { useQuery } from '@tanstack/react-query';

import { asAppError } from '@/errors/AppError';
import { useAuth } from '@/features/auth/useAuth';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Skeleton } from '@/ui/Skeleton';

import { spotifyProfileQueryOptions } from './queries';

export function ProfilePage() {
    const { session, logout, logoutMutation } = useAuth();
    const spotify = useQuery(spotifyProfileQueryOptions);
    const profile = spotify.data;

    return (
        <section className="mx-auto flex max-w-lg flex-col gap-4 p-5">
            <div>
                <h1 className="text-2xl font-semibold">Profile</h1>
                <p className="mt-1 text-sm text-text-muted">
                    Basic Firebase session and Spotify profile state.
                </p>
            </div>

            <Card variant="raised" className="flex items-center gap-3">
                <Skeleton loading={spotify.isPending} hash="profile:avatar" size={48} radius={999}>
                    <Avatar
                        src={profile?.images[0]?.url ?? session?.photoURL}
                        fallback={(profile?.displayName ?? session?.displayName ?? 'U').slice(0, 2)}
                        size="lg"
                    />
                </Skeleton>

                <div className="min-w-0 flex-1">
                    <Skeleton loading={spotify.isPending} hash="profile:name">
                        <div className="truncate font-medium">
                            {profile?.displayName ?? session?.displayName ?? 'Connected account'}
                        </div>
                    </Skeleton>
                    <div className="truncate text-sm text-text-muted">
                        {profile?.email ?? session?.email ?? 'No email available'}
                    </div>
                </div>
            </Card>

            {spotify.error && (
                <p className="text-sm text-danger">{asAppError(spotify.error).message}</p>
            )}

            <Button
                variant="outline"
                className="self-start"
                loading={logoutMutation.isPending}
                disabled={!session}
                onClick={() => {
                    void logout();
                }}
            >
                Sign out
            </Button>
        </section>
    );
}
