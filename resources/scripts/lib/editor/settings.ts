import { useCallback, useEffect, useState } from 'react';

/**
 * Editor preferences, kept per browser rather than per account.
 *
 * Font size and tab width are a property of the machine you are sitting at, not
 * of your account - the same person on a laptop and a 4K monitor wants
 * different answers. Storing this server-side would sync the wrong thing.
 */
export interface EditorSettings {
    fontSize: number;
    tabSize: number;
    lineNumbers: boolean;
    wordWrap: boolean;
    highlightActiveLine: boolean;
}

export const defaultSettings: EditorSettings = {
    fontSize: 13,
    tabSize: 4,
    lineNumbers: true,
    wordWrap: false,
    highlightActiveLine: true,
};

const STORAGE_KEY = 'lumi:editor:settings';

export const FONT_SIZE_RANGE = { min: 10, max: 24 } as const;
export const TAB_SIZE_OPTIONS = [2, 4, 8] as const;

/** Merges stored values over the defaults, dropping anything unrecognised. */
export const parseSettings = (raw: string | null): EditorSettings => {
    if (!raw) return { ...defaultSettings };

    try {
        const parsed = JSON.parse(raw);

        if (typeof parsed !== 'object' || parsed === null) {
            return { ...defaultSettings };
        }

        return {
            // Clamped rather than trusted. Anyone can edit localStorage, and a
            // font size of 0 or 10000 makes the editor unusable with no obvious
            // way back.
            fontSize: clamp(
                numberOr(parsed.fontSize, defaultSettings.fontSize),
                FONT_SIZE_RANGE.min,
                FONT_SIZE_RANGE.max
            ),
            tabSize: (TAB_SIZE_OPTIONS as readonly number[]).includes(parsed.tabSize)
                ? parsed.tabSize
                : defaultSettings.tabSize,
            lineNumbers: boolOr(parsed.lineNumbers, defaultSettings.lineNumbers),
            wordWrap: boolOr(parsed.wordWrap, defaultSettings.wordWrap),
            highlightActiveLine: boolOr(parsed.highlightActiveLine, defaultSettings.highlightActiveLine),
        };
    } catch {
        return { ...defaultSettings };
    }
};

const numberOr = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const boolOr = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, Math.round(value)));

export const useEditorSettings = (): [EditorSettings, (patch: Partial<EditorSettings>) => void] => {
    const [settings, setSettings] = useState<EditorSettings>(() => {
        try {
            return parseSettings(window.localStorage.getItem(STORAGE_KEY));
        } catch {
            // Private browsing and some embedded webviews throw on access.
            return { ...defaultSettings };
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            // Not being able to persist a preference is not worth an error.
        }
    }, [settings]);

    const update = useCallback((patch: Partial<EditorSettings>) => {
        setSettings((current) => parseSettings(JSON.stringify({ ...current, ...patch })));
    }, []);

    return [settings, update];
};
