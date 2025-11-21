import { SpotifyProfile } from '../../shared/types';

interface Props {
    profile: SpotifyProfile;
    onLogout: () => void;
}

export function ProfileView({ profile, onLogout }: Props) {
    return (
        <>
            <button onClick={onLogout}>Logout</button>

            <div>
                <img src={profile.images![0]?.url} />
                <p>{profile.display_name}</p>
            </div>
        </>
    );
}
