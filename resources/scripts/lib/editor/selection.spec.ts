import { TextDocument, position } from './document';
import { applyMovement, collapsed, isEmpty, lineAt, move, selectAll, toRange, wordAt } from './selection';

describe('lib/editor/selection.ts', () => {
    const doc = new TextDocument('const foo = 1;\n  indented line\nlast');

    describe('character movement', () => {
        it('moves left and right within a line', () => {
            expect(move(doc, position(0, 5), 'left')).toEqual(position(0, 4));
            expect(move(doc, position(0, 5), 'right')).toEqual(position(0, 6));
        });

        it('wraps to the end of the previous line going left from column zero', () => {
            expect(move(doc, position(1, 0), 'left')).toEqual(position(0, 14));
        });

        it('wraps to the start of the next line going right from end of line', () => {
            expect(move(doc, position(0, 14), 'right')).toEqual(position(1, 0));
        });

        it('stops at the start of the document', () => {
            expect(move(doc, position(0, 0), 'left')).toEqual(position(0, 0));
        });

        it('stops at the end of the document', () => {
            const end = doc.end();

            expect(move(doc, end, 'right')).toEqual(end);
        });
    });

    describe('vertical movement', () => {
        it('keeps the column when the target line is long enough', () => {
            expect(move(doc, position(0, 5), 'down')).toEqual(position(1, 5));
        });

        it('clamps to the end of a shorter line', () => {
            expect(move(doc, position(1, 15), 'down')).toEqual(position(2, 4));
        });

        it('goes to the very start when moving up from the first line', () => {
            expect(move(doc, position(0, 7), 'up')).toEqual(position(0, 0));
        });

        it('goes to the very end when moving down from the last line', () => {
            expect(move(doc, position(2, 1), 'down')).toEqual(doc.end());
        });
    });

    describe('word movement', () => {
        it('jumps to the start of the previous word', () => {
            expect(move(doc, position(0, 9), 'left', 'word')).toEqual(position(0, 6));
        });

        it('skips whitespace on the way', () => {
            // From just after "foo " - should land at the start of "foo".
            expect(move(doc, position(0, 10), 'left', 'word')).toEqual(position(0, 6));
        });

        it('jumps to the end of the next word', () => {
            expect(move(doc, position(0, 0), 'right', 'word')).toEqual(position(0, 5));
        });
    });

    describe('line movement', () => {
        it('goes to the first non-whitespace character first', () => {
            expect(move(doc, position(1, 8), 'left', 'line')).toEqual(position(1, 2));
        });

        it('goes to column zero when already at the indent', () => {
            expect(move(doc, position(1, 2), 'left', 'line')).toEqual(position(1, 0));
        });

        it('goes to end of line moving right', () => {
            expect(move(doc, position(1, 0), 'right', 'line')).toEqual(position(1, 15));
        });
    });

    describe('applyMovement', () => {
        it('collapses the caret without shift', () => {
            const selection = { anchor: position(0, 0), head: position(0, 5) };
            const result = applyMovement(doc, selection, 'right', 'character', false);

            expect(isEmpty(result)).toBe(true);
        });

        it('collapses to the near edge when moving left out of a selection', () => {
            const selection = { anchor: position(0, 2), head: position(0, 8) };
            const result = applyMovement(doc, selection, 'left', 'character', false);

            expect(result.head).toEqual(position(0, 2));
        });

        it('extends from the anchor with shift', () => {
            const selection = collapsed(position(0, 5));
            const result = applyMovement(doc, selection, 'right', 'character', true);

            expect(result.anchor).toEqual(position(0, 5));
            expect(result.head).toEqual(position(0, 6));
        });

        it('shrinks back over the anchor when reversing direction', () => {
            let selection = collapsed(position(0, 5));
            selection = applyMovement(doc, selection, 'right', 'character', true);
            selection = applyMovement(doc, selection, 'left', 'character', true);

            expect(isEmpty(selection)).toBe(true);
        });
    });

    describe('toRange', () => {
        it('orders a forwards selection', () => {
            const range = toRange({ anchor: position(0, 1), head: position(0, 4) });

            expect(range.from).toEqual(position(0, 1));
        });

        it('orders a backwards selection', () => {
            const range = toRange({ anchor: position(1, 4), head: position(0, 1) });

            expect(range.from).toEqual(position(0, 1));
            expect(range.to).toEqual(position(1, 4));
        });
    });

    describe('click selections', () => {
        it('selects the word under the caret', () => {
            const selection = wordAt(doc, position(0, 7));

            expect(doc.getRange(toRange(selection))).toBe('foo');
        });

        it('selects nothing when the caret is not on a word', () => {
            expect(isEmpty(wordAt(doc, position(0, 5)))).toBe(true);
        });

        it('selects the whole line including its break', () => {
            const selection = lineAt(doc, position(0, 3));

            expect(doc.getRange(toRange(selection))).toBe('const foo = 1;\n');
        });

        it('selects the last line without a trailing break', () => {
            const selection = lineAt(doc, position(2, 1));

            expect(doc.getRange(toRange(selection))).toBe('last');
        });
    });

    it('selects the entire document', () => {
        expect(doc.getRange(toRange(selectAll(doc)))).toBe(doc.getText());
    });
});
