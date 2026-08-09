import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Compartment, EditorState, Extension, Prec } from '@codemirror/state';
import {
    EditorView,
    crosshairCursor,
    drawSelection,
    dropCursor,
    highlightActiveLine,
    highlightActiveLineGutter,
    highlightSpecialChars,
    keymap,
    lineNumbers,
    rectangularSelection,
} from '@codemirror/view';
import { bracketMatching, codeFolding, foldGutter, foldKeymap, indentOnInput, indentUnit } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import styled from 'styled-components/macro';
import tw from 'twin.macro';
import modes from '@/modes';
import { loadLanguage } from '@/lib/codemirror-languages';
import { lumiEditorHighlighting, lumiEditorTheme } from '@/lib/codemirror-theme';

const EditorContainer = styled.div`
    min-height: 16rem;
    height: calc(100vh - 20rem);
    ${tw`relative flex flex-col rounded overflow-hidden bg-black`};

    .cm-editor {
        ${tw`flex-1 min-h-0`};
        font-size: 13px;
    }
`;

export interface Props {
    style?: React.CSSProperties;
    initialContent?: string;
    mode: string;
    filename?: string;
    onModeChanged: (mode: string) => void;
    fetchContent: (callback: () => Promise<string>) => void;
    onContentSaved: () => void;
    onContentChanged?: (content: string) => void;
}

const findModeByFilename = (filename: string) => {
    for (let i = 0; i < modes.length; i++) {
        const info = modes[i];

        if (info.file && info.file.test(filename)) {
            return info;
        }
    }

    const dot = filename.lastIndexOf('.');
    const ext = dot > -1 && filename.substring(dot + 1, filename.length);

    if (ext) {
        for (let i = 0; i < modes.length; i++) {
            const info = modes[i];
            if (info.ext) {
                for (let j = 0; j < info.ext.length; j++) {
                    if (info.ext[j] === ext) {
                        return info;
                    }
                }
            }
        }
    }

    return undefined;
};

export default ({
    style,
    initialContent,
    filename,
    mode,
    fetchContent,
    onContentSaved,
    onModeChanged,
    onContentChanged,
}: Props) => {
    const [view, setView] = useState<EditorView>();
    const [position, setPosition] = useState({ line: 1, column: 1, selected: 0 });

    // The container re-renders on every keystroke of the parent, so the callbacks
    // arrive as fresh closures each time. Extensions read them through refs to
    // avoid tearing down and rebuilding the editor's configuration.
    const onSavedRef = useRef(onContentSaved);
    const onChangedRef = useRef(onContentChanged);
    onSavedRef.current = onContentSaved;
    onChangedRef.current = onContentChanged;

    // Holds the grammar currently loaded so a content swap can rebuild the state
    // without dropping syntax highlighting.
    const language = useRef<Extension>([]);
    const languageCompartment = useRef(new Compartment());

    const buildExtensions = useCallback(
        (): Extension[] => [
            // Placed above everything else so the browser's own save dialog never wins.
            Prec.highest(
                keymap.of([
                    {
                        key: 'Mod-s',
                        preventDefault: true,
                        run: () => {
                            onSavedRef.current();
                            return true;
                        },
                    },
                ])
            ),
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            history(),
            codeFolding(),
            foldGutter(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            indentUnit.of('    '),
            bracketMatching(),
            closeBrackets(),
            autocompletion(),
            rectangularSelection(),
            crosshairCursor(),
            highlightActiveLine(),
            highlightSelectionMatches(),
            search({ top: true }),
            EditorView.lineWrapping,
            keymap.of([
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...searchKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
                indentWithTab,
            ]),
            lumiEditorTheme,
            lumiEditorHighlighting,
            languageCompartment.current.of(language.current),
            EditorView.updateListener.of((update) => {
                if (update.docChanged && onChangedRef.current) {
                    onChangedRef.current(update.state.doc.toString());
                }

                if (update.docChanged || update.selectionSet) {
                    const range = update.state.selection.main;
                    const line = update.state.doc.lineAt(range.head);

                    setPosition({
                        line: line.number,
                        column: range.head - line.from + 1,
                        selected: range.to - range.from,
                    });
                }
            }),
        ],
        []
    );

    const ref = useCallback((node: HTMLDivElement | null) => {
        if (!node) return;

        const instance = new EditorView({
            state: EditorState.create({ doc: '', extensions: buildExtensions() }),
            parent: node,
        });

        setView(instance);
    }, []);

    useEffect(() => () => view?.destroy(), [view]);

    useEffect(() => {
        if (filename === undefined) {
            return;
        }

        onModeChanged(findModeByFilename(filename)?.mime || 'text/plain');
    }, [filename]);

    useEffect(() => {
        if (!view) return;

        let cancelled = false;

        loadLanguage(mode).then((extension) => {
            // A rapid mode change can resolve out of order; only the newest wins.
            if (cancelled) return;

            language.current = extension;
            view.dispatch({ effects: languageCompartment.current.reconfigure(extension) });
        });

        return () => {
            cancelled = true;
        };
    }, [view, mode]);

    useEffect(() => {
        if (!view) return;

        // Replacing the whole state (rather than dispatching a change) drops the
        // undo history with it, so Ctrl+Z cannot rewind past the file's contents
        // as it was loaded.
        view.setState(EditorState.create({ doc: initialContent || '', extensions: buildExtensions() }));
    }, [view, initialContent]);

    // Deliberately runs on every render: the parent hands us a fresh closure each
    // time and stores whatever we pass back, so a stale getter would save an
    // empty document.
    useEffect(() => {
        if (!view) {
            fetchContent(() => Promise.reject(new Error('no editor session has been configured')));
            return;
        }

        fetchContent(() => Promise.resolve(view.state.doc.toString()));
    });

    return (
        <EditorContainer style={style}>
            <div ref={ref} css={tw`flex-1 min-h-0 overflow-hidden`} />
            <div
                css={tw`flex items-center justify-end gap-4 px-3 py-1 text-2xs text-neutral-400 bg-neutral-900 border-t border-neutral-700`}
            >
                {position.selected > 0 && <span>{position.selected} selected</span>}
                <span>
                    Ln {position.line}, Col {position.column}
                </span>
            </div>
        </EditorContainer>
    );
};
