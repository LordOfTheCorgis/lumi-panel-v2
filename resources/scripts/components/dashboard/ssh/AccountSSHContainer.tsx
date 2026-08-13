import React, { useEffect } from 'react';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import FlashMessageRender from '@/components/FlashMessageRender';
import PageContentBlock from '@/components/elements/PageContentBlock';
import PageHeader from '@/components/elements/PageHeader';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import CopyOnClick from '@/components/elements/CopyOnClick';
import { useSSHKeys } from '@/api/account/ssh-keys';
import { useFlashKey } from '@/plugins/useFlash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTerminal } from '@fortawesome/free-solid-svg-icons';
import { format } from 'date-fns';
import CreateSSHKeyForm from '@/components/dashboard/ssh/CreateSSHKeyForm';
import DeleteSSHKeyButton from '@/components/dashboard/ssh/DeleteSSHKeyButton';

export default () => {
    const { clearAndAddHttpError } = useFlashKey('account');
    const { data, isValidating, error } = useSSHKeys({
        revalidateOnMount: true,
        revalidateOnFocus: false,
    });

    useEffect(() => {
        clearAndAddHttpError(error);
    }, [error]);

    return (
        <PageContentBlock title={'SSH Keys'}>
            <PageHeader
                title={'SSH Keys'}
                description={'Public keys you can use to connect over SFTP without typing a password.'}
            />

            <FlashMessageRender byKey={'account'} className={'mb-4'} />

            <div className={'grid gap-6 lg:grid-cols-3'}>
                <div className={'lg:col-span-1'}>
                    <TitledGreyBox title={'Add SSH Key'} icon={faPlus}>
                        <CreateSSHKeyForm />
                    </TitledGreyBox>
                </div>

                <div className={'lg:col-span-2 relative'}>
                    <SpinnerOverlay visible={!data && isValidating} />

                    <div className={'mb-3 flex items-center justify-between'}>
                        <p className={'text-sm font-medium text-neutral-100'}>Your Keys</p>
                        {data && <p className={'text-xs text-neutral-500'}>{data.length} total</p>}
                    </div>

                    {!data || !data.length ? (
                        <div
                            className={
                                'rounded-lg border border-dashed border-neutral-600 bg-neutral-800 bg-opacity-40 px-6 py-16 text-center'
                            }
                        >
                            <FontAwesomeIcon icon={faTerminal} className={'text-3xl text-neutral-500'} />
                            <p className={'mt-4 text-sm text-neutral-400'}>
                                {!data ? 'Loading…' : 'No SSH keys exist for this account.'}
                            </p>
                            {data && (
                                <p className={'mx-auto mt-2 max-w-sm text-xs text-neutral-500'}>
                                    Paste the contents of your public key file — usually{' '}
                                    <code className={'font-mono'}>~/.ssh/id_ed25519.pub</code> — never the private one.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className={'space-y-3'}>
                            {data.map((key) => (
                                <div
                                    key={key.fingerprint}
                                    className={
                                        'rounded-lg border border-neutral-600 bg-neutral-700 p-4 transition-colors duration-150 hover:border-neutral-500'
                                    }
                                >
                                    <div className={'flex items-start gap-3'}>
                                        <FontAwesomeIcon
                                            icon={faTerminal}
                                            className={'mt-1 text-neutral-500'}
                                            fixedWidth
                                        />
                                        <div className={'min-w-0 flex-1'}>
                                            <p className={'text-sm font-medium text-neutral-100 break-words'}>
                                                {key.name}
                                            </p>
                                            {/* Fingerprints are long and get compared against
                                                `ssh-keygen -lf` output, so make it copyable
                                                rather than something to squint at. */}
                                            <CopyOnClick text={`SHA256:${key.fingerprint}`}>
                                                <code
                                                    title={'Click to copy'}
                                                    className={
                                                        'mt-1 block truncate rounded bg-neutral-800 px-2 py-0.5 font-mono text-xs text-neutral-300'
                                                    }
                                                >
                                                    SHA256:{key.fingerprint}
                                                </code>
                                            </CopyOnClick>
                                        </div>
                                        <DeleteSSHKeyButton name={key.name} fingerprint={key.fingerprint} />
                                    </div>

                                    <div className={'mt-3 border-t border-neutral-600 pt-3 text-xs text-neutral-500'}>
                                        Added {format(key.createdAt, 'MMM do, yyyy')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </PageContentBlock>
    );
};
