import { TokenType } from './tokenizer';

/**
 * Token colours. Kept apart from the renderer so a second theme is a new object
 * rather than a hunt through JSX.
 *
 * These are the same values the CodeMirror theme used, so the editor does not
 * suddenly look like a different application mid-migration.
 */
export interface EditorTheme {
    name: string;
    background: string;
    foreground: string;
    gutter: string;
    gutterActive: string;
    activeLine: string;
    selection: string;
    caret: string;
    border: string;
    tokens: Record<TokenType, string>;
}

export const lumiDark: EditorTheme = {
    name: 'Lumi Dark',
    background: '#0a0a0a',
    foreground: '#d1d1d1',
    gutter: '#5e5e5e',
    gutterActive: '#a6a6a6',
    activeLine: '#141414',
    selection: '#333333',
    caret: '#ed5e5e',
    border: '#262626',
    tokens: {
        comment: '#6b6b6b',
        string: '#a3d977',
        number: '#ffd479',
        keyword: '#f18383',
        type: '#e0b3ff',
        builtin: '#7fd3e0',
        constant: '#ffd479',
        operator: '#ff9d76',
        punctuation: '#8a8a8a',
        variable: '#d1d1d1',
        text: '#d1d1d1',
    },
};

export default lumiDark;
