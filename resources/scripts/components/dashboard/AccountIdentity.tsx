import React from 'react';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import { Actions, useStoreActions, useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import Avatar from '@/components/Avatar';
import { AccountDetails } from '@/api/account/getAccountDetails';
import { removeAvatar, uploadAvatar } from '@/api/account/avatar';
import { useFlashKey } from '@/plugins/useFlash';

/**
 * Header for the account page. The old page went straight into three forms and
 * never actually told you whose account you were looking at.
 */
const AccountIdentity = ({ details }: { details?: AccountDetails }) => {
    const user = useStoreState((state: ApplicationStore) => state.user.data!);
    const updateUserData = useStoreActions((actions: Actions<ApplicationStore>) => actions.user.updateUserData);
    const { clearAndAddHttpError } = useFlashKey('account:avatar');

    const input = React.useRef<HTMLInputElement>(null);
    const [copied, setCopied] = React.useState(false);
    const [busy, setBusy] = React.useState(false);

    const uuid = details?.uuid ?? user.uuid;
    const createdAt = details?.createdAt ?? user.createdAt;
    const avatarUrl = user.avatarUrl;

    const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.currentTarget.files?.[0];
        if (!file) return;

        setBusy(true);
        clearAndAddHttpError();

        uploadAvatar(file)
            .then((url) => updateUserData({ avatarUrl: url }))
            .catch((error) => clearAndAddHttpError(error))
            .then(() => {
                setBusy(false);
                // Without this, picking the same file twice in a row fires no
                // change event and looks like nothing happened.
                if (input.current) input.current.value = '';
            });
    };

    const onRemove = () => {
        setBusy(true);
        removeAvatar()
            .then(() => updateUserData({ avatarUrl: null }))
            .catch((error) => clearAndAddHttpError(error))
            .then(() => setBusy(false));
    };

    const onCopy = () => {
        navigator.clipboard?.writeText(uuid).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <div className={'rounded-lg border border-neutral-600 bg-neutral-700 p-5 sm:p-6'}>
            <div className={'flex flex-col sm:flex-row sm:items-center gap-5'}>
                <div className={'shrink-0'}>
                    <div className={'group relative h-16 w-16 overflow-hidden rounded-full'}>
                        <Avatar.User />
                        <button
                            onClick={() => input.current?.click()}
                            disabled={busy}
                            aria-label={'Change profile picture'}
                            className={
                                'absolute inset-0 flex items-center justify-center bg-black/60 text-neutral-100 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus:opacity-100'
                            }
                        >
                            <FontAwesomeIcon icon={faCamera} />
                        </button>
                    </div>
                    <input
                        ref={input}
                        type={'file'}
                        accept={'image/png,image/jpeg,image/webp'}
                        className={'hidden'}
                        onChange={onFileSelected}
                    />
                    {avatarUrl && (
                        <button
                            onClick={onRemove}
                            disabled={busy}
                            className={'mt-2 block w-16 text-center text-2xs text-neutral-500 hover:text-red-400'}
                        >
                            Remove
                        </button>
                    )}
                </div>
                <div className={'min-w-0 flex-1'}>
                    <div className={'flex flex-wrap items-center gap-2'}>
                        <h2 className={'font-header text-xl font-semibold text-neutral-50 truncate'}>
                            {user.username}
                        </h2>
                        {(details?.admin ?? user.rootAdmin) && (
                            <span
                                className={
                                    'rounded-full bg-lumi-500/15 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-lumi-400'
                                }
                            >
                                Admin
                            </span>
                        )}
                    </div>
                    <p className={'mt-0.5 truncate text-sm text-neutral-400'}>{details?.email ?? user.email}</p>
                    {createdAt && (
                        <p className={'mt-1 text-xs text-neutral-500'}>
                            Member since {format(createdAt, 'MMMM do, yyyy')}
                        </p>
                    )}
                </div>
                <div className={'shrink-0'}>
                    <p className={'text-2xs font-semibold uppercase tracking-widest text-neutral-500'}>Account ID</p>
                    <button
                        onClick={onCopy}
                        title={'Copy to clipboard'}
                        className={
                            'mt-1 flex items-center gap-2 rounded-md border border-neutral-600 bg-neutral-800 px-2.5 py-1.5 font-mono text-xs text-neutral-300 transition-colors duration-150 hover:border-neutral-500 hover:text-neutral-100'
                        }
                    >
                        <span className={'truncate'}>{uuid}</span>
                        <FontAwesomeIcon
                            icon={copied ? faCheck : faCopy}
                            className={copied ? 'text-green-400' : 'text-neutral-500'}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountIdentity;
