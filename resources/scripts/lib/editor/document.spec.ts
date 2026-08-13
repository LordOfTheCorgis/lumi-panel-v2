import { TextDocument, position, comparePositions, normalizeRange } from './document';

describe('lib/editor/document.ts', () => {
    describe('construction', () => {
        it('splits on every line ending style', () => {
            expect(new TextDocument('a\nb\r\nc\rd').getLines()).toEqual(['a', 'b', 'c', 'd']);
        });

        it('normalises everything back out as \\n', () => {
            expect(new TextDocument('a\r\nb').getText()).toBe('a\nb');
        });

        it('treats an empty string as one empty line', () => {
            const doc = new TextDocument('');

            expect(doc.lineCount).toBe(1);
            expect(doc.getText()).toBe('');
        });

        it('keeps a trailing newline as a trailing empty line', () => {
            expect(new TextDocument('a\n').getLines()).toEqual(['a', '']);
        });
    });

    describe('offsets', () => {
        const doc = new TextDocument('abc\ndefg\nhi');

        it('converts a position to an offset', () => {
            expect(doc.offsetAt(position(0, 0))).toBe(0);
            expect(doc.offsetAt(position(0, 3))).toBe(3);
            expect(doc.offsetAt(position(1, 0))).toBe(4);
            expect(doc.offsetAt(position(2, 2))).toBe(11);
        });

        it('round-trips through positionAt', () => {
            for (let offset = 0; offset <= doc.getText().length; offset++) {
                expect(doc.offsetAt(doc.positionAt(offset))).toBe(offset);
            }
        });

        it('clamps out of range positions instead of throwing', () => {
            expect(doc.clamp(position(-5, -5))).toEqual(position(0, 0));
            expect(doc.clamp(position(99, 0))).toEqual(position(2, 2));
            expect(doc.clamp(position(0, 99))).toEqual(position(0, 3));
        });
    });

    describe('getRange', () => {
        const doc = new TextDocument('abc\ndefg\nhi');

        it('reads within a single line', () => {
            expect(doc.getRange({ from: position(0, 1), to: position(0, 3) })).toBe('bc');
        });

        it('reads across lines', () => {
            expect(doc.getRange({ from: position(0, 2), to: position(2, 1) })).toBe('c\ndefg\nh');
        });

        it('does not care which way round the range is given', () => {
            expect(doc.getRange({ from: position(0, 3), to: position(0, 1) })).toBe('bc');
        });
    });

    describe('replaceRange', () => {
        it('inserts inside a line', () => {
            const doc = new TextDocument('hello world');
            doc.replaceRange({ from: position(0, 5), to: position(0, 5) }, ' there');

            expect(doc.getText()).toBe('hello there world');
        });

        it('reports where the cursor lands after a single line insert', () => {
            const doc = new TextDocument('ab');
            const change = doc.replaceRange({ from: position(0, 1), to: position(0, 1) }, 'XYZ');

            expect(change.after).toEqual(position(0, 4));
        });

        it('splits a line when inserting a newline', () => {
            const doc = new TextDocument('abcd');
            const change = doc.replaceRange({ from: position(0, 2), to: position(0, 2) }, '\n');

            expect(doc.getLines()).toEqual(['ab', 'cd']);
            expect(change.after).toEqual(position(1, 0));
        });

        it('joins lines when deleting across them', () => {
            const doc = new TextDocument('abc\ndef');
            doc.replaceRange({ from: position(0, 2), to: position(1, 1) }, '');

            expect(doc.getText()).toBe('abef');
        });

        it('replaces a multi-line selection with multi-line text', () => {
            const doc = new TextDocument('one\ntwo\nthree');
            const change = doc.replaceRange({ from: position(0, 1), to: position(2, 2) }, 'X\nY\nZ');

            expect(doc.getText()).toBe('oX\nY\nZree');
            expect(change.removed).toBe('ne\ntwo\nth');
            expect(change.after).toEqual(position(2, 1));
        });

        it('normalises line endings in inserted text', () => {
            const doc = new TextDocument('');
            doc.replaceRange({ from: position(0, 0), to: position(0, 0) }, 'a\r\nb');

            expect(doc.getLines()).toEqual(['a', 'b']);
        });
    });

    describe('revert', () => {
        // The property that actually matters: any edit, undone, must leave the
        // document byte-for-byte as it was. Undo eating a character is the kind
        // of bug that loses somebody's config.
        const cases: [string, string, [number, number], [number, number]][] = [
            ['insert in line', 'hello world', [0, 5], [0, 5]],
            ['delete in line', 'hello world', [0, 0], [0, 5]],
            ['delete across lines', 'one\ntwo\nthree', [0, 1], [2, 3]],
            ['replace everything', 'a\nb\nc', [0, 0], [2, 1]],
            ['at the very end', 'abc', [0, 3], [0, 3]],
        ];

        it.each(cases)('restores the original after %s', (_name, text, from, to) => {
            const doc = new TextDocument(text);
            const original = doc.getText();

            const change = doc.replaceRange(
                { from: position(from[0], from[1]), to: position(to[0], to[1]) },
                'REPLACEMENT\nTEXT'
            );

            expect(doc.getText()).not.toBe(original);

            doc.revert(change);

            expect(doc.getText()).toBe(original);
        });

        it('restores after an insert that only adds newlines', () => {
            const doc = new TextDocument('ab');
            const original = doc.getText();
            const change = doc.replaceRange({ from: position(0, 1), to: position(0, 1) }, '\n\n\n');

            doc.revert(change);

            expect(doc.getText()).toBe(original);
        });
    });

    describe('helpers', () => {
        it('orders positions by line then column', () => {
            expect(comparePositions(position(0, 5), position(1, 0))).toBeLessThan(0);
            expect(comparePositions(position(2, 1), position(2, 0))).toBeGreaterThan(0);
            expect(comparePositions(position(1, 1), position(1, 1))).toBe(0);
        });

        it('flips a backwards range', () => {
            const range = normalizeRange({ from: position(3, 0), to: position(1, 0) });

            expect(range.from).toEqual(position(1, 0));
            expect(range.to).toEqual(position(3, 0));
        });
    });

    it('clones without sharing the underlying lines', () => {
        const doc = new TextDocument('a\nb');
        const copy = doc.clone();

        copy.replaceRange({ from: position(0, 0), to: position(0, 1) }, 'CHANGED');

        expect(doc.getText()).toBe('a\nb');
        expect(copy.getText()).toBe('CHANGED\nb');
    });
});
