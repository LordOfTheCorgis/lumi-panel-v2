import { TokenType } from './tokenizer';

/**
 * Editor theme.
 *
 * The palette is built rather than borrowed. Two rules held throughout:
 *
 * 1. Keywords carry the brand hue. Everything else is arranged around them, so
 *    the editor reads as part of this panel and not as a stock component that
 *    happens to be embedded in it.
 * 2. Nothing competes with the text. Comments recede, punctuation recedes,
 *    identifiers sit at plain foreground. Only the things worth finding at a
 *    glance - strings, numbers, keywords - carry saturation. A rainbow is easy
 *    and actively worse to read for hours.
 */
export interface EditorTheme {
    name: string;
    background: string;
    foreground: string;

    gutter: string;
    gutterActive: string;
    gutterBorder: string;

    activeLine: string;
    /** Accent down the left of the active line; subtler than tinting the row. */
    activeLineAccent: string;

    selection: string;
    /** Selection when the editor does not have focus. */
    selectionBlurred: string;

    caret: string;
    /** Bloom around the caret. Small, but it makes it feel lit rather than drawn. */
    caretGlow: string;

    indentGuide: string;
    indentGuideActive: string;

    matchingBracket: string;
    searchMatch: string;
    searchMatchActive: string;

    tokens: Record<TokenType, string>;
    /** Tokens rendered in italic. Comments only, deliberately. */
    italics: TokenType[];
}

export const lumiDark: EditorTheme = {
    name: 'Lumi Dark',
    background: '#0a0a0a',
    foreground: '#d4d4d4',

    gutter: '#4a4a4a',
    gutterActive: '#c9c9c9',
    gutterBorder: '#1a1a1a',

    activeLine: '#121212',
    activeLineAccent: 'rgba(237, 94, 94, 0.55)',

    selection: 'rgba(237, 94, 94, 0.20)',
    selectionBlurred: 'rgba(255, 255, 255, 0.08)',

    caret: '#ed5e5e',
    caretGlow: 'rgba(237, 94, 94, 0.55)',

    indentGuide: '#1c1c1c',
    indentGuideActive: '#3a3a3a',

    matchingBracket: 'rgba(127, 201, 216, 0.28)',
    searchMatch: 'rgba(232, 181, 99, 0.22)',
    searchMatchActive: 'rgba(232, 181, 99, 0.45)',

    tokens: {
        // Recedes. You are not meant to read these first.
        comment: '#5c5c5c',
        // Warm and clearly non-code.
        string: '#a8cf87',
        number: '#e8b563',
        constant: '#e8b563',
        // The brand hue, on the thing you scan for.
        keyword: '#f18383',
        type: '#d8a8e8',
        builtin: '#7fc9d8',
        operator: '#e0906c',
        // Structure, not content.
        punctuation: '#6f6f6f',
        variable: '#d4d4d4',
        text: '#d4d4d4',
    },
    italics: ['comment'],
};

/** Stack chosen for ligature support first, then metric consistency. */
export const EDITOR_FONT_STACK =
    '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

export default lumiDark;
