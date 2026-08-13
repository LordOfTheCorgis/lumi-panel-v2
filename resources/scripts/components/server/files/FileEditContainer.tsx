import React, { useCallback, useEffect, useState } from 'react';
import getFileContents from '@/api/server/files/getFileContents';
import { httpErrorToHuman } from '@/api/http';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import saveFileContents from '@/api/server/files/saveFileContents';
import FileManagerBreadcrumbs from '@/components/server/files/FileManagerBreadcrumbs';
import { useHistory, useLocation, useParams } from 'react-router';
import FileNameModal from '@/components/server/files/FileNameModal';
import Can from '@/components/elements/Can';
import FlashMessageRender from '@/components/FlashMessageRender';
import PageContentBlock from '@/components/elements/PageContentBlock';
import { ServerError } from '@/components/elements/ScreenBlock';
import tw from 'twin.macro';
import Button from '@/components/elements/Button';
import Select from '@/components/elements/Select';
import { languageById, languageForFilename, sortedLanguages } from '@/lib/editor/languages';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompress, faExpand } from '@fortawesome/free-solid-svg-icons';
import useFlash from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';
import ErrorBoundary from '@/components/elements/ErrorBoundary';
import { encodePathSegments, hashToPath } from '@/helpers';
import { dirname } from 'pathe';
import LumiEditor from '@/components/elements/editor/LumiEditor';

const getNewFileDraftKey = (uuid: string, directory: string) => `pterodactyl:new-file:${uuid}:${directory}`;

export default () => {
    const [error, setError] = useState('');
    const { action } = useParams<{ action: 'new' | string }>();
    const [loading, setLoading] = useState(action === 'edit');
    const [content, setContent] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    // null means "follow the filename"; picking from the dropdown pins it.
    const [languageId, setLanguageId] = useState<string | null>(null);
    const [fullscreen, setFullscreen] = useState(false);

    const history = useHistory();
    const { hash } = useLocation();

    const id = ServerContext.useStoreState((state) => state.server.data!.id);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const setDirectory = ServerContext.useStoreActions((actions) => actions.files.setDirectory);
    const { addError, clearFlashes } = useFlash();

    // The picked language wins, otherwise fall back to whatever the filename
    // says. Resolving it here keeps the editor and the dropdown in agreement.
    const language = languageId ? languageById(languageId) : languageForFilename(hashToPath(hash));

    const filePath = hashToPath(hash);
    const directory = action === 'new' ? filePath : dirname(filePath);
    const draftKey = action === 'new' ? getNewFileDraftKey(uuid, directory) : undefined;
    const saveDraft = useCallback(
        (value: string) => {
            if (!draftKey) return;

            if (value.length > 0) {
                sessionStorage.setItem(draftKey, value);
            } else {
                sessionStorage.removeItem(draftKey);
            }
        },
        [draftKey]
    );

    let fetchFileContent: null | (() => Promise<string>) = null;

    useEffect(() => {
        setDirectory(directory);
    }, [directory, setDirectory]);

    // Bound on the window rather than the editor: focus sits inside the
    // editor's own textarea, which handles and stops its own key events.
    useEffect(() => {
        if (!fullscreen) return;

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setFullscreen(false);
        };

        window.addEventListener('keydown', onKey);
        document.body.classList.add('overflow-hidden');

        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.classList.remove('overflow-hidden');
        };
    }, [fullscreen]);

    useEffect(() => {
        if (!draftKey) return;

        setContent(sessionStorage.getItem(draftKey) || '');
    }, [draftKey]);

    useEffect(() => {
        if (action === 'new') return;

        setError('');
        setLoading(true);
        getFileContents(uuid, filePath)
            .then(setContent)
            .catch((error) => {
                console.error(error);
                setError(httpErrorToHuman(error));
            })
            .then(() => setLoading(false));
    }, [action, uuid, filePath]);

    const save = async (name?: string) => {
        if (!fetchFileContent) {
            return;
        }

        setLoading(true);
        clearFlashes('files:view');

        let redirecting = false;

        try {
            const content = await fetchFileContent();

            await saveFileContents(uuid, name || filePath, content);

            if (name) {
                if (draftKey) {
                    sessionStorage.removeItem(draftKey);
                }

                history.push(`/server/${id}/files/edit#/${encodePathSegments(name)}`);
                redirecting = true;
                return;
            }
        } catch (error) {
            console.error(error);
            addError({ message: httpErrorToHuman(error), key: 'files:view' });
        } finally {
            if (!redirecting) {
                setLoading(false);
            }
        }
    };

    if (error) {
        return <ServerError message={error} onBack={() => history.goBack()} />;
    }

    return (
        <PageContentBlock>
            <div className={fullscreen ? 'fixed inset-0 z-50 flex flex-col bg-neutral-900 p-4' : 'flex flex-col'}>
                <FlashMessageRender byKey={'files:view'} css={tw`mb-3`} />

                {/* One toolbar instead of a breadcrumb row above and a controls
                    row below. That row alone was costing the editor ~60px of
                    height on every screen. */}
                <div css={tw`mb-3 flex flex-wrap items-center gap-3`}>
                    {!fullscreen && (
                        <ErrorBoundary>
                            <div css={tw`min-w-0 flex-1`}>
                                <FileManagerBreadcrumbs withinFileEditor isNewFile={action !== 'edit'} />
                            </div>
                        </ErrorBoundary>
                    )}

                    <div css={tw`ml-auto flex items-center gap-3`}>
                        <div css={tw`rounded bg-neutral-900`}>
                            <Select value={language.id} onChange={(e) => setLanguageId(e.currentTarget.value)}>
                                {sortedLanguages().map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <button
                            type={'button'}
                            onClick={() => setFullscreen((value) => !value)}
                            title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
                            aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
                            css={tw`rounded-md border border-neutral-600 bg-neutral-700 px-3 py-2 text-sm text-neutral-300 transition-colors duration-150 hover:border-neutral-500 hover:text-neutral-100`}
                        >
                            <FontAwesomeIcon icon={fullscreen ? faCompress : faExpand} />
                        </button>

                        {action === 'edit' ? (
                            <Can action={'file.update'}>
                                <Button onClick={() => save()}>Save Content</Button>
                            </Can>
                        ) : (
                            <Can action={'file.create'}>
                                <Button onClick={() => setModalVisible(true)}>Create File</Button>
                            </Can>
                        )}
                    </div>
                </div>

                {hash.replace(/^#/, '').endsWith('.pteroignore') && !fullscreen && (
                    <div css={tw`mb-3 rounded-md border-l-4 border-primary-500 bg-neutral-800 p-3`}>
                        <p css={tw`text-neutral-300 text-sm`}>
                            You&apos;re editing a{' '}
                            <code css={tw`font-mono bg-black rounded py-px px-1`}>.pteroignore</code> file. Anything
                            listed here is excluded from backups. Wildcards work with an asterisk (
                            <code css={tw`font-mono bg-black rounded py-px px-1`}>*</code>), and a rule can be negated
                            with an exclamation point (<code css={tw`font-mono bg-black rounded py-px px-1`}>!</code>).
                        </p>
                    </div>
                )}

                <FileNameModal
                    visible={modalVisible}
                    onDismissed={() => setModalVisible(false)}
                    onFileNamed={(name) => {
                        setModalVisible(false);
                        save(name);
                    }}
                />

                <div css={fullscreen ? tw`relative flex-1 min-h-0` : tw`relative`}>
                    <SpinnerOverlay visible={loading} />
                    <LumiEditor
                        language={language}
                        initialValue={content}
                        style={
                            fullscreen
                                ? { height: '100%' }
                                : // Was 20rem. The toolbar merge gave most of
                                  // that back, so the editor can have it.
                                  { minHeight: '20rem', height: 'calc(100vh - 13rem)' }
                        }
                        className={'rounded-lg border border-neutral-600 overflow-hidden'}
                        registerAccessor={(get) => {
                            fetchFileContent = () => Promise.resolve(get());
                        }}
                        onSave={() => {
                            if (action !== 'edit') {
                                setModalVisible(true);
                            } else {
                                save();
                            }
                        }}
                        onChange={action === 'new' ? saveDraft : undefined}
                    />
                </div>
            </div>
        </PageContentBlock>
    );
};
