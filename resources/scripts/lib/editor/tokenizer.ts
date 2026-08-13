/**
 * Syntax highlighter.
 *
 * This is a tokenizer, not a parser. It cannot tell you that a brace is
 * unbalanced or what type an expression has - it colours comments, strings,
 * numbers, keywords and operators, which is what a highlighter is actually for.
 *
 * Every language is described by data rather than code, so adding one is a
 * dozen lines in the registry instead of a hand-written grammar. That is the
 * whole reason broad language support is affordable here.
 */

export type TokenType =
    | 'comment'
    | 'string'
    | 'number'
    | 'keyword'
    | 'type'
    | 'builtin'
    | 'constant'
    | 'operator'
    | 'punctuation'
    | 'variable'
    | 'text';

export interface Token {
    type: TokenType;
    /** Column the token starts at, inclusive. */
    from: number;
    /** Column the token ends at, exclusive. */
    to: number;
}

export interface LanguageSpec {
    id: string;
    name: string;
    extensions: string[];
    aliases?: string[];
    /** Matched against the whole filename, for things like Dockerfile. */
    filenames?: RegExp[];

    lineComment?: string[];
    blockComment?: [string, string];
    /** Quote characters that open a single-line string. */
    quotes?: string[];
    /** Delimiters that open a string which may span lines, e.g. python's """. */
    multilineQuotes?: string[];
    /** Whether a backslash escapes the next character inside a string. */
    escapes?: boolean;

    keywords?: string[];
    types?: string[];
    builtins?: string[];
    constants?: string[];

    /** Overrides the default identifier shape for languages like $variables. */
    identifier?: RegExp;
    caseInsensitive?: boolean;
}

/** Carried between lines so block comments and multiline strings survive. */
export interface TokenizerState {
    inBlockComment: boolean;
    /** The delimiter that opened the current multiline string, if any. */
    inMultilineString: string | null;
}

export const initialState = (): TokenizerState => ({ inBlockComment: false, inMultilineString: null });

export const cloneState = (state: TokenizerState): TokenizerState => ({ ...state });

export const statesEqual = (a: TokenizerState, b: TokenizerState): boolean =>
    a.inBlockComment === b.inBlockComment && a.inMultilineString === b.inMultilineString;

const DEFAULT_IDENTIFIER = /[A-Za-z_$][\w$]*/y;
const DEFAULT_NUMBER = /0[xXbBoO][0-9a-fA-F_]+|\d[\d_]*(\.[\d_]+)?([eE][+-]?\d+)?/y;
const OPERATOR_CHARS = '+-*/%=<>!&|^~?:';
const PUNCTUATION_CHARS = '()[]{},;.';

interface Lookups {
    keywords: Set<string>;
    types: Set<string>;
    builtins: Set<string>;
    constants: Set<string>;
}

// Built once per language rather than per line; tokenizing is on the render
// path and this used to be the whole cost.
const lookupCache = new WeakMap<LanguageSpec, Lookups>();

const lookupsFor = (spec: LanguageSpec): Lookups => {
    const cached = lookupCache.get(spec);
    if (cached) return cached;

    const norm = (words: string[] = []) => new Set(spec.caseInsensitive ? words.map((w) => w.toLowerCase()) : words);

    const lookups: Lookups = {
        keywords: norm(spec.keywords),
        types: norm(spec.types),
        builtins: norm(spec.builtins),
        constants: norm(spec.constants),
    };

    lookupCache.set(spec, lookups);

    return lookups;
};

const classifyWord = (spec: LanguageSpec, word: string): TokenType => {
    const { keywords, types, builtins, constants } = lookupsFor(spec);
    const needle = spec.caseInsensitive ? word.toLowerCase() : word;

    if (keywords.has(needle)) return 'keyword';
    if (types.has(needle)) return 'type';
    if (builtins.has(needle)) return 'builtin';
    if (constants.has(needle)) return 'constant';

    return 'variable';
};

/**
 * Scans one line, continuing from the state the previous line ended in.
 * Returns the tokens plus the state the next line should start from.
 */
export const tokenizeLine = (
    spec: LanguageSpec,
    line: string,
    state: TokenizerState = initialState()
): { tokens: Token[]; state: TokenizerState } => {
    const tokens: Token[] = [];
    const next = cloneState(state);
    let pos = 0;

    const push = (type: TokenType, from: number, to: number) => {
        if (to > from) tokens.push({ type, from, to });
    };

    // Finish a block comment opened on an earlier line.
    if (next.inBlockComment && spec.blockComment) {
        const close = line.indexOf(spec.blockComment[1]);

        if (close === -1) {
            push('comment', 0, line.length);

            return { tokens, state: next };
        }

        const end = close + spec.blockComment[1].length;
        push('comment', 0, end);
        next.inBlockComment = false;
        pos = end;
    }

    // Likewise for a multiline string.
    if (next.inMultilineString) {
        const delimiter = next.inMultilineString;
        const close = line.indexOf(delimiter, pos);

        if (close === -1) {
            push('string', pos, line.length);

            return { tokens, state: next };
        }

        const end = close + delimiter.length;
        push('string', pos, end);
        next.inMultilineString = null;
        pos = end;
    }

    while (pos < line.length) {
        const char = line[pos];

        if (char === ' ' || char === '\t') {
            pos++;
            continue;
        }

        // Block comments are checked first because a line comment token can be
        // a prefix of a block comment opener. Lua is the case that matters:
        // "--" would eat "--[[" and swallow the rest of the block as one line.
        if (spec.blockComment && line.startsWith(spec.blockComment[0], pos)) {
            const close = line.indexOf(spec.blockComment[1], pos + spec.blockComment[0].length);

            if (close === -1) {
                push('comment', pos, line.length);
                next.inBlockComment = true;
                break;
            }

            const end = close + spec.blockComment[1].length;
            push('comment', pos, end);
            pos = end;
            continue;
        }

        // Line comment: everything to end of line.
        if (spec.lineComment?.some((token) => line.startsWith(token, pos))) {
            push('comment', pos, line.length);
            break;
        }

        // Multiline string. Checked before ordinary quotes so """ beats ".
        const multi = spec.multilineQuotes?.find((delimiter) => line.startsWith(delimiter, pos));
        if (multi) {
            const close = line.indexOf(multi, pos + multi.length);

            if (close === -1) {
                push('string', pos, line.length);
                next.inMultilineString = multi;
                break;
            }

            const end = close + multi.length;
            push('string', pos, end);
            pos = end;
            continue;
        }

        // Single-line string. An unterminated one stops at end of line rather
        // than bleeding into the rest of the file.
        if (spec.quotes?.includes(char)) {
            let cursor = pos + 1;

            while (cursor < line.length) {
                if (spec.escapes !== false && line[cursor] === '\\') {
                    cursor += 2;
                    continue;
                }

                if (line[cursor] === char) {
                    cursor++;
                    break;
                }

                cursor++;
            }

            push('string', pos, Math.min(cursor, line.length));
            pos = Math.min(cursor, line.length);
            continue;
        }

        // Numbers.
        DEFAULT_NUMBER.lastIndex = pos;
        const number = DEFAULT_NUMBER.exec(line);
        if (number && /[0-9]/.test(char)) {
            push('number', pos, pos + number[0].length);
            pos += number[0].length;
            continue;
        }

        // Identifiers and keywords.
        const identifier = spec.identifier ?? DEFAULT_IDENTIFIER;
        identifier.lastIndex = pos;
        const word = identifier.exec(line);
        if (word && word.index === pos && word[0].length > 0) {
            push(classifyWord(spec, word[0]), pos, pos + word[0].length);
            pos += word[0].length;
            continue;
        }

        if (OPERATOR_CHARS.includes(char)) {
            let cursor = pos;
            while (cursor < line.length && OPERATOR_CHARS.includes(line[cursor])) cursor++;
            push('operator', pos, cursor);
            pos = cursor;
            continue;
        }

        if (PUNCTUATION_CHARS.includes(char)) {
            push('punctuation', pos, pos + 1);
            pos++;
            continue;
        }

        push('text', pos, pos + 1);
        pos++;
    }

    return { tokens, state: next };
};

/** Convenience for tokenizing a whole document. */
export const tokenizeLines = (spec: LanguageSpec, lines: readonly string[]): Token[][] => {
    let state = initialState();

    return lines.map((line) => {
        const result = tokenizeLine(spec, line, state);
        state = result.state;

        return result.tokens;
    });
};
