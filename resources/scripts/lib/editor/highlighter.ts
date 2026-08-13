import { TextDocument } from './document';
import { LanguageSpec, Token, TokenizerState, initialState, statesEqual, tokenizeLine } from './tokenizer';

/**
 * Caches tokens per line and re-tokenizes only what actually changed.
 *
 * Naively re-running the tokenizer over the whole file on every keystroke is
 * fine at 200 lines and awful at 20,000. The trick is that a line's tokens
 * depend only on the state the previous line ended in, so after an edit we walk
 * forward until that state matches what we already had cached - which is
 * usually the very next line - and stop.
 *
 * Typing inside a comment is the case that justifies this: opening a block
 * comment invalidates everything below it, closing one re-validates it, and
 * anything else settles immediately.
 */
export class Highlighter {
    /** State each line *starts* in. Always has lineCount + 1 entries. */
    private startStates: TokenizerState[] = [initialState()];
    private tokens: Token[][] = [];

    constructor(private spec: LanguageSpec) {}

    /** Swap language; everything has to be recomputed. */
    setLanguage(spec: LanguageSpec): void {
        this.spec = spec;
        this.invalidateAll();
    }

    invalidateAll(): void {
        this.startStates = [initialState()];
        this.tokens = [];
    }

    getTokens(line: number): Token[] {
        return this.tokens[line] ?? [];
    }

    /**
     * Bring the cache up to date after an edit starting at `fromLine`.
     * Returns the last line that had to be re-tokenized, which the view can use
     * to decide what needs repainting.
     */
    update(document: TextDocument, fromLine = 0): number {
        const lineCount = document.lineCount;

        // Trim anything past the end of the document, and make sure the arrays
        // are long enough for what is there now.
        this.tokens.length = lineCount;
        this.startStates.length = Math.min(this.startStates.length, lineCount + 1);

        let index = Math.max(0, Math.min(fromLine, lineCount - 1));
        let state = this.startStates[index] ?? initialState();

        // Guarantee a start state exists for where we begin.
        this.startStates[index] = state;

        let last = index;

        while (index < lineCount) {
            const result = tokenizeLine(this.spec, document.getLine(index), state);

            this.tokens[index] = result.tokens;
            last = index;

            const previousNext = this.startStates[index + 1];
            state = result.state;
            this.startStates[index + 1] = state;

            // Past the edit, if the state entering the next line is unchanged
            // then every line below already has correct tokens.
            if (index > fromLine && previousNext !== undefined && statesEqual(previousNext, state)) {
                break;
            }

            index++;
        }

        return last;
    }

    /** Number of lines currently cached, for tests and diagnostics. */
    get cachedLines(): number {
        return this.tokens.filter(Boolean).length;
    }
}

export default Highlighter;
