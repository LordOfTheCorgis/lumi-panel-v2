import { Change, Position, TextDocument, positionsEqual } from './document';

/**
 * Undo stack.
 *
 * Changes are grouped so that typing a word is one undo rather than six. Two
 * changes coalesce when they are both plain insertions, they happen at the
 * point the previous one ended, and they land within a short window of each
 * other. Anything else - a deletion, a jump elsewhere, a pause - starts a new
 * group. This is roughly what every editor does, and it is the difference
 * between undo feeling instant and feeling broken.
 */

interface Entry {
    changes: Change[];
    /** Selection to restore when this entry is undone. */
    before: Position;
    at: number;
}

const COALESCE_WINDOW_MS = 400;

export class History {
    private undoStack: Entry[] = [];
    private redoStack: Entry[] = [];

    constructor(private limit = 500) {}

    get canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    get canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Record a change. `before` is where the cursor sat prior to the edit, so
     * undo can put it back rather than leaving it wherever the text ended up.
     */
    record(change: Change, before: Position, now = Date.now()): void {
        // Any new edit invalidates the redo branch, same as everywhere else.
        this.redoStack = [];

        const previous = this.undoStack[this.undoStack.length - 1];

        if (previous && this.coalesces(previous, change, now)) {
            previous.changes.push(change);
            previous.at = now;

            return;
        }

        this.undoStack.push({ changes: [change], before, at: now });

        if (this.undoStack.length > this.limit) {
            this.undoStack.shift();
        }
    }

    private coalesces(entry: Entry, change: Change, now: number): boolean {
        if (now - entry.at > COALESCE_WINDOW_MS) {
            return false;
        }

        const last = entry.changes[entry.changes.length - 1];

        // Only pure insertions merge. A deletion is a distinct intent, and
        // merging it with typing makes undo jump further than anyone expects.
        if (last.removed.length > 0 || change.removed.length > 0) {
            return false;
        }

        // A newline closes the group on both sides: it neither joins the text
        // before it nor accepts the text after. Otherwise pressing Enter and
        // carrying on typing means one undo wipes the newline and everything
        // that followed, which is never what the user meant.
        if (change.inserted.includes('\n') || last.inserted.includes('\n')) {
            return false;
        }

        return positionsEqual(last.after, change.range.from);
    }

    /**
     * Undo one group. Returns where the selection should go, or null if there
     * was nothing to undo.
     */
    undo(document: TextDocument): Position | null {
        const entry = this.undoStack.pop();

        if (!entry) {
            return null;
        }

        // Reverting in reverse order matters: each change's coordinates are
        // only valid against the document state that produced it.
        const inverted: Change[] = [];
        for (let i = entry.changes.length - 1; i >= 0; i--) {
            inverted.push(document.revert(entry.changes[i]));
        }

        this.redoStack.push({ changes: inverted, before: entry.before, at: entry.at });

        return entry.before;
    }

    redo(document: TextDocument): Position | null {
        const entry = this.redoStack.pop();

        if (!entry) {
            return null;
        }

        const reapplied: Change[] = [];
        for (let i = entry.changes.length - 1; i >= 0; i--) {
            reapplied.push(document.revert(entry.changes[i]));
        }

        this.undoStack.push({ changes: reapplied, before: entry.before, at: entry.at });

        return reapplied[reapplied.length - 1]?.after ?? null;
    }
}
