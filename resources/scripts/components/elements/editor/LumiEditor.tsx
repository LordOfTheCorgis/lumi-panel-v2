import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Position, TextDocument, position } from '@/lib/editor/document';
import { History } from '@/lib/editor/history';
import { Highlighter } from '@/lib/editor/highlighter';
import { LanguageSpec } from '@/lib/editor/tokenizer';
import { plaintext } from '@/lib/editor/languages';
import theme from '@/lib/editor/theme';
import {
    Direction,
    Granularity,
    Selection,
    applyMovement,
    collapsed,
    isEmpty,
    lineAt,
    selectAll,
    toRange,
    wordAt,
} from '@/lib/editor/selection';

export interface LumiEditorProps {
    initialValue?: string;
    language?: LanguageSpec;
    readOnly?: boolean;
    tabSize?: number;
    /** Called on every change; the container uses this for draft saving. */
    onChange?: (value: string) => void;
    onSave?: () => void;
    /** Handed a getter for the current text, so the parent can read on demand. */
    registerAccessor?: (get: () => string) => void;
    className?: string;
    style?: React.CSSProperties;
}

const LINE_HEIGHT = 20;
const OVERSCAN = 8;
const GUTTER_PADDING = 16;

/**
 * The editor view.
 *
 * Input goes through an offscreen textarea rather than a contenteditable. That
 * is how CodeMirror 5 and Ace do it, and it is not laziness: a textarea gets
 * IME composition, native clipboard, spellcheck suppression, autofill
 * suppression and screen reader support for free, all of which are genuinely
 * hard to reimplement and all of which break silently for the people who need
 * them most.
 *
 * Only the visible slice of lines is rendered. A 20,000 line log would
 * otherwise be 20,000 DOM nodes.
 */
const LumiEditor = ({
    initialValue = '',
    language = plaintext,
    readOnly = false,
    tabSize = 4,
    onChange,
    onSave,
    registerAccessor,
    className,
    style,
}: LumiEditorProps) => {
    const scroller = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLTextAreaElement>(null);
    const measure = useRef<HTMLSpanElement>(null);

    // The document is mutable and lives in a ref; React state holds only a
    // version counter. Cloning the buffer on every keystroke to satisfy
    // immutability would be the single most expensive thing this component does.
    const doc = useRef(new TextDocument(initialValue));
    const history = useRef(new History());
    const highlighter = useRef(new Highlighter(language));

    const [version, setVersion] = useState(0);
    const [selection, setSelection] = useState<Selection>(collapsed(position(0, 0)));
    const [focused, setFocused] = useState(false);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(600);
    const [charWidth, setCharWidth] = useState(8);

    const dragging = useRef(false);

    // Measure the monospace advance once. Hardcoding it looks fine until
    // someone's browser substitutes a different font and every caret is wrong.
    useLayoutEffect(() => {
        if (measure.current) {
            const width = measure.current.getBoundingClientRect().width / 50;

            if (width > 0) setCharWidth(width);
        }
    }, []);

    useLayoutEffect(() => {
        const element = scroller.current;
        if (!element) return;

        const observer = new ResizeObserver(() => setViewportHeight(element.clientHeight));
        observer.observe(element);
        setViewportHeight(element.clientHeight);

        return () => observer.disconnect();
    }, []);

    // Reset everything when the file being edited changes.
    useEffect(() => {
        doc.current = new TextDocument(initialValue);
        history.current.clear();
        highlighter.current.invalidateAll();
        highlighter.current.update(doc.current, 0);
        setSelection(collapsed(position(0, 0)));
        setVersion((v) => v + 1);
    }, [initialValue]);

    useEffect(() => {
        highlighter.current.setLanguage(language);
        highlighter.current.update(doc.current, 0);
        setVersion((v) => v + 1);
    }, [language]);

    useEffect(() => {
        registerAccessor?.(() => doc.current.getText());
    });

    const gutterWidth = useMemo(
        () => String(doc.current.lineCount).length * charWidth + GUTTER_PADDING * 2,
        [version, charWidth]
    );

    /** Applies an edit, records it for undo, and moves the caret. */
    const edit = useCallback(
        (from: Position, to: Position, text: string, coalesce = true) => {
            if (readOnly) return;

            const before = selection.head;
            const change = doc.current.replaceRange({ from, to }, text);

            history.current.record(change, before, coalesce ? Date.now() : 0);
            highlighter.current.update(doc.current, change.range.from.line);

            setSelection(collapsed(change.after));
            setVersion((v) => v + 1);
            onChange?.(doc.current.getText());
        },
        [readOnly, selection.head, onChange]
    );

    const insert = useCallback(
        (text: string) => {
            const range = toRange(selection);
            edit(range.from, range.to, text);
        },
        [selection, edit]
    );

    const runUndo = useCallback(
        (redo = false) => {
            const at = redo ? history.current.redo(doc.current) : history.current.undo(doc.current);

            if (at === null) return;

            highlighter.current.invalidateAll();
            highlighter.current.update(doc.current, 0);
            setSelection(collapsed(doc.current.clamp(at)));
            setVersion((v) => v + 1);
            onChange?.(doc.current.getText());
        },
        [onChange]
    );

    const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const mod = event.ctrlKey || event.metaKey;
        const range = toRange(selection);

        if (mod && event.key.toLowerCase() === 's') {
            event.preventDefault();
            onSave?.();
            return;
        }

        if (mod && event.key.toLowerCase() === 'a') {
            event.preventDefault();
            setSelection(selectAll(doc.current));
            return;
        }

        if (mod && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            runUndo(event.shiftKey);
            return;
        }

        if (mod && event.key.toLowerCase() === 'y') {
            event.preventDefault();
            runUndo(true);
            return;
        }

        const arrows: Record<string, Direction> = {
            ArrowLeft: 'left',
            ArrowRight: 'right',
            ArrowUp: 'up',
            ArrowDown: 'down',
        };

        if (arrows[event.key]) {
            event.preventDefault();
            const granularity: Granularity = mod ? 'word' : 'character';
            setSelection(applyMovement(doc.current, selection, arrows[event.key], granularity, event.shiftKey));
            return;
        }

        if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            setSelection(
                applyMovement(doc.current, selection, event.key === 'Home' ? 'left' : 'right', 'line', event.shiftKey)
            );
            return;
        }

        if (event.key === 'PageUp' || event.key === 'PageDown') {
            event.preventDefault();
            const rows = Math.max(1, Math.floor(viewportHeight / LINE_HEIGHT) - 1);
            const delta = event.key === 'PageUp' ? -rows : rows;
            const head = doc.current.clamp(position(selection.head.line + delta, selection.head.ch));

            setSelection(event.shiftKey ? { anchor: selection.anchor, head } : collapsed(head));
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();

            // Carry the current line's indentation onto the new line. Losing it
            // is the fastest way to make an editor feel homemade.
            const indent = /^[ \t]*/.exec(doc.current.getLine(range.from.line))?.[0] ?? '';
            edit(range.from, range.to, '\n' + indent, false);
            return;
        }

        if (event.key === 'Tab') {
            event.preventDefault();
            edit(range.from, range.to, ' '.repeat(tabSize), false);
            return;
        }

        if (event.key === 'Backspace') {
            event.preventDefault();

            if (!isEmpty(selection)) {
                edit(range.from, range.to, '', false);
            } else {
                const from = applyMovement(doc.current, selection, 'left', mod ? 'word' : 'character', false).head;
                edit(from, range.to, '', false);
            }
            return;
        }

        if (event.key === 'Delete') {
            event.preventDefault();

            if (!isEmpty(selection)) {
                edit(range.from, range.to, '', false);
            } else {
                const to = applyMovement(doc.current, selection, 'right', mod ? 'word' : 'character', false).head;
                edit(range.from, to, '', false);
            }
        }
    };

    // Typed characters and IME composition both arrive here as input events on
    // the textarea, which is the whole reason for using one.
    const onInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
        const value = event.currentTarget.value;

        if (value.length > 0) {
            insert(value);
            event.currentTarget.value = '';
        }
    };

    const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        event.preventDefault();
        insert(event.clipboardData.getData('text/plain'));
    };

    const onCopyOrCut = (event: React.ClipboardEvent<HTMLTextAreaElement>, cut: boolean) => {
        if (isEmpty(selection)) return;

        event.preventDefault();
        event.clipboardData.setData('text/plain', doc.current.getRange(toRange(selection)));

        if (cut && !readOnly) {
            const range = toRange(selection);
            edit(range.from, range.to, '', false);
        }
    };

    const positionFromEvent = (event: { clientX: number; clientY: number }): Position => {
        const element = scroller.current;
        if (!element) return position(0, 0);

        const rect = element.getBoundingClientRect();
        const y = event.clientY - rect.top + element.scrollTop;
        const x = event.clientX - rect.left + element.scrollLeft - gutterWidth;

        return doc.current.clamp(position(Math.floor(y / LINE_HEIGHT), Math.round(x / charWidth)));
    };

    const onMouseDown = (event: React.MouseEvent) => {
        // Let the gutter keep native text selection out of the way, but still
        // focus the editor.
        event.preventDefault();
        input.current?.focus();

        const at = positionFromEvent(event);

        if (event.detail === 2) {
            setSelection(wordAt(doc.current, at));
            return;
        }

        if (event.detail >= 3) {
            setSelection(lineAt(doc.current, at));
            return;
        }

        dragging.current = true;
        setSelection(event.shiftKey ? { anchor: selection.anchor, head: at } : collapsed(at));
    };

    useEffect(() => {
        const onMove = (event: MouseEvent) => {
            if (!dragging.current) return;

            setSelection((current) => ({ anchor: current.anchor, head: positionFromEvent(event) }));
        };
        const onUp = () => {
            dragging.current = false;
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [gutterWidth, charWidth]);

    // Keep the caret on screen after any movement.
    useEffect(() => {
        const element = scroller.current;
        if (!element) return;

        const top = selection.head.line * LINE_HEIGHT;

        if (top < element.scrollTop) {
            element.scrollTop = top;
        } else if (top + LINE_HEIGHT > element.scrollTop + element.clientHeight) {
            element.scrollTop = top + LINE_HEIGHT - element.clientHeight;
        }
    }, [selection.head.line, selection.head.ch]);

    const lineCount = doc.current.lineCount;
    const first = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - OVERSCAN);
    const last = Math.min(lineCount, Math.ceil((scrollTop + viewportHeight) / LINE_HEIGHT) + OVERSCAN);
    const range = toRange(selection);

    const renderLine = (index: number) => {
        const text = doc.current.getLine(index);
        const tokens = highlighter.current.getTokens(index);
        const nodes: React.ReactNode[] = [];
        let cursor = 0;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (token.from > cursor) {
                nodes.push(text.slice(cursor, token.from));
            }

            nodes.push(
                <span key={i} style={{ color: theme.tokens[token.type] }}>
                    {text.slice(token.from, token.to)}
                </span>
            );
            cursor = token.to;
        }

        if (cursor < text.length) {
            nodes.push(text.slice(cursor));
        }

        // Selection highlight for this line, drawn behind the text.
        let highlight: React.ReactNode = null;
        if (!isEmpty(selection) && index >= range.from.line && index <= range.to.line) {
            const start = index === range.from.line ? range.from.ch : 0;
            const endOfLine = index < range.to.line;
            const end = endOfLine ? text.length + 1 : range.to.ch;

            highlight = (
                <span
                    style={{
                        position: 'absolute',
                        left: start * charWidth,
                        width: Math.max(end - start, 0) * charWidth,
                        top: 0,
                        height: LINE_HEIGHT,
                        background: theme.selection,
                    }}
                />
            );
        }

        return (
            <div
                key={index}
                style={{
                    position: 'absolute',
                    top: index * LINE_HEIGHT,
                    left: 0,
                    right: 0,
                    height: LINE_HEIGHT,
                    lineHeight: `${LINE_HEIGHT}px`,
                    background: index === selection.head.line && isEmpty(selection) ? theme.activeLine : undefined,
                }}
            >
                <span
                    style={{
                        position: 'absolute',
                        left: 0,
                        width: gutterWidth - GUTTER_PADDING,
                        textAlign: 'right',
                        color: index === selection.head.line ? theme.gutterActive : theme.gutter,
                        userSelect: 'none',
                    }}
                >
                    {index + 1}
                </span>
                <span style={{ position: 'absolute', left: gutterWidth, whiteSpace: 'pre' }}>
                    {highlight}
                    <span style={{ position: 'relative' }}>{nodes}</span>
                </span>
            </div>
        );
    };

    const visible: React.ReactNode[] = [];
    for (let i = first; i < last; i++) {
        visible.push(renderLine(i));
    }

    const caretLeft = gutterWidth + selection.head.ch * charWidth;
    const caretTop = selection.head.line * LINE_HEIGHT;

    return (
        <div
            className={className}
            style={{
                position: 'relative',
                background: theme.background,
                color: theme.foreground,
                fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Consolas, monospace',
                fontSize: 13,
                ...style,
            }}
        >
            {/* Off-screen ruler for the character advance. */}
            <span
                ref={measure}
                aria-hidden
                style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', top: -9999 }}
            >
                {'0'.repeat(50)}
            </span>

            <div
                ref={scroller}
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                onMouseDown={onMouseDown}
                style={{ position: 'absolute', inset: 0, overflow: 'auto', cursor: 'text' }}
            >
                <div style={{ position: 'relative', height: lineCount * LINE_HEIGHT, minWidth: '100%' }}>
                    {visible}

                    {focused && isEmpty(selection) && (
                        <span
                            style={{
                                position: 'absolute',
                                left: caretLeft,
                                top: caretTop,
                                width: 2,
                                height: LINE_HEIGHT,
                                background: theme.caret,
                                animation: 'lumi-editor-blink 1s step-end infinite',
                            }}
                        />
                    )}

                    <textarea
                        ref={input}
                        value={''}
                        readOnly={readOnly}
                        onInput={onInput}
                        onKeyDown={onKeyDown}
                        onPaste={onPaste}
                        onCopy={(e) => onCopyOrCut(e, false)}
                        onCut={(e) => onCopyOrCut(e, true)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        onChange={() => undefined}
                        spellCheck={false}
                        autoCapitalize={'off'}
                        autoCorrect={'off'}
                        aria-label={'File contents'}
                        style={{
                            position: 'absolute',
                            // Sits at the caret so IME candidate windows appear
                            // in the right place rather than the top corner.
                            left: caretLeft,
                            top: caretTop,
                            width: 1,
                            height: LINE_HEIGHT,
                            padding: 0,
                            border: 0,
                            outline: 'none',
                            opacity: 0,
                            resize: 'none',
                            overflow: 'hidden',
                            background: 'transparent',
                            color: 'transparent',
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default LumiEditor;
