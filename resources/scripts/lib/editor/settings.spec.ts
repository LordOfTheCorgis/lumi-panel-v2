import { FONT_SIZE_RANGE, defaultSettings, parseSettings } from './settings';

describe('lib/editor/settings.ts', () => {
    it('returns the defaults when nothing is stored', () => {
        expect(parseSettings(null)).toEqual(defaultSettings);
    });

    it('returns the defaults for unparseable json', () => {
        expect(parseSettings('{not json')).toEqual(defaultSettings);
    });

    it('returns the defaults when the stored value is not an object', () => {
        expect(parseSettings('"a string"')).toEqual(defaultSettings);
        expect(parseSettings('null')).toEqual(defaultSettings);
    });

    it('keeps stored values that are valid', () => {
        const settings = parseSettings(JSON.stringify({ fontSize: 16, tabSize: 2, wordWrap: true }));

        expect(settings.fontSize).toBe(16);
        expect(settings.tabSize).toBe(2);
        expect(settings.wordWrap).toBe(true);
    });

    it('fills in anything missing from the defaults', () => {
        expect(parseSettings(JSON.stringify({ fontSize: 16 })).tabSize).toBe(defaultSettings.tabSize);
    });

    describe('hostile values', () => {
        // localStorage is user-writable. A font size of zero renders an editor
        // nobody can read or fix, so these are clamped rather than trusted.
        it('clamps a font size below the minimum', () => {
            expect(parseSettings(JSON.stringify({ fontSize: 0 })).fontSize).toBe(FONT_SIZE_RANGE.min);
        });

        it('clamps a font size above the maximum', () => {
            expect(parseSettings(JSON.stringify({ fontSize: 9999 })).fontSize).toBe(FONT_SIZE_RANGE.max);
        });

        it('rejects a non-numeric font size', () => {
            expect(parseSettings(JSON.stringify({ fontSize: 'huge' })).fontSize).toBe(defaultSettings.fontSize);
            expect(parseSettings(JSON.stringify({ fontSize: NaN })).fontSize).toBe(defaultSettings.fontSize);
        });

        it('rejects a tab size that is not one of the offered options', () => {
            expect(parseSettings(JSON.stringify({ tabSize: 3 })).tabSize).toBe(defaultSettings.tabSize);
        });

        it('rejects non-boolean toggles', () => {
            expect(parseSettings(JSON.stringify({ wordWrap: 'yes' })).wordWrap).toBe(defaultSettings.wordWrap);
        });
    });
});
