import { Card } from '@/ui/Card';
import { Skeleton } from '@/ui/Skeleton';
import { Switch } from '@/ui/Switch';

import { usePreferences } from './usePreferences';

export function SettingsPage() {
    const { preferences, ready, update } = usePreferences();

    return (
        <section className="mx-auto flex max-w-2xl flex-col gap-4 p-5">
            <div>
                <h1 className="text-2xl font-semibold">Settings</h1>
                <p className="mt-1 text-sm text-text-muted">
                    Small preferences are persisted through WXT storage.
                </p>
            </div>

            <Card variant="raised" className="flex flex-col gap-4">
                <Skeleton loading={!ready} hash="settings:compact">
                    <Switch
                        label="Compact media"
                        description="Use denser layouts where supported."
                        checked={preferences.compactMedia}
                        onCheckedChange={(checked) => {
                            void update({ compactMedia: checked });
                        }}
                    />
                </Skeleton>

                <Skeleton loading={!ready} hash="settings:explicit">
                    <Switch
                        label="Explicit badges"
                        description="Show explicit-content indicators on media."
                        checked={preferences.showExplicitBadge}
                        onCheckedChange={(checked) => {
                            void update({ showExplicitBadge: checked });
                        }}
                    />
                </Skeleton>
            </Card>
        </section>
    );
}
