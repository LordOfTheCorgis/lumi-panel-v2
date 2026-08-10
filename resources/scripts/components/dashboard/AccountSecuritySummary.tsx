import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faKey, faShieldAlt, faTerminal, faLock } from '@fortawesome/free-solid-svg-icons';
import useSWR from 'swr';
import getApiKeys from '@/api/account/getApiKeys';
import { useSSHKeys } from '@/api/account/ssh-keys';
import { AccountDetails } from '@/api/account/getAccountDetails';
import { useUserSWRKey } from '@/plugins/useSWRKey';

type Tone = 'good' | 'bad' | 'neutral';

const toneClasses: Record<Tone, string> = {
    good: 'text-green-400',
    bad: 'text-red-400',
    neutral: 'text-neutral-200',
};

const Tile = ({
    icon,
    label,
    value,
    detail,
    tone = 'neutral',
    to,
}: {
    icon: IconDefinition;
    label: string;
    value: string;
    detail?: string;
    tone?: Tone;
    to?: string;
}) => {
    const body = (
        <>
            <div className={'flex items-center gap-2'}>
                <FontAwesomeIcon icon={icon} className={'text-neutral-500'} fixedWidth />
                <p className={'text-2xs font-semibold uppercase tracking-widest text-neutral-500'}>{label}</p>
            </div>
            <p className={`mt-2 text-lg font-semibold ${toneClasses[tone]}`}>{value}</p>
            {detail && <p className={'mt-0.5 text-xs text-neutral-500'}>{detail}</p>}
        </>
    );

    const shell =
        'block rounded-lg border border-neutral-600 bg-neutral-700 p-4 no-underline transition-colors duration-150';

    return to ? (
        <Link to={to} className={`${shell} hover:border-neutral-400 hover:bg-neutral-600`}>
            {body}
        </Link>
    ) : (
        <div className={shell}>{body}</div>
    );
};

/**
 * At-a-glance state of the account. Everything here was previously either buried
 * on another page or not shown at all.
 */
const AccountSecuritySummary = ({ details }: { details?: AccountDetails }) => {
    // These two lists are already fetched by their own pages; hitting them here
    // just warms the same SWR cache, so the counts are effectively free once the
    // user visits either screen.
    const apiKeysKey = useUserSWRKey(['account', 'api-keys']);
    const { data: apiKeys } = useSWR(apiKeysKey, getApiKeys, { revalidateOnFocus: false });
    const { data: sshKeys } = useSSHKeys({ revalidateOnMount: true, revalidateOnFocus: false });

    const twoFactor = details?.twoFactorEnabled;
    const recovery = details?.recoveryTokens ?? 0;

    return (
        <div className={'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'}>
            <Tile
                icon={faShieldAlt}
                label={'Two-Step'}
                value={twoFactor === undefined ? '—' : twoFactor ? 'Enabled' : 'Disabled'}
                detail={twoFactor ? `${recovery} recovery code${recovery === 1 ? '' : 's'} left` : 'Not protected'}
                tone={twoFactor === undefined ? 'neutral' : twoFactor ? 'good' : 'bad'}
            />
            <Tile
                icon={faLock}
                label={'Password'}
                value={details?.passwordChangedAt ? formatDistanceToNow(details.passwordChangedAt) + ' ago' : 'Unknown'}
                detail={details?.passwordChangedAt ? 'Last changed' : 'Never changed here'}
            />
            <Tile
                icon={faKey}
                label={'API Keys'}
                value={apiKeys === undefined ? '—' : String(apiKeys.length)}
                detail={'Manage credentials'}
                to={'/account/api'}
            />
            <Tile
                icon={faTerminal}
                label={'SSH Keys'}
                value={sshKeys === undefined ? '—' : String(sshKeys.length)}
                detail={'Manage keys'}
                to={'/account/ssh'}
            />
        </div>
    );
};

export default AccountSecuritySummary;
