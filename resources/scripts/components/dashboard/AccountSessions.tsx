import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDesktop, faMobileAlt } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/elements/button/index';
import Spinner from '@/components/elements/Spinner';
import { useSessions, revokeOtherSessions, revokeSession } from '@/api/account/sessions';
import { useFlashKey } from '@/plugins/useFlash';

// Good enough to tell a phone from a laptop in a list. Not trying to build a
// user-agent parser here.
const describe = (agent: string | null): { label: string; mobile: boolean } => {
    if (!agent) return { label: 'Unknown device', mobile: false };

    const mobile = /mobile|android|iphone|ipad/i.test(agent);
    const browser = /edg\//i.test(agent)
        ? 'Edge'
        : /opr\//i.test(agent)
        ? 'Opera'
        : /firefox/i.test(agent)
        ? 'Firefox'
        : /chrome/i.test(agent)
        ? 'Chrome'
        : /safari/i.test(agent)
        ? 'Safari'
        : 'Browser';
    const os = /windows/i.test(agent)
        ? 'Windows'
        : /mac os x/i.test(agent)
        ? 'macOS'
        : /android/i.test(agent)
        ? 'Android'
        : /iphone|ipad/i.test(agent)
        ? 'iOS'
        : /linux/i.test(agent)
        ? 'Linux'
        : 'Unknown OS';

    return { label: `${browser} on ${os}`, mobile };
};

const AccountSessions = () => {
    const { clearAndAddHttpError } = useFlashKey('account:sessions');
    const { data, isValidating, mutate } = useSessions({ revalidateOnMount: true });
    const [busy, setBusy] = useState(false);

    const onRevoke = (id: string) => {
        setBusy(true);
        revokeSession(id)
            .then(() => mutate())
            .catch((error) => clearAndAddHttpError(error))
            .then(() => setBusy(false));
    };

    const onRevokeOthers = () => {
        setBusy(true);
        revokeOtherSessions()
            .then(() => mutate())
            .catch((error) => clearAndAddHttpError(error))
            .then(() => setBusy(false));
    };

    const others = (data?.items ?? []).filter((s) => !s.isCurrent).length;

    return (
        <div className={'rounded-lg border border-neutral-600 bg-neutral-700 overflow-hidden'}>
            <div className={'flex items-center justify-between border-b border-neutral-600 bg-neutral-800 px-4 py-3'}>
                <p className={'text-sm font-medium text-neutral-100'}>Active Sessions</p>
                {others > 0 && (
                    <Button.Danger size={Button.Sizes.Small} disabled={busy} onClick={onRevokeOthers}>
                        Sign out everywhere else
                    </Button.Danger>
                )}
            </div>

            {!data && isValidating ? (
                <div className={'py-8'}>
                    <Spinner size={'small'} centered />
                </div>
            ) : !data?.supported ? (
                <div className={'px-4 py-6 text-sm text-neutral-400'}>
                    <p>Session tracking is turned off on this panel.</p>
                    <p className={'mt-1 text-xs text-neutral-500'}>
                        To list and revoke devices, the panel needs{' '}
                        <code className={'font-mono text-neutral-400'}>SESSION_DRIVER=database</code> in its
                        environment. It currently stores sessions somewhere that cannot be enumerated.
                    </p>
                </div>
            ) : (
                <div className={'divide-y divide-neutral-600'}>
                    {data.items.map((session) => {
                        const { label, mobile } = describe(session.userAgent);

                        return (
                            <div key={session.id} className={'flex items-center gap-3 px-4 py-3'}>
                                <FontAwesomeIcon
                                    icon={mobile ? faMobileAlt : faDesktop}
                                    className={'text-neutral-500'}
                                    fixedWidth
                                />
                                <div className={'min-w-0 flex-1'}>
                                    <p className={'flex items-center gap-2 text-sm text-neutral-100'}>
                                        <span className={'truncate'}>{label}</span>
                                        {session.isCurrent && (
                                            <span
                                                className={
                                                    'rounded-full bg-green-500/15 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-green-400'
                                                }
                                            >
                                                This device
                                            </span>
                                        )}
                                    </p>
                                    <p className={'mt-0.5 truncate text-xs text-neutral-500'}>
                                        {session.ip ?? 'Unknown IP'} ·{' '}
                                        {formatDistanceToNow(session.lastActivity, { addSuffix: true })}
                                    </p>
                                </div>
                                {!session.isCurrent && (
                                    <Button.Text
                                        size={Button.Sizes.Small}
                                        disabled={busy}
                                        onClick={() => onRevoke(session.id)}
                                    >
                                        Revoke
                                    </Button.Text>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {data?.supported && (data.items?.length ?? 0) > 0 && (
                <p className={'border-t border-neutral-600 px-4 py-3 text-xs text-neutral-500'}>
                    Revoking signs that device out and clears &ldquo;remember me&rdquo; on all of your devices. Your
                    other sessions stay active but will ask for your password once they expire.
                </p>
            )}
        </div>
    );
};

export default AccountSessions;
