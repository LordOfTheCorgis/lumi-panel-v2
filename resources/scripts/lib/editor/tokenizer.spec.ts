import { LanguageSpec, initialState, tokenizeLine, tokenizeLines } from './tokenizer';

const js: LanguageSpec = {
    id: 'javascript',
    name: 'JavaScript',
    extensions: ['js'],
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    quotes: ['"', "'", '`'],
    escapes: true,
    keywords: ['const', 'function', 'return', 'if'],
    types: ['number', 'string'],
    constants: ['true', 'false', 'null'],
};

const python: LanguageSpec = {
    id: 'python',
    name: 'Python',
    extensions: ['py'],
    lineComment: ['#'],
    quotes: ['"', "'"],
    multilineQuotes: ['"""', "'''"],
    escapes: true,
    keywords: ['def', 'return'],
};

// Reads a token back as the text it covers, so assertions describe intent
// rather than column arithmetic.
const textOf = (line: string, token: { from: number; to: number }) => line.slice(token.from, token.to);

const typesIn = (spec: LanguageSpec, line: string) => tokenizeLine(spec, line).tokens.map((t) => t.type);

describe('lib/editor/tokenizer.ts', () => {
    describe('comments', () => {
        it('runs a line comment to the end of the line', () => {
            const line = 'const a = 1; // trailing note';
            const tokens = tokenizeLine(js, line).tokens;
            const comment = tokens[tokens.length - 1];

            expect(comment.type).toBe('comment');
            expect(textOf(line, comment)).toBe('// trailing note');
        });

        it('closes a block comment on the same line', () => {
            const line = 'a /* hidden */ b';
            const { tokens, state } = tokenizeLine(js, line);

            expect(tokens.map((t) => textOf(line, t))).toContain('/* hidden */');
            expect(state.inBlockComment).toBe(false);
        });

        it('prefers a block comment opener over a line comment that prefixes it', () => {
            // Lua: "--" is the line comment and "--[[" opens a block. Checking
            // line comments first made "--[[" eat the rest of the line and the
            // block never opened.
            const lua: LanguageSpec = {
                id: 'lua',
                name: 'Lua',
                extensions: ['lua'],
                lineComment: ['--'],
                blockComment: ['--[[', ']]'],
            };

            const { state } = tokenizeLine(lua, '--[[ block opens here');

            expect(state.inBlockComment).toBe(true);
        });

        it('carries an unterminated block comment to the next line', () => {
            const first = tokenizeLine(js, 'a /* start');

            expect(first.state.inBlockComment).toBe(true);

            const second = tokenizeLine(js, 'still inside', first.state);

            expect(second.tokens).toHaveLength(1);
            expect(second.tokens[0].type).toBe('comment');
            expect(second.state.inBlockComment).toBe(true);

            const third = tokenizeLine(js, 'done */ after', second.state);

            expect(third.state.inBlockComment).toBe(false);
            expect(third.tokens[0].type).toBe('comment');
        });
    });

    describe('strings', () => {
        it('tokenizes a simple string', () => {
            const line = 'const a = "hello";';
            const token = tokenizeLine(js, line).tokens.find((t) => t.type === 'string')!;

            expect(textOf(line, token)).toBe('"hello"');
        });

        it('does not end a string on an escaped quote', () => {
            const line = 'x = "he said \\"hi\\" loudly";';
            const token = tokenizeLine(js, line).tokens.find((t) => t.type === 'string')!;

            expect(textOf(line, token)).toBe('"he said \\"hi\\" loudly"');
        });

        it('stops an unterminated string at end of line rather than bleeding on', () => {
            const line = 'x = "never closed';
            const { tokens, state } = tokenizeLine(js, line);
            const token = tokens.find((t) => t.type === 'string')!;

            expect(textOf(line, token)).toBe('"never closed');
            expect(state.inMultilineString).toBeNull();
        });

        it('carries a triple-quoted string across lines', () => {
            const first = tokenizeLine(python, 'doc = """opening');

            expect(first.state.inMultilineString).toBe('"""');

            const second = tokenizeLine(python, 'middle', first.state);

            expect(second.tokens[0].type).toBe('string');

            const third = tokenizeLine(python, 'end""" after', second.state);

            expect(third.state.inMultilineString).toBeNull();
            expect(third.tokens[0].type).toBe('string');
        });

        it('prefers the triple quote over the single quote', () => {
            const { state } = tokenizeLine(python, 'x = """not a short string');

            expect(state.inMultilineString).toBe('"""');
        });
    });

    describe('words', () => {
        it('separates keywords, types, constants and plain identifiers', () => {
            const line = 'const total: number = true; banana';
            const tokens = tokenizeLine(js, line).tokens;
            const byText = Object.fromEntries(tokens.map((t) => [textOf(line, t), t.type]));

            expect(byText.const).toBe('keyword');
            expect(byText.number).toBe('type');
            expect(byText.true).toBe('constant');
            expect(byText.banana).toBe('variable');
        });

        it('respects case sensitivity by default', () => {
            expect(typesIn(js, 'CONST')).toEqual(['variable']);
        });

        it('matches case-insensitively when the language asks for it', () => {
            const sql: LanguageSpec = {
                id: 'sql',
                name: 'SQL',
                extensions: ['sql'],
                keywords: ['select', 'from'],
                caseInsensitive: true,
            };

            expect(typesIn(sql, 'SELECT')).toEqual(['keyword']);
            expect(typesIn(sql, 'SeLeCt')).toEqual(['keyword']);
        });

        it('does not treat a keyword prefix inside a longer word as a keyword', () => {
            const line = 'constant';
            const tokens = tokenizeLine(js, line).tokens;

            expect(tokens).toHaveLength(1);
            expect(tokens[0].type).toBe('variable');
            expect(textOf(line, tokens[0])).toBe('constant');
        });
    });

    describe('numbers', () => {
        it.each([
            ['42', '42'],
            ['3.14', '3.14'],
            ['0xFF', '0xFF'],
            ['1e10', '1e10'],
            ['1_000', '1_000'],
        ])('tokenizes %s', (line, expected) => {
            const token = tokenizeLine(js, line).tokens.find((t) => t.type === 'number')!;

            expect(textOf(line, token)).toBe(expected);
        });

        it('does not treat a leading digit inside an identifier position as a number', () => {
            // "a1" is one identifier; the 1 must not split out as a number.
            const line = 'a1';
            const tokens = tokenizeLine(js, line).tokens;

            expect(tokens).toHaveLength(1);
            expect(tokens[0].type).toBe('variable');
        });
    });

    it('never produces overlapping or out of order tokens', () => {
        const line = 'const x = "a" /* c */ + 42; // done';
        const tokens = tokenizeLine(js, line).tokens;

        for (let i = 0; i < tokens.length; i++) {
            expect(tokens[i].to).toBeGreaterThan(tokens[i].from);
            expect(tokens[i].to).toBeLessThanOrEqual(line.length);

            if (i > 0) {
                expect(tokens[i].from).toBeGreaterThanOrEqual(tokens[i - 1].to);
            }
        }
    });

    it('skips whitespace without emitting tokens for it', () => {
        expect(tokenizeLine(js, '    ').tokens).toHaveLength(0);
    });

    it('handles an empty line', () => {
        const { tokens, state } = tokenizeLine(js, '', initialState());

        expect(tokens).toHaveLength(0);
        expect(state.inBlockComment).toBe(false);
    });

    it('threads state through a whole document', () => {
        const lines = ['a = 1', '/* start', 'inside', 'end */', 'b = 2'];
        const result = tokenizeLines(js, lines);

        expect(result[2].every((t) => t.type === 'comment')).toBe(true);
        expect(result[4].some((t) => t.type === 'number')).toBe(true);
    });
});
