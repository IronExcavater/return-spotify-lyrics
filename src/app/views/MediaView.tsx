import { DetailViewLayout } from '../components/DetailViewLayout';
import {
    DetailViewLoadingState,
    DetailViewMessage,
} from '../components/DetailViewState';
import {
    AlbumSections,
    ArtistSections,
    ShowSections,
} from '../features/media/view/MediaViewSections';
import { useMediaViewModel } from '../features/media/viewModel/useMediaViewModel';

export function MediaView() {
    const vm = useMediaViewModel();

    if (vm.restoring) return <DetailViewLoadingState />;

    if (vm.message) {
        return <DetailViewMessage message={vm.message} />;
    }

    return (
        <DetailViewLayout {...vm.layout}>
            {vm.activeKind === 'album' && (
                <AlbumSections {...vm.albumSections} />
            )}
            {vm.activeKind === 'show' && <ShowSections {...vm.showSections} />}
            {vm.activeKind === 'artist' && (
                <ArtistSections {...vm.artistSections} />
            )}
        </DetailViewLayout>
    );
}
