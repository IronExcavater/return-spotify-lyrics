import type { Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

/** The Tiptap extensions of formatted Text, which RichTextArea uses too, so reading and editing render the same. */
export const TEXT_EXTENSIONS: Extensions = [
    StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
    }),
];
