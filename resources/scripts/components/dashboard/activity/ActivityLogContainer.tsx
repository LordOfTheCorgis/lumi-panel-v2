import React, { useEffect, useState } from 'react';
import { ActivityLogFilters, useActivityLogs } from '@/api/account/activity';
import { useFlashKey } from '@/plugins/useFlash';
import PageContentBlock from '@/components/elements/PageContentBlock';
import PageHeader from '@/components/elements/PageHeader';
import FlashMessageRender from '@/components/FlashMessageRender';
import { Link } from 'react-router-dom';
import PaginationFooter from '@/components/elements/table/PaginationFooter';
import { DesktopComputerIcon, XIcon } from '@heroicons/react/solid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList } from '@fortawesome/free-solid-svg-icons';
import Spinner from '@/components/elements/Spinner';
import ActivityLogEntry from '@/components/elements/activity/ActivityLogEntry';
import Tooltip from '@/components/elements/tooltip/Tooltip';
import useLocationHash from '@/plugins/useLocationHash';

export default () => {
    const { hash } = useLocationHash();
    const { clearAndAddHttpError } = useFlashKey('account');
    const [filters, setFilters] = useState<ActivityLogFilters>({ page: 1, sorts: { timestamp: -1 } });
    const { data, isValidating, error } = useActivityLogs(filters, {
        revalidateOnMount: true,
        revalidateOnFocus: false,
    });

    useEffect(() => {
        setFilters((value) => ({ ...value, filters: { ip: hash.ip, event: hash.event } }));
    }, [hash]);

    useEffect(() => {
        clearAndAddHttpError(error);
    }, [error]);

    // pathTo() only merges keys in, so removing one means rebuilding the hash by
    // hand. Filters live in the URL so a filtered view stays shareable.
    const hashWithout = (key: string): string =>
        Object.keys(hash)
            .filter((k) => k !== key)
            .map((k) => `${k}=${hash[k]}`)
            .join('&');

    const active: { key: string; label: string; value: string }[] = [
        ...(filters.filters?.event ? [{ key: 'event', label: 'Event', value: String(filters.filters.event) }] : []),
        ...(filters.filters?.ip ? [{ key: 'ip', label: 'IP', value: String(filters.filters.ip) }] : []),
    ];

    return (
        <PageContentBlock title={'Account Activity Log'}>
            <PageHeader
                title={'Activity'}
                description={
                    data
                        ? `${data.pagination.total} recorded ${
                              data.pagination.total === 1 ? 'event' : 'events'
                          } on your account.`
                        : 'Everything that has happened on your account.'
                }
            />

            <FlashMessageRender byKey={'account'} className={'mb-4'} />

            {/* Filters were previously only reachable by clicking an event or IP
                inside an entry, with nothing on screen saying what was applied -
                just a bare "Clear Filters" button appearing out of nowhere. */}
            {active.length > 0 && (
                <div className={'mb-3 flex flex-wrap items-center gap-2'}>
                    <span className={'text-xs text-neutral-500'}>Filtered by</span>
                    {active.map((filter) => (
                        <Link
                            key={filter.key}
                            to={`#${hashWithout(filter.key)}`}
                            title={'Remove this filter'}
                            className={
                                'inline-flex items-center gap-1.5 rounded-full border border-neutral-600 bg-neutral-700 px-2.5 py-1 text-xs text-neutral-200 no-underline transition-colors duration-150 hover:border-neutral-400 hover:text-neutral-50'
                            }
                        >
                            <span className={'text-neutral-500'}>{filter.label}:</span>
                            <span className={'font-mono'}>{filter.value}</span>
                            <XIcon className={'h-3 w-3'} />
                        </Link>
                    ))}
                    {active.length > 1 && (
                        <Link to={'#'} className={'text-xs text-neutral-500 no-underline hover:text-neutral-200'}>
                            Clear all
                        </Link>
                    )}
                </div>
            )}

            {!data && isValidating ? (
                <Spinner centered />
            ) : !data?.items.length ? (
                <div
                    className={
                        'rounded-lg border border-dashed border-neutral-600 bg-neutral-800 bg-opacity-40 px-6 py-16 text-center'
                    }
                >
                    <FontAwesomeIcon icon={faClipboardList} className={'text-3xl text-neutral-500'} />
                    <p className={'mt-4 text-sm text-neutral-400'}>
                        {active.length > 0 ? 'No activity matches these filters.' : 'No activity recorded yet.'}
                    </p>
                </div>
            ) : (
                <div className={'overflow-hidden rounded-lg border border-neutral-600 bg-neutral-700'}>
                    {data.items.map((activity) => (
                        <ActivityLogEntry key={activity.id} activity={activity}>
                            {typeof activity.properties.useragent === 'string' && (
                                <Tooltip content={activity.properties.useragent} placement={'top'}>
                                    <span>
                                        <DesktopComputerIcon />
                                    </span>
                                </Tooltip>
                            )}
                        </ActivityLogEntry>
                    ))}
                </div>
            )}

            {data && data.items.length > 0 && (
                <PaginationFooter
                    pagination={data.pagination}
                    onPageSelect={(page) => setFilters((value) => ({ ...value, page }))}
                />
            )}
        </PageContentBlock>
    );
};
