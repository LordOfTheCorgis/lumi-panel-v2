import { TextDocument, position } from './document';
import { compile, expandReplacement, findAll, nextIndex } from './search';

describe('lib/editor/search.ts', () => {
    const doc = new TextDocument('the cat sat\non the mat\nTHE END');

    describe('findAll', () => {
        it('finds every occurrence across lines', () => {
            const matches = findAll(doc, 'the');

            // Case insensitive by default, so "THE" on the last line counts.
            expect(matches).toHaveLength(3);
            expect(matches[0].from).toEqual(position(0, 0));
        });

        it('respects case sensitivity', () => {
            expect(findAll(doc, 'the', { caseSensitive: true })).toHaveLength(2);
        });

        it('matches whole words only when asked', () => {
            const text = new TextDocument('cat concatenate cat');

            expect(findAll(text, 'cat')).toHaveLength(3);
            expect(findAll(text, 'cat', { wholeWord: true })).toHaveLength(2);
        });

        it('treats the query literally unless regex is enabled', () => {
            const text = new TextDocument('a.b axb');

            expect(findAll(text, 'a.b')).toHaveLength(1);
            expect(findAll(text, 'a.b', { regex: true })).toHaveLength(2);
        });

        it('returns nothing for an empty query', () => {
            expect(findAll(doc, '')).toEqual([]);
        });

        it('returns nothing rather than throwing on an invalid regex', () => {
            // Half-typed patterns arrive here on every keystroke.
            expect(findAll(doc, '(unclosed', { regex: true })).toEqual([]);
            expect(compile('[', { regex: true })).toBeNull();
        });

        it('does not hang on a pattern that can match nothing', () => {
            const matches = findAll(new TextDocument('aaa'), 'b*', { regex: true });

            expect(matches).toEqual([]);
        });

        it('finds several matches on the same line', () => {
            const matches = findAll(new TextDocument('x x x'), 'x');

            expect(matches.map((m) => m.from.ch)).toEqual([0, 2, 4]);
        });
    });

    describe('nextIndex', () => {
        const matches = findAll(doc, 'the');

        it('finds the first match at or after a position', () => {
            expect(nextIndex(matches, position(0, 0))).toBe(0);
            expect(nextIndex(matches, position(0, 1))).toBe(1);
        });

        it('wraps to the top when past the last match', () => {
            expect(nextIndex(matches, position(99, 0))).toBe(0);
        });

        it('walks backwards to the nearest earlier match', () => {
            // From line 1 col 5, the previous match is the "the" at line 1
            // col 3 - not the one on line 0.
            expect(nextIndex(matches, position(1, 5), true)).toBe(1);
            expect(nextIndex(matches, position(1, 0), true)).toBe(0);
        });

        it('wraps to the bottom going backwards past the first match', () => {
            expect(nextIndex(matches, position(0, 0), true)).toBe(matches.length - 1);
        });

        it('reports nothing when there are no matches', () => {
            expect(nextIndex([], position(0, 0))).toBe(-1);
        });
    });

    describe('expandReplacement', () => {
        it('leaves a literal replacement alone', () => {
            expect(expandReplacement('new', 'old', 'old', {})).toBe('new');
        });

        it('substitutes capture groups', () => {
            expect(expandReplacement('$2-$1', 'ab', '(a)(b)', { regex: true })).toBe('b-a');
        });

        it('substitutes the whole match for $&', () => {
            expect(expandReplacement('[$&]', 'word', '\\w+', { regex: true })).toBe('[word]');
        });

        it('replaces a group that did not participate with nothing', () => {
            expect(expandReplacement('$1$2', 'a', '(a)(b)?', { regex: true })).toBe('a');
        });
    });
});
