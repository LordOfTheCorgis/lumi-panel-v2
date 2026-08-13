import { Position, Range, TextDocument, comparePositions, position } from './document';

export interface SearchOptions {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    regex?: boolean;
}

/** Escapes a literal so it can be dropped into a RegExp unchanged. */
const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds the matcher. Returns null for a query that cannot compile, which
 * happens constantly while someone types a regex and must not throw.
 */
export const compile = (query: string, options: SearchOptions = {}): RegExp | null => {
    if (!query) return null;

    let source = options.regex ? query : escape(query);

    if (options.wholeWord) {
        source = `\\b(?:${source})\\b`;
    }

    try {
        return new RegExp(source, options.caseSensitive ? 'g' : 'gi');
    } catch {
        return null;
    }
};

/**
 * Every match in the document, in order.
 *
 * Search runs per line, so a pattern cannot span a line break. That is a real
 * limitation and a deliberate one: multi-line matching means materialising the
 * whole document as a single string on every keystroke, and nobody searching a
 * server config needs it.
 */
export const findAll = (document: TextDocument, query: string, options: SearchOptions = {}): Range[] => {
    const pattern = compile(query, options);

    if (!pattern) return [];

    const results: Range[] = [];
    const lines = document.getLines();

    for (let line = 0; line < lines.length; line++) {
        pattern.lastIndex = 0;

        let match = pattern.exec(lines[line]);
        while (match !== null) {
            // A pattern able to match nothing (say "a*") would spin forever
            // without this.
            if (match[0].length === 0) {
                pattern.lastIndex++;
            } else {
                results.push({
                    from: position(line, match.index),
                    to: position(line, match.index + match[0].length),
                });
            }

            match = pattern.exec(lines[line]);
        }
    }

    return results;
};

/** Index of the first match at or after `from`, wrapping to the top. */
export const nextIndex = (matches: Range[], from: Position, backwards = false): number => {
    if (matches.length === 0) return -1;

    if (backwards) {
        for (let i = matches.length - 1; i >= 0; i--) {
            if (comparePositions(matches[i].from, from) < 0) return i;
        }

        return matches.length - 1;
    }

    for (let i = 0; i < matches.length; i++) {
        if (comparePositions(matches[i].from, from) >= 0) return i;
    }

    return 0;
};

/**
 * Expands $1, $2 and $& in a replacement when searching by regex, so capture
 * groups behave the way people expect from every other find/replace.
 */
export const expandReplacement = (
    replacement: string,
    matchText: string,
    query: string,
    options: SearchOptions
): string => {
    if (!options.regex) return replacement;

    const pattern = compile(query, { ...options, regex: true });
    if (!pattern) return replacement;

    pattern.lastIndex = 0;
    const match = pattern.exec(matchText);
    if (!match) return replacement;

    return replacement.replace(/\$(\d|&)/g, (_, token) => (token === '&' ? match[0] : match[Number(token)] ?? ''));
};
