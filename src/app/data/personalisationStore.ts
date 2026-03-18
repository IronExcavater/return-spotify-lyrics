import type { PersonalisationSnapshot } from '../../shared/personalisation';

let personalisationSnapshot: PersonalisationSnapshot | null = null;

export const readPersonalisationSnapshot = () => personalisationSnapshot;

export const writePersonalisationSnapshot = (
    snapshot: PersonalisationSnapshot
) => {
    personalisationSnapshot = snapshot;
};
