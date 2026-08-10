import React, { useState } from 'react';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { Button } from '@/components/elements/button/index';
import { useDiscordLink, unlinkDiscord } from '@/api/account/discord';
import { useFlashKey } from '@/plugins/useFlash';

const AccountDiscord = () => {
    const { clearAndAddHttpError } = useFlashKey('account:discord');
    const { data, mutate } = useDiscordLink({ revalidateOnMount: true });
    const [busy, setBusy] = useState(false);

    // Nothing configured on the panel means there is no point showing a card
    // whose only button leads to an error.
    if (!data?.enabled) {
        return null;
    }

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
                {data.linked ? (
                    <>
                        <div className={'flex items-center gap-2'}>
                            <span className={'h-2 w-2 flex-shrink-0 rounded-full bg-green-500'} />
                            <span className={'text-sm font-medium text-green-400'}>Linked</span>
                        </div>
                        <p className={'mt-2 text-sm text-neutral-300'}>
                            Connected as <span className={'font-medium text-neutral-100'}>{data.username}</span>
                        </p>
                        {data.linkedAt && (
                            <p className={'mt-0.5 text-xs text-neutral-500'}>
                                Linked on {format(data.linkedAt, 'MMMM do, yyyy')}
                            </p>
                        )}
                        <p className={'mt-3 text-xs text-neutral-500'}>
                            You will get a DM if one of your servers is suspended, or if a large number of files are
                            deleted at once.
                        </p>
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
