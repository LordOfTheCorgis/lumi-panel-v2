/**
 * The text buffer.
 *
 * Stored as an array of lines rather than a rope. A rope wins on multi-megabyte
 * files, but this editor exists to edit server configs - the realistic worst
 * case is a large log someone opens by accident, and the file manager already
 * refuses to load anything past a few MB. A line array keeps every operation
 * here obvious, and "obvious" matters more than "asymptotically better" for
 * code that is one bug away from eating somebody's server.properties.
 */

export interface Position {
    /** Zero-indexed. */
    line: number;
    /** Zero-indexed offset within the line, counted in UTF-16 code units. */
    ch: number;
}

export interface Range {
    from: Position;
    to: Position;
}

/** What a single edit did, and enough information to undo it. */
export interface Change {
    range: Range;
    /** Text that was inserted. */
    inserted: string;
    /** Text that used to be there. */
    removed: string;
    /** Where the selection should sit after applying this change. */
    after: Position;
}

export const position = (line: number, ch: number): Position => ({ line, ch });

export const comparePositions = (a: Position, b: Position): number =>
    a.line === b.line ? a.ch - b.ch : a.line - b.line;

export const positionsEqual = (a: Position, b: Position): boolean => a.line === b.line && a.ch === b.ch;

/** Returns the range with `from` guaranteed to be the earlier of the two ends. */
export const normalizeRange = (range: Range): Range =>
    comparePositions(range.from, range.to) <= 0 ? range : { from: range.to, to: range.from };

export class TextDocument {
    private lines: string[];

    constructor(text = '') {
        // Split on any line ending but remember nothing about which was used;
        // getText() always emits \n. Config files that arrive with CRLF get
        // normalised, which is what every editor does and what wings expects.
        this.lines = text.split(/\r\n|\r|\n/);
    }

    get lineCount(): number {
        return this.lines.length;
    }

    getLine(index: number): string {
        return this.lines[index] ?? '';
    }

    getLines(): readonly string[] {
        return this.lines;
    }

    getText(): string {
        return this.lines.join('\n');
    }

    /** Last valid position in the document. */
    end(): Position {
        const line = this.lines.length - 1;

        return position(line, this.getLine(line).length);
    }

    /** Clamps a position onto something that actually exists in the document. */
    clamp(pos: Position): Position {
        if (pos.line < 0) return position(0, 0);
        if (pos.line >= this.lines.length) return this.end();

        return position(pos.line, Math.max(0, Math.min(pos.ch, this.getLine(pos.line).length)));
    }

    /** Character offset from the start of the document. */
    offsetAt(pos: Position): number {
        const clamped = this.clamp(pos);
        let offset = 0;

        for (let i = 0; i < clamped.line; i++) {
            // +1 for the newline that join() will put back.
            offset += this.lines[i].length + 1;
        }

        return offset + clamped.ch;
    }

    positionAt(offset: number): Position {
        let remaining = Math.max(0, offset);

        for (let i = 0; i < this.lines.length; i++) {
            const length = this.lines[i].length;

            if (remaining <= length) {
                return position(i, remaining);
            }

            remaining -= length + 1;
        }

        return this.end();
    }

    getRange(range: Range): string {
        const { from, to } = normalizeRange({ from: this.clamp(range.from), to: this.clamp(range.to) });

        if (from.line === to.line) {
            return this.getLine(from.line).slice(from.ch, to.ch);
        }

        const parts: string[] = [this.getLine(from.line).slice(from.ch)];

        for (let i = from.line + 1; i < to.line; i++) {
            parts.push(this.getLine(i));
        }

        parts.push(this.getLine(to.line).slice(0, to.ch));

        return parts.join('\n');
    }

    /**
     * Replaces a range with text, mutating the document. Returns a Change that
     * describes what happened - the undo stack stores these and inverts them.
     */
    replaceRange(range: Range, text: string): Change {
        const normalized = normalizeRange({ from: this.clamp(range.from), to: this.clamp(range.to) });
        const { from, to } = normalized;

        const removed = this.getRange(normalized);
        const inserted = text.replace(/\r\n|\r/g, '\n');

        const before = this.getLine(from.line).slice(0, from.ch);
        const rest = this.getLine(to.line).slice(to.ch);
        const insertedLines = inserted.split('\n');

        const replacement =
            insertedLines.length === 1
                ? [before + insertedLines[0] + rest]
                : [
                      before + insertedLines[0],
                      ...insertedLines.slice(1, -1),
                      insertedLines[insertedLines.length - 1] + rest,
                  ];

        this.lines.splice(from.line, to.line - from.line + 1, ...replacement);

        const after =
            insertedLines.length === 1
                ? position(from.line, from.ch + insertedLines[0].length)
                : position(from.line + insertedLines.length - 1, insertedLines[insertedLines.length - 1].length);

        return { range: normalized, inserted, removed, after };
    }

    /** Applies the inverse of a change. Used by undo. */
    revert(change: Change): Change {
        const end = this.positionAt(this.offsetAt(change.range.from) + change.inserted.length);

        return this.replaceRange({ from: change.range.from, to: end }, change.removed);
    }

    clone(): TextDocument {
        const doc = new TextDocument();
        doc.lines = [...this.lines];

        return doc;
    }
}
