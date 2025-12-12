import { SegmentedControl } from '@radix-ui/themes';

interface Props {
    active: 'home' | 'playback';
    canShowPlayback: boolean;
    onShowHome: () => void;
    onShowPlayback: () => void;
}

export function NavBar({
    active,
    canShowPlayback,
    onShowHome,
    onShowPlayback,
}: Props) {
    return (
        <div className="flex justify-center">
            <SegmentedControl.Root
                size="1"
                value={active}
                onValueChange={(value) => {
                    if (value === 'playback' && canShowPlayback) {
                        onShowPlayback();
                    } else if (value === 'home') {
                        onShowHome();
                    }
                }}
            >
                {canShowPlayback && (
                    <SegmentedControl.Item value="playback">
                        Player
                    </SegmentedControl.Item>
                )}
                <SegmentedControl.Item value="home">Home</SegmentedControl.Item>
            </SegmentedControl.Root>
        </div>
    );
}
