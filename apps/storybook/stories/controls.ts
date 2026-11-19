import { EDGES } from '@return-spotify-lyrics/ui/geometry';

/** Checkboxes, so that the control always sends a list of edges. */
export const directionControl = {
    control: 'inline-check',
    options: EDGES.map((edge) => edge.name),
} as const;

/** A number field, because the docs plugin can't read the imported CssLength type and guesses the wrong control. */
export const lengthControl = { control: 'number' } as const;
