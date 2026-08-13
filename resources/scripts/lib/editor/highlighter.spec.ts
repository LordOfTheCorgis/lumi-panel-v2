import { TextDocument, position } from './document';
import { Highlighter } from './highlighter';
import { LanguageSpec, tokenizeLines } from './tokenizer';

const js: LanguageSpec = {
    id: 'javascript',
    name: 'JavaScript',
    extensions: ['js'],
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    quotes: ['"', "'"],
    escapes: true,
    keywords: ['const', 'function'],
};

/** The cache must always agree with tokenizing the whole document from scratch. */
const expectMatchesFullPass = (highlighter: Highlighter, doc: TextDocument) => {
    const expected = tokenizeLines(js, doc.getLines());

    for (let line = 0; line < doc.lineCount; line++) {
        expect(highlighter.getTokens(line)).toEqual(expected[line]);
    }
};

describe('lib/editor/highlighter.ts', () => {
    it('tokenizes every line on a first pass', () => {
        const doc = new TextDocument('const a = 1\nconst b = 2\nconst c = 3');
        const highlighter = new Highlighter(js);

        highlighter.update(doc);

        expectMatchesFullPass(highlighter, doc);
    });

    it('stops early when an edit does not change the trailing state', () => {
        const doc = new TextDocument(Array.from({ length: 50 }, (_, i) => `const a${i} = ${i}`).join('\n'));
        const highlighter = new Highlighter(js);
        highlighter.update(doc);

        doc.replaceRange({ from: position(10, 0), to: position(10, 0) }, 'x');
        const last = highlighter.update(doc, 10);

        // Editing an ordinary line must not force a walk to the bottom of the
        // file - that is the entire point of the cache.
        expect(last).toBeLessThan(15);
        expectMatchesFullPass(highlighter, doc);
    });

    it('re-tokenizes everything below when a block comment opens', () => {
        const doc = new TextDocument('a\nb\nc\nd\ne');
        const highlighter = new Highlighter(js);
        highlighter.update(doc);

        doc.replaceRange({ from: position(0, 0), to: position(0, 1) }, '/* open');
        highlighter.update(doc, 0);

        // Every following line is now inside the comment.
        for (let line = 1; line < doc.lineCount; line++) {
            expect(highlighter.getTokens(line).every((t) => t.type === 'comment')).toBe(true);
        }

        expectMatchesFullPass(highlighter, doc);
    });

    it('re-validates the lines below when a block comment is closed again', () => {
        const doc = new TextDocument('/* open\nb\nc\nd');
        const highlighter = new Highlighter(js);
        highlighter.update(doc);

        expect(highlighter.getTokens(2).every((t) => t.type === 'comment')).toBe(true);

        doc.replaceRange({ from: position(0, 0), to: position(0, 7) }, 'const x');
        highlighter.update(doc, 0);

        expect(highlighter.getTokens(2).some((t) => t.type === 'comment')).toBe(false);
        expectMatchesFullPass(highlighter, doc);
    });

    it('handles lines being added', () => {
        const doc = new TextDocument('a\nb');
        const highlighter = new Highlighter(js);
        highlighter.update(doc);

        doc.replaceRange({ from: position(1, 1), to: position(1, 1) }, '\nconst c = 3\nd');
        highlighter.update(doc, 1);

        expect(doc.lineCount).toBe(4);
        expectMatchesFullPass(highlighter, doc);
    });

    it('handles lines being removed without leaving stale tokens behind', () => {
        const doc = new TextDocument('a\nb\nc\nd\ne');
        const highlighter = new Highlighter(js);
        highlighter.update(doc);

        doc.replaceRange({ from: position(1, 0), to: position(4, 0) }, '');
        highlighter.update(doc, 1);

        expect(doc.lineCount).toBe(2);
        expect(highlighter.getTokens(4)).toEqual([]);
        expectMatchesFullPass(highlighter, doc);
    });

    it('recomputes from scratch when the language changes', () => {
        const doc = new TextDocument('# not a comment in js');
        const highlighter = new Highlighter(js);
        highlighter.update(doc);

        expect(highlighter.getTokens(0).some((t) => t.type === 'comment')).toBe(false);

        highlighter.setLanguage({ ...js, id: 'python', lineComment: ['#'], blockComment: undefined });
        highlighter.update(doc);

        expect(highlighter.getTokens(0)[0].type).toBe('comment');
    });

    it('copes with an empty document', () => {
        const doc = new TextDocument('');
        const highlighter = new Highlighter(js);

        expect(() => highlighter.update(doc)).not.toThrow();
        expect(highlighter.getTokens(0)).toEqual([]);
    });
});
