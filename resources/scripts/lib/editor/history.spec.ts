import { TextDocument, position } from './document';
import { History } from './history';

// Small helper so the tests read like the editing session they describe.
const type = (doc: TextDocument, history: History, at: ReturnType<typeof position>, text: string, now: number) => {
    const change = doc.replaceRange({ from: at, to: at }, text);
    history.record(change, at, now);

    return change.after;
};

describe('lib/editor/history.ts', () => {
    it('reports nothing to undo on a fresh stack', () => {
        const history = new History();

        expect(history.canUndo).toBe(false);
        expect(history.undo(new TextDocument('a'))).toBeNull();
    });

    it('undoes a single edit back to the original text', () => {
        const doc = new TextDocument('hello');
        const history = new History();

        type(doc, history, position(0, 5), ' world', 0);
        expect(doc.getText()).toBe('hello world');

        history.undo(doc);
        expect(doc.getText()).toBe('hello');
    });

    it('restores the cursor to where it was before the edit', () => {
        const doc = new TextDocument('hello');
        const history = new History();

        type(doc, history, position(0, 5), '!', 0);

        expect(history.undo(doc)).toEqual(position(0, 5));
    });

    describe('grouping', () => {
        it('treats consecutive typing as one undo', () => {
            const doc = new TextDocument('');
            const history = new History();

            let at = position(0, 0);
            for (const ch of 'hello') {
                at = type(doc, history, at, ch, 10);
            }

            expect(doc.getText()).toBe('hello');

            history.undo(doc);

            expect(doc.getText()).toBe('');
        });

        it('breaks the group after a pause', () => {
            const doc = new TextDocument('');
            const history = new History();

            let at = type(doc, history, position(0, 0), 'abc', 0);
            type(doc, history, at, 'def', 5000);

            history.undo(doc);

            expect(doc.getText()).toBe('abc');
        });

        it('breaks the group when the caret moves elsewhere', () => {
            const doc = new TextDocument('one two');
            const history = new History();

            type(doc, history, position(0, 3), 'X', 0);
            // Typing at an unrelated spot is a separate intent.
            type(doc, history, position(0, 0), 'Y', 10);

            history.undo(doc);

            expect(doc.getText()).toBe('oneX two');
        });

        it('breaks the group on a newline so undo lands on line boundaries', () => {
            const doc = new TextDocument('');
            const history = new History();

            let at = type(doc, history, position(0, 0), 'abc', 0);
            at = type(doc, history, at, '\n', 10);
            type(doc, history, at, 'def', 20);

            history.undo(doc);
            expect(doc.getText()).toBe('abc\n');

            history.undo(doc);
            expect(doc.getText()).toBe('abc');
        });

        it('does not merge a deletion into typing', () => {
            const doc = new TextDocument('abc');
            const history = new History();

            type(doc, history, position(0, 3), 'd', 0);

            const removal = doc.replaceRange({ from: position(0, 0), to: position(0, 1) }, '');
            history.record(removal, position(0, 1), 10);

            expect(doc.getText()).toBe('bcd');

            history.undo(doc);
            expect(doc.getText()).toBe('abcd');
        });
    });

    describe('redo', () => {
        it('reapplies an undone edit', () => {
            const doc = new TextDocument('hello');
            const history = new History();

            type(doc, history, position(0, 5), ' world', 0);
            history.undo(doc);

            expect(doc.getText()).toBe('hello');

            history.redo(doc);

            expect(doc.getText()).toBe('hello world');
        });

        it('survives a full undo/redo round trip over several groups', () => {
            const doc = new TextDocument('start');
            const history = new History();

            type(doc, history, position(0, 5), ' one', 0);
            type(doc, history, position(0, 9), ' two', 5000);
            type(doc, history, position(0, 13), ' three', 10000);

            const final = doc.getText();

            history.undo(doc);
            history.undo(doc);
            history.undo(doc);

            expect(doc.getText()).toBe('start');

            history.redo(doc);
            history.redo(doc);
            history.redo(doc);

            expect(doc.getText()).toBe(final);
        });

        it('drops the redo branch once a new edit happens', () => {
            const doc = new TextDocument('a');
            const history = new History();

            type(doc, history, position(0, 1), 'b', 0);
            history.undo(doc);

            expect(history.canRedo).toBe(true);

            type(doc, history, position(0, 1), 'c', 5000);

            expect(history.canRedo).toBe(false);
        });
    });

    it('discards the oldest entries past the limit', () => {
        const doc = new TextDocument('');
        const history = new History(3);

        // Spaced far enough apart that none of them coalesce.
        for (let i = 0; i < 10; i++) {
            type(doc, history, doc.end(), `${i}`, i * 10_000);
        }

        let undos = 0;
        while (history.undo(doc) !== null) {
            undos++;
        }

        expect(undos).toBe(3);
    });
});
