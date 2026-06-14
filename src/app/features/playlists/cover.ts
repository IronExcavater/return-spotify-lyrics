const MAX_PLAYLIST_COVER_BYTES = 256 * 1024;
const INITIAL_COVER_SIZE = 512;
const MIN_COVER_SIZE = 128;
const QUALITY_STEPS = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4] as const;

const estimateBase64Bytes = (value: string) =>
    Math.ceil((value.length * 3) / 4);

const loadImage = (file: File) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not decode the selected image.'));
        };
        image.src = objectUrl;
    });

const renderSquare = (
    image: HTMLImageElement,
    size: number,
    quality: number
) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the playlist cover.');

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = (image.naturalWidth - sourceSize) / 2;
    const sourceY = (image.naturalHeight - sourceSize) / 2;
    context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        size,
        size
    );

    return canvas.toDataURL('image/jpeg', quality).split(';base64,')[1] ?? '';
};

export async function preparePlaylistCover(file: File) {
    const image = await loadImage(file);

    for (
        let size = INITIAL_COVER_SIZE;
        size >= MIN_COVER_SIZE;
        size = Math.floor(size / 2)
    ) {
        for (const quality of QUALITY_STEPS) {
            const base64Jpeg = renderSquare(image, size, quality);
            if (
                base64Jpeg &&
                estimateBase64Bytes(base64Jpeg) <= MAX_PLAYLIST_COVER_BYTES
            ) {
                return base64Jpeg;
            }
        }
    }

    throw new Error('The selected image could not fit Spotify’s 256 KB limit.');
}
