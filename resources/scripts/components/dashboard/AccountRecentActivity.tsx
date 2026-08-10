import React from 'react';
import { Link } from 'react-router-dom';
import { useActivityLogs } from '@/api/account/activity';
import ActivityLogEntry from '@/components/elements/activity/ActivityLogEntry';
import Spinner from '@/components/elements/Spinner';

/**
 * Last few things that happened on this account. Arguably the most useful thing
 * on the page - it's how someone notices a login they don't recognise - and it
 * was previously hidden behind a separate sidebar link.
 */
const AccountRecentActivity = () => {
    const { data, isValidating } = useActivityLogs(
        { page: 1, sorts: { timestamp: -1 } },
        { revalidateOnMount: true, revalidateOnFocus: false }
    );

    const entries = (data?.items ?? []).slice(0, 5);

    return (
        <div className={'rounded-lg border border-neutral-600 bg-neutral-700 overflow-hidden'}>
            <div className={'flex items-center justify-between border-b border-neutral-600 bg-neutral-800 px-4 py-3'}>
                <p className={'text-sm font-medium text-neutral-100'}>Recent Activity</p>
                <Link
                    to={'/account/activity'}
                    className={'text-xs text-neutral-400 no-underline hover:text-lumi-400 transition-colors'}
                >
                    View all
                </Link>
            </div>
            <div className={'p-2'}>
                {!data && isValidating ? (
                    <div className={'py-6'}>
                        <Spinner size={'small'} centered />
                    </div>
                ) : entries.length === 0 ? (
                    <p className={'px-2 py-6 text-center text-sm text-neutral-500'}>No account activity yet.</p>
                ) : (
                    entries.map((activity) => <ActivityLogEntry key={activity.id} activity={activity} />)
                )}
            </div>
        </div>
    );
};

export default AccountRecentActivity;
