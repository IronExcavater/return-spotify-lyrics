import type { ReactNode } from 'react';

/** The name of a control: visible text, or an `aria-label` when it shows no text. */
export type LabelProps =
    | {
          /** The text beside the control. A click on it works as a click on the control. */
          label: ReactNode;
      }
    | { label?: undefined; 'aria-label': string };
