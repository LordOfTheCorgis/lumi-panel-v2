import React, { useEffect, useState } from 'react';
import CreateApiKeyForm from '@/components/dashboard/forms/CreateApiKeyForm';
import getApiKeys, { ApiKey } from '@/api/account/getApiKeys';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faKey, faPlus, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import deleteApiKey from '@/api/account/deleteApiKey';
import FlashMessageRender from '@/components/FlashMessageRender';
import { format, formatDistanceToNow } from 'date-fns';
import PageContentBlock from '@/components/elements/PageContentBlock';
import PageHeader from '@/components/elements/PageHeader';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import CopyOnClick from '@/components/elements/CopyOnClick';
import { Dialog } from '@/components/elements/dialog';
import { useFlashKey } from '@/plugins/useFlash';
import Code from '@/components/elements/Code';

// Mirrors the cap enforced in ApiKeyController::store. Better to warn before
// someone fills in the form than to reject it afterwards.
const KEY_LIMIT = 25;

export default () => {
    const [deleteIdentifier, setDeleteIdentifier] = useState('');
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const { clearAndAddHttpError } = useFlashKey('account');

    useEffect(() => {
        getApiKeys()
            .then((keys) => setKeys(keys))
            .then(() => setLoading(false))
            .catch((error) => clearAndAddHttpError(error));
    }, []);

    const doDeletion = (identifier: string) => {
        setLoading(true);

        clearAndAddHttpError();
        deleteApiKey(identifier)
            .then(() => setKeys((s) => [...(s || []).filter((key) => key.identifier !== identifier)]))
            .catch((error) => clearAndAddHttpError(error))
            .then(() => {
                setLoading(false);
                setDeleteIdentifier('');
            });
    };

    const atLimit = keys.length >= KEY_LIMIT;

    return (
        <PageContentBlock title={'Account API'}>
            <PageHeader
                title={'API Credentials'}
                description={'Keys that let external tools control your servers on your behalf.'}
            />

            <FlashMessageRender byKey={'account'} className={'mb-4'} />

            <Dialog.Confirm
                title={'Delete API Key'}
                confirm={'Delete Key'}
                open={!!deleteIdentifier}
                onClose={() => setDeleteIdentifier('')}
                onConfirmed={() => doDeletion(deleteIdentifier)}
            >
                All requests using the <Code>{deleteIdentifier}</Code> key will be invalidated. Anything currently
                relying on it will stop working immediately.
            </Dialog.Confirm>

            <div className={'grid gap-6 lg:grid-cols-3'}>
                <div className={'lg:col-span-1'}>
                    <TitledGreyBox title={'Create API Key'} icon={faPlus}>
                        {atLimit ? (
                            <p className={'text-sm text-yellow-400'}>
                                You have reached the limit of {KEY_LIMIT} API keys. Delete one before creating another.
                            </p>
                        ) : (
                            <CreateApiKeyForm onKeyCreated={(key) => setKeys((s) => [...s!, key])} />
                        )}
                    </TitledGreyBox>
                </div>

                <div className={'lg:col-span-2 relative'}>
                    <SpinnerOverlay visible={loading} />

                    <div className={'mb-3 flex items-center justify-between'}>
                        <p className={'text-sm font-medium text-neutral-100'}>Your Keys</p>
                        <p className={'text-xs text-neutral-500'}>
                            {keys.length} of {KEY_LIMIT}
                        </p>
                    </div>

                    {keys.length === 0 ? (
                        <div
                            className={
                                'rounded-lg border border-dashed border-neutral-600 bg-neutral-800 bg-opacity-40 px-6 py-16 text-center'
                            }
                        >
                            <FontAwesomeIcon icon={faKey} className={'text-3xl text-neutral-500'} />
                            <p className={'mt-4 text-sm text-neutral-400'}>
                                {loading ? 'Loading…' : 'No API keys exist for this account.'}
                            </p>
                        </div>
                    ) : (
                        <div className={'space-y-3'}>
                            {keys.map((key) => (
                                <div
                                    key={key.identifier}
                                    className={
                                        'rounded-lg border border-neutral-600 bg-neutral-700 p-4 transition-colors duration-150 hover:border-neutral-500'
                                    }
                                >
                                    <div className={'flex items-start gap-3'}>
                                        <FontAwesomeIcon icon={faKey} className={'mt-1 text-neutral-500'} fixedWidth />
                                        <div className={'min-w-0 flex-1'}>
                                            <p className={'text-sm font-medium text-neutral-100 break-words'}>
                                                {key.description}
                                            </p>
                                            <CopyOnClick text={key.identifier}>
                                                <code
                                                    title={'Click to copy'}
                                                    className={
                                                        'mt-1 inline-block rounded bg-neutral-800 px-2 py-0.5 font-mono text-xs text-neutral-300'
                                                    }
                                                >
                                                    {key.identifier}
                                                </code>
                                            </CopyOnClick>
                                        </div>
                                        <button
                                            className={'p-2 text-sm'}
                                            title={'Delete this key'}
                                            onClick={() => setDeleteIdentifier(key.identifier)}
                                        >
                                            <FontAwesomeIcon
                                                icon={faTrashAlt}
                                                className={
                                                    'text-neutral-400 hover:text-red-400 transition-colors duration-150'
                                                }
                                            />
                                        </button>
                                    </div>

                                    <div
                                        className={
                                            'mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-neutral-600 pt-3 text-xs text-neutral-500'
                                        }
                                    >
                                        <span>
                                            Created{' '}
                                            {key.createdAt ? format(key.createdAt, 'MMM do, yyyy') : 'at some point'}
                                        </span>
                                        <span>
                                            Last used{' '}
                                            {key.lastUsedAt
                                                ? formatDistanceToNow(key.lastUsedAt, { addSuffix: true })
                                                : 'never'}
                                        </span>
                                    </div>

                                    {/* Allowed IPs are stored and enforced but the old page
                                        never showed them, so a key locked to an address you
                                        no longer use just looked broken. */}
                                    {key.allowedIps.length > 0 && (
                                        <div className={'mt-2 flex flex-wrap items-center gap-2'}>
                                            <FontAwesomeIcon
                                                icon={faGlobe}
                                                className={'text-2xs text-neutral-500'}
                                                fixedWidth
                                            />
                                            {key.allowedIps.map((ip) => (
                                                <code
                                                    key={ip}
                                                    className={
                                                        'rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-2xs text-neutral-400'
                                                    }
                                                >
                                                    {ip}
                                                </code>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </PageContentBlock>
    );
};
