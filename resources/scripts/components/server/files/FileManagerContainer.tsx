import React, { useEffect, useMemo, useState } from 'react';
import { httpErrorToHuman } from '@/api/http';
import { CSSTransition } from 'react-transition-group';
import Spinner from '@/components/elements/Spinner';
import FileObjectRow from '@/components/server/files/FileObjectRow';
import FileManagerBreadcrumbs from '@/components/server/files/FileManagerBreadcrumbs';
import { FileObject } from '@/api/server/files/loadDirectory';
import NewDirectoryButton from '@/components/server/files/NewDirectoryButton';
import { NavLink, useLocation } from 'react-router-dom';
import Can from '@/components/elements/Can';
import { ServerError } from '@/components/elements/ScreenBlock';
import tw from 'twin.macro';
import { Button } from '@/components/elements/button/index';
import { ServerContext } from '@/state/server';
import useFileManagerSwr from '@/plugins/useFileManagerSwr';
import FileManagerStatus from '@/components/server/files/FileManagerStatus';
import MassActionsBar from '@/components/server/files/MassActionsBar';
import UploadButton from '@/components/server/files/UploadButton';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { useStoreActions } from '@/state/hooks';
import ErrorBoundary from '@/components/elements/ErrorBoundary';
import { FileActionCheckbox } from '@/components/server/files/SelectFileCheckbox';
import { hashToPath } from '@/helpers';
import { bytesToString } from '@/lib/formatters';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen, faSearch, faSortDown, faSortUp, faTimes } from '@fortawesome/free-solid-svg-icons';
import style from './style.module.css';

type SortKey = 'name' | 'size' | 'modified';

// Directories always group ahead of files regardless of the active sort. That
// is the convention every file manager follows and sorting them in with files
// makes a listing much harder to scan.
const sortFiles = (files: FileObject[], key: SortKey, desc: boolean): FileObject[] => {
    const compare = (a: FileObject, b: FileObject): number => {
        switch (key) {
            case 'size':
                return a.size - b.size;
            case 'modified':
                return a.modifiedAt.getTime() - b.modifiedAt.getTime();
            default:
                return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        }
    };

    return files
        .slice()
        .sort((a, b) => (desc ? -compare(a, b) : compare(a, b)))
        .sort((a, b) => (a.isFile === b.isFile ? 0 : a.isFile ? 1 : -1));
};

const dedupe = (files: FileObject[]): FileObject[] =>
    files.filter((file, index) => index === 0 || file.name !== files[index - 1].name);

const SortableHeader = ({
    label,
    field,
    active,
    desc,
    onClick,
    className,
}: {
    label: string;
    field: SortKey;
    active: SortKey;
    desc: boolean;
    onClick: (field: SortKey) => void;
    className?: string;
}) => (
    <button
        type={'button'}
        onClick={() => onClick(field)}
        className={className}
        css={[
            tw`inline-flex items-center gap-1.5 transition-colors duration-150 hover:text-neutral-100`,
            active === field ? tw`text-neutral-100` : tw`text-neutral-400`,
        ]}
    >
        {label}
        {active === field && <FontAwesomeIcon icon={desc ? faSortDown : faSortUp} css={tw`text-2xs`} />}
    </button>
);

export default () => {
    const id = ServerContext.useStoreState((state) => state.server.data!.id);
    const { hash } = useLocation();
    const { data: files, error, mutate } = useFileManagerSwr();
    const directory = ServerContext.useStoreState((state) => state.files.directory);
    const clearFlashes = useStoreActions((actions) => actions.flashes.clearFlashes);
    const setDirectory = ServerContext.useStoreActions((actions) => actions.files.setDirectory);

    const setSelectedFiles = ServerContext.useStoreActions((actions) => actions.files.setSelectedFiles);
    const selectedFilesLength = ServerContext.useStoreState((state) => state.files.selectedFiles.length);

    const [filter, setFilter] = useState('');
    const [sort, setSort] = useState<SortKey>('name');
    const [desc, setDesc] = useState(false);

    useEffect(() => {
        clearFlashes('files');
        setSelectedFiles([]);
        setDirectory(hashToPath(hash));
        setFilter('');
    }, [hash]);

    useEffect(() => {
        mutate();
    }, [directory]);

    // Filter before the 250-row cap, so searching can reach files that the cap
    // would otherwise hide entirely.
    const matched = useMemo(() => {
        const term = filter.trim().toLowerCase();
        const list = term ? (files || []).filter((f) => f.name.toLowerCase().includes(term)) : files || [];

        return dedupe(sortFiles(list, sort, desc));
    }, [files, filter, sort, desc]);

    const visible = matched.slice(0, 250);

    const onSortClick = (field: SortKey) => {
        if (field === sort) {
            setDesc((d) => !d);
        } else {
            setSort(field);
            setDesc(field !== 'name');
        }
    };

    const onSelectAllClick = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFiles(e.currentTarget.checked ? visible.map((file) => file.name) : []);
    };

    if (error) {
        return <ServerError message={httpErrorToHuman(error)} onRetry={() => mutate()} />;
    }

    const directories = (files || []).filter((f) => !f.isFile).length;
    const fileCount = (files || []).length - directories;
    const totalSize = (files || []).reduce((sum, f) => sum + (f.isFile ? f.size : 0), 0);

    return (
        <ServerContentBlock title={'File Manager'} showFlashKey={'files'}>
            <ErrorBoundary>
                <div className={'flex flex-wrap-reverse md:flex-nowrap mb-4'}>
                    <FileManagerBreadcrumbs
                        renderLeft={
                            <FileActionCheckbox
                                type={'checkbox'}
                                css={tw`mx-4`}
                                checked={visible.length > 0 && selectedFilesLength === visible.length}
                                onChange={onSelectAllClick}
                            />
                        }
                    />
                    <Can action={'file.create'}>
                        <div className={style.manager_actions}>
                            <FileManagerStatus />
                            <NewDirectoryButton />
                            <UploadButton />
                            <NavLink to={`/server/${id}/files/new${window.location.hash}`}>
                                <Button>New File</Button>
                            </NavLink>
                        </div>
                    </Can>
                </div>
            </ErrorBoundary>

            {!files ? (
                <Spinner size={'large'} centered />
            ) : (
                <CSSTransition classNames={'fade'} timeout={150} appear in>
                    <div>
                        <div css={tw`mb-3 flex flex-wrap items-center gap-3`}>
                            <div css={tw`relative flex-1 min-w-0`}>
                                <FontAwesomeIcon
                                    icon={faSearch}
                                    css={tw`absolute left-3 top-1/2 text-neutral-500 text-sm`}
                                    style={{ transform: 'translateY(-50%)' }}
                                />
                                <input
                                    type={'text'}
                                    value={filter}
                                    onChange={(e) => setFilter(e.currentTarget.value)}
                                    placeholder={'Filter this directory…'}
                                    css={tw`w-full rounded-md border border-neutral-600 bg-neutral-800 py-2 pl-9 pr-9 text-sm text-neutral-100 outline-none transition-colors duration-150 focus:border-primary-500`}
                                />
                                {filter.length > 0 && (
                                    <button
                                        onClick={() => setFilter('')}
                                        aria-label={'Clear filter'}
                                        css={tw`absolute right-3 top-1/2 text-neutral-500 hover:text-neutral-200`}
                                        style={{ transform: 'translateY(-50%)' }}
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                )}
                            </div>
                            <p css={tw`text-xs text-neutral-500 whitespace-nowrap`}>
                                {directories} folder{directories === 1 ? '' : 's'}, {fileCount} file
                                {fileCount === 1 ? '' : 's'}
                                {totalSize > 0 && ` · ${bytesToString(totalSize)}`}
                            </p>
                        </div>

                        {matched.length > 250 && (
                            <div css={tw`rounded-md border border-yellow-600 bg-yellow-600 bg-opacity-10 mb-2 p-3`}>
                                <p css={tw`text-yellow-200 text-sm text-center`}>
                                    Showing the first 250 of {matched.length} entries. Use the filter above to narrow
                                    this down.
                                </p>
                            </div>
                        )}

                        {matched.length === 0 ? (
                            <div
                                css={tw`rounded-lg border border-dashed border-neutral-600 bg-neutral-800 bg-opacity-40 px-6 py-16 text-center`}
                            >
                                <FontAwesomeIcon icon={faFolderOpen} css={tw`text-3xl text-neutral-500`} />
                                <p css={tw`mt-4 text-sm text-neutral-400`}>
                                    {filter.trim().length > 0
                                        ? `Nothing in this directory matches “${filter.trim()}”.`
                                        : 'This directory is empty.'}
                                </p>
                            </div>
                        ) : (
                            <div css={tw`rounded-lg border border-neutral-600 overflow-hidden`}>
                                <div className={style.header_row}>
                                    <SortableHeader
                                        label={'Name'}
                                        field={'name'}
                                        active={sort}
                                        desc={desc}
                                        onClick={onSortClick}
                                        className={'flex-1'}
                                    />
                                    <SortableHeader
                                        label={'Size'}
                                        field={'size'}
                                        active={sort}
                                        desc={desc}
                                        onClick={onSortClick}
                                        className={'w-24 justify-end mr-6 hidden sm:inline-flex'}
                                    />
                                    <SortableHeader
                                        label={'Modified'}
                                        field={'modified'}
                                        active={sort}
                                        desc={desc}
                                        onClick={onSortClick}
                                        className={'w-44 justify-end mr-4 hidden md:inline-flex'}
                                    />
                                    {/* Reserves the width of the per-row actions trigger. */}
                                    <div css={tw`w-9`} />
                                </div>
                                {visible.map((file) => (
                                    <FileObjectRow key={file.key} file={file} />
                                ))}
                            </div>
                        )}

                        <MassActionsBar />
                    </div>
                </CSSTransition>
            )}
        </ServerContentBlock>
    );
};
