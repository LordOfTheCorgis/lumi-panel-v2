import languages, { languageById, languageForFilename, plaintext, searchLanguages, sortedLanguages } from './languages';
import { tokenizeLine } from './tokenizer';

describe('lib/editor/languages.ts', () => {
    describe('registry integrity', () => {
        it('has no duplicate ids', () => {
            const ids = languages.map((l) => l.id);

            expect(new Set(ids).size).toBe(ids.length);
        });

        it('never claims the same extension twice', () => {
            // Two languages owning ".conf" means detection silently depends on
            // registry order, which is a bug waiting to be blamed on something
            // else entirely.
            const seen = new Map<string, string>();
            const clashes: string[] = [];

            for (const language of languages) {
                for (const extension of language.extensions) {
                    const owner = seen.get(extension);

                    if (owner) {
                        clashes.push(`.${extension} claimed by both ${owner} and ${language.id}`);
                    } else {
                        seen.set(extension, language.id);
                    }
                }
            }

            expect(clashes).toEqual([]);
        });

        it('gives every language a name and at least one extension', () => {
            for (const language of languages) {
                expect(language.name.length).toBeGreaterThan(0);
                expect(language.extensions.length).toBeGreaterThan(0);
            }
        });

        it('keeps extensions lowercase and dotless', () => {
            for (const language of languages) {
                for (const extension of language.extensions) {
                    expect(extension).toBe(extension.toLowerCase());
                    expect(extension.startsWith('.')).toBe(false);
                }
            }
        });
    });

    describe('detection', () => {
        it.each([
            ['server.properties', 'properties'],
            ['config.yml', 'yaml'],
            ['bukkit.yaml', 'yaml'],
            ['package.json', 'json'],
            ['resource.lua', 'lua'],
            ['index.ts', 'typescript'],
            ['start.sh', 'shell'],
            ['Dockerfile', 'dockerfile'],
            ['Dockerfile.prod', 'dockerfile'],
            ['latest.log', 'log'],
            ['schema.sql', 'sql'],
            ['README.md', 'markdown'],
            ['Main.java', 'java'],
        ])('detects %s as %s', (filename, expected) => {
            expect(languageForFilename(filename).id).toBe(expected);
        });

        it('ignores directories in the path', () => {
            expect(languageForFilename('/home/container/plugins/config.yml').id).toBe('yaml');
        });

        it('is case insensitive about extensions', () => {
            expect(languageForFilename('SCRIPT.LUA').id).toBe('lua');
        });

        it('handles dotfiles that are all extension', () => {
            expect(languageForFilename('.env').id).toBe('properties');
        });

        it('falls back to plain text for anything unrecognised', () => {
            expect(languageForFilename('mystery.qqq').id).toBe('plaintext');
            expect(languageForFilename('noextension').id).toBe('plaintext');
        });

        it('prefers a filename pattern over an extension', () => {
            // nginx.conf must not be caught by the properties ".conf" claim.
            expect(languageForFilename('nginx.conf').id).toBe('nginx');
        });
    });

    describe('lookup', () => {
        it('returns the requested language', () => {
            expect(languageById('lua').name).toBe('Lua');
        });

        it('falls back to plain text for an unknown id', () => {
            expect(languageById('nonsense')).toBe(plaintext);
        });
    });

    describe('search', () => {
        it('returns everything for an empty query', () => {
            expect(searchLanguages('').length).toBe(languages.length);
        });

        it('matches on name', () => {
            expect(searchLanguages('python').map((l) => l.id)).toContain('python');
        });

        it('matches on extension, which is how people actually look', () => {
            expect(searchLanguages('yml').map((l) => l.id)).toContain('yaml');
        });

        it('returns nothing for a query that matches nothing', () => {
            expect(searchLanguages('zzzzzz')).toEqual([]);
        });

        it('sorts alphabetically', () => {
            const names = sortedLanguages().map((l) => l.name);

            expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
        });
    });

    describe('the specs actually tokenize', () => {
        // Every language in the registry gets run through the tokenizer to
        // catch a malformed spec - a bad identifier regex or a one-element
        // blockComment tuple would otherwise only show up when a user opens
        // that exact file type.
        it.each(languages.map((l) => [l.name, l] as const))('%s produces sane tokens', (_name, language) => {
            const sample = 'name = "value" // 42\nsecond line';

            for (const line of sample.split('\n')) {
                const { tokens } = tokenizeLine(language, line);

                for (const token of tokens) {
                    expect(token.to).toBeGreaterThan(token.from);
                    expect(token.to).toBeLessThanOrEqual(line.length);
                }
            }
        });
    });

    describe('spot checks on real content', () => {
        it('highlights a properties comment', () => {
            const spec = languageForFilename('server.properties');
            const { tokens } = tokenizeLine(spec, '# Minecraft server properties');

            expect(tokens[0].type).toBe('comment');
        });

        it('highlights a lua keyword', () => {
            const spec = languageForFilename('script.lua');
            const line = 'local x = 1';

            expect(tokenizeLine(spec, line).tokens[0].type).toBe('keyword');
        });

        it('treats a lua block comment as a comment', () => {
            const spec = languageForFilename('script.lua');
            const { state } = tokenizeLine(spec, '--[[ opening');

            expect(state.inBlockComment).toBe(true);
        });

        it('highlights yaml booleans as constants', () => {
            const spec = languageForFilename('config.yml');
            const line = 'enabled: true';
            const tokens = tokenizeLine(spec, line);

            expect(tokens.tokens.some((t) => t.type === 'constant')).toBe(true);
        });
    });
});
