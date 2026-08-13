import { Position, Range, TextDocument, comparePositions, position, positionsEqual } from './document';

/**
 * Where the caret is and what is selected.
 *
 * `anchor` is the end that stays put when the selection is extended, `head` is
 * the end that moves. Keeping them distinct is what makes shift+arrow behave -
 * collapsing to a normalised range loses which side the user is dragging from.
 */
export interface Selection {
    anchor: Position;
    head: Position;
}

export const collapsed = (at: Position): Selection => ({ anchor: at, head: at });

export const isEmpty = (selection: Selection): boolean => positionsEqual(selection.anchor, selection.head);

/** The selection as an ordered range, for reading or replacing text. */
export const toRange = (selection: Selection): Range =>
    comparePositions(selection.anchor, selection.head) <= 0
        ? { from: selection.anchor, to: selection.head }
        : { from: selection.head, to: selection.anchor };

export type Direction = 'left' | 'right' | 'up' | 'down';
export type Granularity = 'character' | 'word' | 'line';

const WORD = /[\w$]/;

const wordBoundaryLeft = (line: string, ch: number): number => {
    let cursor = ch;

    // Step over any run of spaces first, then the word itself, so
    // ctrl+left from "foo   |" lands before "foo" rather than after it.
    while (cursor > 0 && !WORD.test(line[cursor - 1])) cursor--;
    while (cursor > 0 && WORD.test(line[cursor - 1])) cursor--;

    return cursor;
};

const wordBoundaryRight = (line: string, ch: number): number => {
    let cursor = ch;

    while (cursor < line.length && !WORD.test(line[cursor])) cursor++;
    while (cursor < line.length && WORD.test(line[cursor])) cursor++;

    return cursor;
};

/**
 * Where the caret ends up after a movement. Pure, so it can be tested without
 * a DOM anywhere in sight.
 */
export const move = (
    document: TextDocument,
    from: Position,
    direction: Direction,
    granularity: Granularity = 'character'
): Position => {
    const line = document.getLine(from.line);

    if (granularity === 'line') {
        return direction === 'left'
            ? position(from.line, indentEnd(line) < from.ch ? indentEnd(line) : 0)
            : position(from.line, line.length);
    }

    switch (direction) {
        case 'left': {
            if (granularity === 'word') {
                return from.ch > 0
                    ? position(from.line, wordBoundaryLeft(line, from.ch))
                    : from.line > 0
                    ? position(from.line - 1, document.getLine(from.line - 1).length)
                    : from;
            }

            if (from.ch > 0) return position(from.line, from.ch - 1);

            return from.line > 0 ? position(from.line - 1, document.getLine(from.line - 1).length) : from;
        }
        case 'right': {
            if (granularity === 'word') {
                return from.ch < line.length
                    ? position(from.line, wordBoundaryRight(line, from.ch))
                    : from.line < document.lineCount - 1
                    ? position(from.line + 1, 0)
                    : from;
            }

            if (from.ch < line.length) return position(from.line, from.ch + 1);

            return from.line < document.lineCount - 1 ? position(from.line + 1, 0) : from;
        }
        case 'up':
            return from.line === 0 ? position(0, 0) : document.clamp(position(from.line - 1, from.ch));
        case 'down':
            return from.line === document.lineCount - 1
                ? document.end()
                : document.clamp(position(from.line + 1, from.ch));
    }
};

/** Column of the first non-whitespace character, used by Home. */
export const indentEnd = (line: string): number => {
    const match = /^[ \t]*/.exec(line);

    return match ? match[0].length : 0;
};

/** Extends or moves a selection, depending on whether shift is held. */
export const applyMovement = (
    document: TextDocument,
    selection: Selection,
    direction: Direction,
    granularity: Granularity,
    extend: boolean
): Selection => {
    // Without shift, a non-empty selection collapses to the edge you moved
    // toward rather than moving the caret one further.
    if (!extend && !isEmpty(selection) && (direction === 'left' || direction === 'right')) {
        const range = toRange(selection);

        return collapsed(direction === 'left' ? range.from : range.to);
    }

    const head = move(document, selection.head, direction, granularity);

    return extend ? { anchor: selection.anchor, head } : collapsed(head);
};

/** The whole document, for select-all. */
export const selectAll = (document: TextDocument): Selection => ({
    anchor: position(0, 0),
    head: document.end(),
});

/** The word under a position, for double-click. */
export const wordAt = (document: TextDocument, at: Position): Selection => {
    const line = document.getLine(at.line);

    if (!WORD.test(line[at.ch] ?? '')) {
        return collapsed(at);
    }

    let from = at.ch;
    let to = at.ch;

    while (from > 0 && WORD.test(line[from - 1])) from--;
    while (to < line.length && WORD.test(line[to])) to++;

    return { anchor: position(at.line, from), head: position(at.line, to) };
};

/** The whole line under a position, for triple-click. */
export const lineAt = (document: TextDocument, at: Position): Selection => ({
    anchor: position(at.line, 0),
    head:
        at.line < document.lineCount - 1
            ? position(at.line + 1, 0)
            : position(at.line, document.getLine(at.line).length),
});
