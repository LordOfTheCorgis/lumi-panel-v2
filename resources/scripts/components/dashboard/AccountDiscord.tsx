import React, { useState } from 'react';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { Button } from '@/components/elements/button/index';
import { useDiscordLink, unlinkDiscord } from '@/api/account/discord';
import { useFlashKey } from '@/plugins/useFlash';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';

const AccountDiscord = () => {
    const { clearAndAddHttpError } = useFlashKey('account:discord');
    const { data, error, mutate } = useDiscordLink({ revalidateOnMount: true });
    const [busy, setBusy] = useState(false);
    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data!.rootAdmin);

    // Only hidden while the first request is still in flight. Hiding it when
    // the integration is unconfigured seemed tidy, but it means an admin who
    // just built the feature loads the page, sees nothing, and assumes it is
    // broken. Show the card and say what's missing instead.
    if (!data && !error) {
        return null;
    }

    const unconfigured = !error && !data?.enabled && !data?.linked;

    const onUnlink = () => {
        setBusy(true);
        unlinkDiscord()
            .then(() => mutate())
            .catch((error) => clearAndAddHttpError(error))
            .then(() => setBusy(false));
    };

    return (
        <div className={'rounded-lg border border-neutral-600 bg-neutral-700 overflow-hidden'}>
            <div className={'flex items-center gap-2 border-b border-neutral-600 bg-neutral-800 px-4 py-3'}>
                <FontAwesomeIcon icon={faDiscord} className={'text-primary-400'} fixedWidth />
                <p className={'text-sm font-medium text-neutral-100'}>Discord</p>
            </div>

            <div className={'p-4'}>
                {error ? (
                    <>
                        {/* If the status endpoint is broken we have no idea whether
                            they're linked - but unlink is a different endpoint and
                            works regardless, so never hide it behind a failed read. */}
                        <p className={'text-sm text-yellow-400'}>Could not load your Discord status.</p>
                        <p className={'mt-2 text-xs text-neutral-500'}>
                            If your account is linked you can still disconnect it below.
                        </p>
                        <div className={'mt-4'}>
                            <Button.Danger size={Button.Sizes.Small} disabled={busy} onClick={onUnlink}>
                                Unlink Discord
                            </Button.Danger>
                        </div>
                    </>
                ) : unconfigured ? (
                    <>
                        <p className={'text-sm text-neutral-300'}>
                            Discord linking has not been set up on this panel yet.
                        </p>
                        {rootAdmin ? (
                            <p className={'mt-2 text-xs text-neutral-500'}>
                                Add a client ID, client secret and bot token under{' '}
                                <a
                                    href={'/admin/settings/discord'}
                                    className={'text-lumi-400 no-underline hover:underline'}
                                >
                                    Admin &rarr; Settings &rarr; Discord
                                </a>
                                , then reload this page.
                            </p>
                        ) : (
                            <p className={'mt-2 text-xs text-neutral-500'}>
                                Check back later — an administrator has to configure it first.
                            </p>
                        )}
                    </>
                ) : data?.linked ? (
                    <>
                        <div className={'flex items-center gap-2'}>
                            <span className={'h-2 w-2 flex-shrink-0 rounded-full bg-green-500'} />
                            <span className={'text-sm font-medium text-green-400'}>Linked</span>
                        </div>
                        <p className={'mt-2 text-sm text-neutral-300'}>
                            Connected as <span className={'font-medium text-neutral-100'}>{data?.username}</span>
                        </p>
                        {/* isNaN guard: date-fns throws a RangeError on an
                            invalid Date rather than returning something useless,
                            which takes the whole card down with it. */}
                        {data?.linkedAt && !isNaN(data.linkedAt.getTime()) && (
                            <p className={'mt-0.5 text-xs text-neutral-500'}>
                                Linked on {format(data.linkedAt, 'MMMM do, yyyy')}
                            </p>
                        )}
                        {data?.enabled ? (
                            <p className={'mt-3 text-xs text-neutral-500'}>
                                You will get a DM about security changes to your account, and about your servers being
                                suspended, finishing installation, backup results, or a large number of files being
                                deleted at once.
                            </p>
                        ) : (
                            <p className={'mt-3 text-xs text-yellow-400'}>
                                Discord notifications are currently turned off on this panel, so nothing will be sent.
                                You can still unlink below.
                            </p>
                        )}
                        <div className={'mt-4'}>
                            <Button.Danger size={Button.Sizes.Small} disabled={busy} onClick={onUnlink}>
                                Unlink Discord
                            </Button.Danger>
                        </div>
                    </>
                ) : (
                    <>
                        <p className={'text-sm text-neutral-300'}>
                            Link your Discord account to get alerts about your servers by direct message.
                        </p>
                        <p className={'mt-2 text-xs text-neutral-500'}>
                            We only read your Discord username and ID. Nothing is posted anywhere on your behalf.
                        </p>
                        <div className={'mt-4'}>
                            {/* A full page navigation, not a fetch: this is an OAuth
                                redirect and has to leave the SPA entirely. */}
                            <a
                                href={'/auth/discord/redirect'}
                                className={
                                    'inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white no-underline transition-colors duration-150 hover:bg-primary-500'
                                }
                            >
                                <FontAwesomeIcon icon={faDiscord} />
                                Link Discord
                            </a>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AccountDiscord;
