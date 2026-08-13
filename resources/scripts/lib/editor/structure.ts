import { Position, TextDocument, position } from './document';

/**
 * Structural cues drawn behind the text: indent guides and bracket matching.
 *
 * Both are why a good editor feels navigable and an average one feels like a
 * wall of text, and neither needs a parser - indentation and bracket depth are
 * both readable straight off the characters.
 */

const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

/**
 * Indent depth of a line, in columns, ignoring blank lines.
 *
 * A blank line inherits the depth of whichever neighbour is deeper, so guides
 * run through the gaps in a function instead of shattering into fragments at
 * every empty line.
 */
export const indentWidths = (lines: readonly string[], tabSize: number): number[] => {
    const raw = lines.map((line) => {
        if (line.trim().length === 0) return null;

        let width = 0;
        for (const char of line) {
            if (char === ' ') width++;
            else if (char === '\t') width += tabSize - (width % tabSize);
            else break;
        }

        return width;
    });

    return raw.map((value, index) => {
        if (value !== null) return value;

        let before = 0;
        for (let i = index - 1; i >= 0; i--) {
            if (raw[i] !== null) {
                before = raw[i]!;
                break;
            }
        }

        let after = 0;
        for (let i = index + 1; i < raw.length; i++) {
            if (raw[i] !== null) {
                after = raw[i]!;
                break;
            }
        }

        return Math.min(before, after);
    });
};

/** Guide columns for a line: one every `tabSize` up to its indent. */
export const guideColumns = (width: number, tabSize: number): number[] => {
    const columns: number[] = [];

    for (let column = tabSize; column < width; column += tabSize) {
        columns.push(column);
    }

    return columns;
};

/**
 * The bracket matching the one adjacent to the caret, or null.
 *
 * Checks the character before the caret first and then the one after, which is
 * the order that matches where people expect the highlight when they have just
 * typed a closing bracket.
 */
export const matchBracket = (document: TextDocument, at: Position): { open: Position; close: Position } | null => {
    const line = document.getLine(at.line);

    const before = at.ch > 0 ? line[at.ch - 1] : undefined;
    const after = line[at.ch];

    if (before && CLOSERS[before]) {
        const open = scan(document, position(at.line, at.ch - 1), CLOSERS[before], before, -1);

        return open ? { open, close: position(at.line, at.ch - 1) } : null;
    }

    if (after && PAIRS[after]) {
        const close = scan(document, position(at.line, at.ch), PAIRS[after], after, 1);

        return close ? { open: position(at.line, at.ch), close } : null;
    }

    if (before && PAIRS[before]) {
        const close = scan(document, position(at.line, at.ch - 1), PAIRS[before], before, 1);

        return close ? { open: position(at.line, at.ch - 1), close } : null;
    }

    return null;
};

/** Walks outward counting depth until the partner is found. */
const scan = (
    document: TextDocument,
    from: Position,
    target: string,
    self: string,
    direction: 1 | -1
): Position | null => {
    let depth = 0;
    let line = from.line;
    let ch = from.ch;

    // A bracket 5,000 lines away is not a useful highlight and scanning a whole
    // log file on every caret move is not free.
    const limit = 500;
    let lines = 0;

    while (line >= 0 && line < document.lineCount && lines <= limit) {
        const text = document.getLine(line);

        while (ch >= 0 && ch < text.length) {
            const char = text[ch];

            if (char === self) depth++;
            else if (char === target) {
                depth--;
                if (depth === 0) return position(line, ch);
            }

            ch += direction;
        }

        line += direction;
        lines++;
        ch = direction === 1 ? 0 : Math.max(document.getLine(line)?.length - 1 ?? 0, 0);
    }

    return null;
};
