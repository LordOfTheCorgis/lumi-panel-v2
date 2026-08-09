import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * Lumix editor theme. Chrome colors are pulled from the panel's own neutral
 * scale so the editor sits inside the page rather than on top of it, and the
 * caret plus active-line accents use the brand red.
 */
const c = {
    background: '#131a20',
    foreground: '#cdd6de',
    caret: '#ff4c4c',
    selection: '#2b3a47',
    activeLine: '#1a232c',
    gutterForeground: '#57697a',
    gutterActive: '#9aa5b1',
    panel: '#1f2933',
    border: '#2b3a47',
    matchingBracket: '#3d5163',
    searchMatch: '#4a3a2a',
    selectedMatch: '#7a4a1f',

    comment: '#5f7183',
    keyword: '#ff7676',
    operator: '#ff9d76',
    string: '#a3d977',
    number: '#ffd479',
    function: '#7fd3e0',
    type: '#e0b3ff',
    variable: '#cdd6de',
    meta: '#89a0b3',
    invalid: '#ff5370',
};

export const lumiEditorTheme: Extension = EditorView.theme(
    {
        '&': {
            color: c.foreground,
            backgroundColor: c.background,
            height: '100%',
        },
        '.cm-content': {
            caretColor: c.caret,
            fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Consolas, monospace',
            padding: '0.5rem 0',
        },
        '.cm-scroller': {
            fontFamily: 'inherit',
            lineHeight: '1.5',
        },
        '&.cm-focused': {
            outline: 'none',
        },
        '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: c.caret,
            borderLeftWidth: '2px',
        },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
            backgroundColor: c.selection,
        },
        '.cm-activeLine': {
            backgroundColor: c.activeLine,
        },
        '.cm-gutters': {
            backgroundColor: c.background,
            color: c.gutterForeground,
            border: 'none',
            borderRight: `1px solid ${c.border}`,
        },
        '.cm-activeLineGutter': {
            backgroundColor: c.activeLine,
            color: c.gutterActive,
        },
        '.cm-lineNumbers .cm-gutterElement': {
            padding: '0 0.75rem 0 1rem',
            minWidth: '3ch',
        },
        '.cm-foldGutter .cm-gutterElement': {
            padding: '0 0.25rem',
            cursor: 'pointer',
        },
        '.cm-foldPlaceholder': {
            backgroundColor: c.panel,
            border: `1px solid ${c.border}`,
            color: c.meta,
            borderRadius: '3px',
            margin: '0 0.25rem',
            padding: '0 0.35rem',
        },
        '&.cm-focused .cm-matchingBracket': {
            backgroundColor: c.matchingBracket,
            color: 'inherit',
            outline: 'none',
        },
        '&.cm-focused .cm-nonmatchingBracket': {
            backgroundColor: 'transparent',
            color: c.invalid,
        },
        '.cm-selectionMatch': {
            backgroundColor: c.matchingBracket,
        },
        '.cm-searchMatch': {
            backgroundColor: c.searchMatch,
            outline: `1px solid ${c.border}`,
        },
        '.cm-searchMatch.cm-searchMatch-selected': {
            backgroundColor: c.selectedMatch,
        },

        // Search / replace and goto-line panels.
        '.cm-panels': {
            backgroundColor: c.panel,
            color: c.foreground,
            borderTop: `1px solid ${c.border}`,
        },
        '.cm-panel.cm-search': {
            padding: '0.5rem 0.75rem',
            fontFamily: 'inherit',
        },
        '.cm-panel.cm-search label': {
            fontSize: '0.75rem',
            color: c.meta,
        },
        '.cm-textfield': {
            backgroundColor: c.background,
            border: `1px solid ${c.border}`,
            borderRadius: '3px',
            color: c.foreground,
            padding: '0.25rem 0.5rem',
        },
        '.cm-textfield:focus': {
            borderColor: c.caret,
            outline: 'none',
        },
        '.cm-button': {
            backgroundColor: c.border,
            backgroundImage: 'none',
            border: `1px solid ${c.border}`,
            borderRadius: '3px',
            color: c.foreground,
            cursor: 'pointer',
            padding: '0.25rem 0.6rem',
        },
        '.cm-button:hover': {
            backgroundColor: c.matchingBracket,
        },
        '.cm-panel.cm-search [name=close]': {
            color: c.meta,
            cursor: 'pointer',
            fontSize: '1.1rem',
            padding: '0 0.35rem',
        },
        '.cm-panel.cm-search [name=close]:hover': {
            color: c.foreground,
        },

        // Autocompletion popup.
        '.cm-tooltip': {
            backgroundColor: c.panel,
            border: `1px solid ${c.border}`,
            borderRadius: '4px',
            color: c.foreground,
        },
        '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
            padding: '0.15rem 0.5rem',
        },
        '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
            backgroundColor: 'rgba(255, 76, 76, 0.18)',
            color: '#ff7676',
        },
    },
    { dark: true }
);

const lumiHighlightStyle = HighlightStyle.define([
    { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: c.comment, fontStyle: 'italic' },
    { tag: [t.keyword, t.moduleKeyword, t.controlKeyword], color: c.keyword },
    { tag: [t.definitionKeyword, t.modifier, t.self], color: c.keyword },
    { tag: [t.operator, t.operatorKeyword, t.punctuation, t.separator, t.bracket], color: c.operator },
    { tag: [t.string, t.special(t.string), t.regexp], color: c.string },
    { tag: [t.number, t.integer, t.float, t.bool, t.null, t.atom], color: c.number },
    { tag: [t.function(t.variableName), t.function(t.propertyName), t.labelName], color: c.function },
    { tag: [t.typeName, t.className, t.namespace, t.definition(t.typeName)], color: c.type },
    { tag: [t.variableName, t.propertyName, t.attributeValue], color: c.variable },
    { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: c.foreground },
    { tag: [t.tagName, t.angleBracket], color: c.keyword },
    { tag: [t.attributeName], color: c.function },
    { tag: [t.meta, t.processingInstruction, t.documentMeta], color: c.meta },
    { tag: [t.link, t.url], color: c.function, textDecoration: 'underline' },
    { tag: t.heading, color: c.keyword, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: [t.escape, t.character], color: c.operator },
    { tag: [t.invalid], color: c.invalid },
]);

export const lumiEditorHighlighting: Extension = syntaxHighlighting(lumiHighlightStyle);
