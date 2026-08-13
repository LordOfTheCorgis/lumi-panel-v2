import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faTimes } from '@fortawesome/free-solid-svg-icons';
import { SearchOptions } from '@/lib/editor/search';

interface Props {
    query: string;
    replacement: string;
    options: SearchOptions;
    matchCount: number;
    currentMatch: number;
    invalid: boolean;
    readOnly: boolean;
    onQueryChange: (value: string) => void;
    onReplacementChange: (value: string) => void;
    onOptionsChange: (patch: Partial<SearchOptions>) => void;
    onStep: (backwards: boolean) => void;
    onReplace: () => void;
    onReplaceAll: () => void;
    onClose: () => void;
}

const toggleClass = (active: boolean) =>
    'rounded px-1.5 py-0.5 font-mono text-xs transition-colors duration-100 ' +
    (active ? 'bg-primary-500 text-white' : 'text-neutral-400 hover:text-neutral-100');

const iconButton =
    'rounded p-1.5 text-neutral-400 transition-colors duration-100 hover:bg-neutral-700 hover:text-neutral-100 disabled:opacity-40';

const EditorSearchPanel = ({
    query,
    replacement,
    options,
    matchCount,
    currentMatch,
    invalid,
    readOnly,
    onQueryChange,
    onReplacementChange,
    onOptionsChange,
    onStep,
    onReplace,
    onReplaceAll,
    onClose,
}: Props) => (
    <div
        className={'absolute right-3 top-3 z-20 w-80 rounded-lg border border-neutral-600 bg-neutral-800 p-2 shadow-xl'}
        // Clicks in here must not steal focus handling from the editor surface.
        onMouseDown={(e) => e.stopPropagation()}
    >
        <div className={'flex items-center gap-1'}>
            <div className={'relative flex-1'}>
                <input
                    autoFocus
                    value={query}
                    onChange={(e) => onQueryChange(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            onStep(e.shiftKey);
                        }
                        if (e.key === 'Escape') onClose();
                    }}
                    placeholder={'Find'}
                    className={
                        'w-full rounded border bg-neutral-900 py-1 pl-2 pr-16 text-sm text-neutral-100 outline-none ' +
                        (invalid ? 'border-yellow-600' : 'border-neutral-600 focus:border-primary-500')
                    }
                />
                <div className={'absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5'}>
                    <button
                        type={'button'}
                        title={'Match case'}
                        className={toggleClass(!!options.caseSensitive)}
                        onClick={() => onOptionsChange({ caseSensitive: !options.caseSensitive })}
                    >
                        Aa
                    </button>
                    <button
                        type={'button'}
                        title={'Whole word'}
                        className={toggleClass(!!options.wholeWord)}
                        onClick={() => onOptionsChange({ wholeWord: !options.wholeWord })}
                    >
                        ab
                    </button>
                    <button
                        type={'button'}
                        title={'Regular expression'}
                        className={toggleClass(!!options.regex)}
                        onClick={() => onOptionsChange({ regex: !options.regex })}
                    >
                        .*
                    </button>
                </div>
            </div>

            <button
                type={'button'}
                title={'Previous match'}
                className={iconButton}
                disabled={matchCount === 0}
                onClick={() => onStep(true)}
            >
                <FontAwesomeIcon icon={faChevronUp} />
            </button>
            <button
                type={'button'}
                title={'Next match'}
                className={iconButton}
                disabled={matchCount === 0}
                onClick={() => onStep(false)}
            >
                <FontAwesomeIcon icon={faChevronDown} />
            </button>
            <button type={'button'} title={'Close'} className={iconButton} onClick={onClose}>
                <FontAwesomeIcon icon={faTimes} />
            </button>
        </div>

        {!readOnly && (
            <div className={'mt-2 flex items-center gap-1'}>
                <input
                    value={replacement}
                    onChange={(e) => onReplacementChange(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            onReplace();
                        }
                        if (e.key === 'Escape') onClose();
                    }}
                    placeholder={options.regex ? 'Replace (supports $1, $&)' : 'Replace'}
                    className={
                        'flex-1 rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-primary-500'
                    }
                />
                <button
                    type={'button'}
                    onClick={onReplace}
                    disabled={matchCount === 0}
                    className={
                        'rounded px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 disabled:opacity-40'
                    }
                >
                    Replace
                </button>
                <button
                    type={'button'}
                    onClick={onReplaceAll}
                    disabled={matchCount === 0}
                    className={
                        'rounded px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 disabled:opacity-40'
                    }
                >
                    All
                </button>
            </div>
        )}

        <p className={'mt-1.5 px-1 text-xs text-neutral-500'}>
            {invalid
                ? 'Invalid pattern'
                : matchCount === 0
                ? query
                    ? 'No results'
                    : ''
                : `${currentMatch + 1} of ${matchCount}`}
        </p>
    </div>
);

export default EditorSearchPanel;
