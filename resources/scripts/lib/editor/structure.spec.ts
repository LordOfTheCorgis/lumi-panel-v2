import { TextDocument, position } from './document';
import { guideColumns, indentWidths, matchBracket } from './structure';

describe('lib/editor/structure.ts', () => {
    describe('indentWidths', () => {
        it('counts leading spaces', () => {
            expect(indentWidths(['a', '  b', '    c'], 4)).toEqual([0, 2, 4]);
        });

        it('expands tabs to the next tab stop', () => {
            expect(indentWidths(['\ta', '\t\tb'], 4)).toEqual([4, 8]);
        });

        it('handles a tab after spaces', () => {
            // Two spaces then a tab lands on column 4, not 6.
            expect(indentWidths(['  \ta'], 4)).toEqual([4]);
        });

        it('carries a blank line through at the shallower neighbour depth', () => {
            // The gap inside the block keeps its guides rather than breaking
            // them, which is the entire reason for not treating blanks as zero.
            expect(indentWidths(['a', '    b', '', '    c'], 4)).toEqual([0, 4, 4, 4]);
        });

        it('does not extend guides past the end of a block', () => {
            expect(indentWidths(['    a', '', 'b'], 4)).toEqual([4, 0, 0]);
        });

        it('treats a whitespace-only line as blank', () => {
            expect(indentWidths(['    a', '   ', '    b'], 4)).toEqual([4, 4, 4]);
        });
    });

    describe('guideColumns', () => {
        it('places a guide at every tab stop before the indent', () => {
            expect(guideColumns(12, 4)).toEqual([4, 8]);
        });

        it('draws nothing at zero indent', () => {
            expect(guideColumns(0, 4)).toEqual([]);
        });

        it('does not draw a guide on the text itself', () => {
            // At indent 4 the text starts at column 4, so only column 0 is a
            // boundary and column 0 is never drawn.
            expect(guideColumns(4, 4)).toEqual([]);
        });
    });

    describe('matchBracket', () => {
        it('matches forward from an opening bracket after the caret', () => {
            const doc = new TextDocument('foo(bar)');
            const match = matchBracket(doc, position(0, 3));

            expect(match).toEqual({ open: position(0, 3), close: position(0, 7) });
        });

        it('matches backward from a closing bracket before the caret', () => {
            const doc = new TextDocument('foo(bar)');
            const match = matchBracket(doc, position(0, 8));

            expect(match).toEqual({ open: position(0, 3), close: position(0, 7) });
        });

        it('respects nesting', () => {
            const doc = new TextDocument('a(b(c)d)e');
            const match = matchBracket(doc, position(0, 1));

            expect(match?.close).toEqual(position(0, 7));
        });

        it('matches across lines', () => {
            const doc = new TextDocument('function x() {\n  body\n}');
            const match = matchBracket(doc, position(0, 13));

            expect(match?.close).toEqual(position(2, 0));
        });

        it('returns null for an unmatched bracket', () => {
            const doc = new TextDocument('foo(bar');

            expect(matchBracket(doc, position(0, 3))).toBeNull();
        });

        it('returns null when the caret is not next to a bracket', () => {
            const doc = new TextDocument('foo(bar)');

            expect(matchBracket(doc, position(0, 1))).toBeNull();
        });

        it('handles square and curly brackets too', () => {
            expect(matchBracket(new TextDocument('[a]'), position(0, 0))?.close).toEqual(position(0, 2));
            expect(matchBracket(new TextDocument('{a}'), position(0, 0))?.close).toEqual(position(0, 2));
        });

        it('does not pair mismatched brackets', () => {
            const doc = new TextDocument('(a]');

            expect(matchBracket(doc, position(0, 0))).toBeNull();
        });
    });
});
