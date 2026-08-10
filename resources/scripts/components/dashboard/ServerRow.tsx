import React, { memo, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faEthernet, faHdd, faMemory, faMicrochip, faServer } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { Server } from '@/api/server/getServer';
import getServerResourceUsage, { ServerPowerState, ServerStats } from '@/api/server/getServerResourceUsage';
import { bytesToString, ip, mbToBytes } from '@/lib/formatters';
import tw from 'twin.macro';
import GreyRowBox from '@/components/elements/GreyRowBox';
import Spinner from '@/components/elements/Spinner';
import styled from 'styled-components/macro';
import isEqual from 'react-fast-compare';

export type ServerListView = 'list' | 'grid';

// Determines if the current value is in an alarm threshold so we can show it in red rather
// than the more faded default style.
const isAlarmState = (current: number, limit: number): boolean => limit > 0 && current / (limit * 1024 * 1024) >= 0.9;

const Icon = memo(
    styled(FontAwesomeIcon)<{ $alarm: boolean }>`
        ${(props) => (props.$alarm ? tw`text-red-400` : tw`text-neutral-500`)};
    `,
    isEqual
);

const IconDescription = styled.p<{ $alarm: boolean }>`
    ${tw`text-sm ml-2`};
    ${(props) => (props.$alarm ? tw`text-white` : tw`text-neutral-300`)};
`;

const statusColor = ($status: ServerPowerState | undefined) =>
    !$status || $status === 'offline' ? tw`bg-red-500` : $status === 'running' ? tw`bg-green-500` : tw`bg-yellow-500`;

const StatusIndicatorBox = styled(GreyRowBox)<{ $status: ServerPowerState | undefined }>`
    ${tw`grid grid-cols-12 gap-4 relative`};

    /* Accent down the leading edge, flush with the card rather than floating
       inside it as the old right-hand pill did. */
    & .status-bar {
        ${tw`absolute left-0 inset-y-0 w-1 transition-all duration-150`};
        ${({ $status }) => statusColor($status)};
    }

    & .status-dot {
        ${tw`h-2 w-2 flex-shrink-0 rounded-full`};
        ${({ $status }) => statusColor($status)};
    }
`;

const GridCard = styled(Link)<{ $status: ServerPowerState | undefined }>`
    ${tw`relative flex flex-col overflow-hidden rounded-lg border border-neutral-600 bg-neutral-700 p-4 no-underline text-neutral-200 transition-colors duration-150`};
    ${tw`hover:border-neutral-500 hover:bg-neutral-600`};

    /* On a card the accent reads better across the top than down the side. */
    & .status-bar {
        ${tw`absolute inset-x-0 top-0 h-1 transition-all duration-150`};
        ${({ $status }) => statusColor($status)};
    }

    & .status-dot {
        ${tw`h-2 w-2 flex-shrink-0 rounded-full`};
        ${({ $status }) => statusColor($status)};
    }

    /* GreyRowBox supplies this for the list layout; the grid card is its own
       element, so it needs its own. */
    & .icon {
        ${tw`h-12 w-12 flex-shrink-0 rounded-lg flex items-center justify-center bg-neutral-600 text-neutral-300`};
    }
`;

const Stat = ({ icon, value, limit, alarm }: { icon: IconProp; value: string; limit: string; alarm: boolean }) => (
    <div css={tw`flex-1 text-center`}>
        <div css={tw`flex justify-center`}>
            <Icon icon={icon} $alarm={alarm} />
            <IconDescription $alarm={alarm}>{value}</IconDescription>
        </div>
        <p css={tw`text-xs text-neutral-500 text-center mt-1`}>of {limit}</p>
    </div>
);

const Pill = ({ children, tone }: { children: React.ReactNode; tone: 'red' | 'yellow' | 'neutral' }) => (
    <span
        css={[
            tw`rounded px-2 py-1 text-xs`,
            tone === 'red'
                ? tw`bg-red-500 text-red-100`
                : tone === 'yellow'
                ? tw`bg-yellow-500 text-yellow-100`
                : tw`bg-neutral-600 text-neutral-100`,
        ]}
    >
        {children}
    </span>
);

type Timer = ReturnType<typeof setInterval>;

interface Props {
    server: Server;
    className?: string;
    view?: ServerListView;
}

export default ({ server, className, view = 'list' }: Props) => {
    const interval = useRef<Timer>(null) as React.MutableRefObject<Timer>;
    const [isSuspended, setIsSuspended] = useState(server.status === 'suspended');
    const [stats, setStats] = useState<ServerStats | null>(null);

    const getStats = () =>
        getServerResourceUsage(server.uuid)
            .then((data) => setStats(data))
            .catch((error) => console.error(error));

    useEffect(() => {
        setIsSuspended(stats?.isSuspended || server.status === 'suspended');
    }, [stats?.isSuspended, server.status]);

    useEffect(() => {
        // Don't waste a HTTP request if there is nothing important to show to the user because
        // the server is suspended.
        if (isSuspended || server.isNodeUnderMaintenance) return;

        getStats().then(() => {
            interval.current = setInterval(() => getStats(), 30000);
        });

        return () => {
            interval.current && clearInterval(interval.current);
        };
    }, [isSuspended, server.isNodeUnderMaintenance]);

    const alarms = { cpu: false, memory: false, disk: false };
    if (stats) {
        alarms.cpu = server.limits.cpu === 0 ? false : stats.cpuUsagePercent >= server.limits.cpu * 0.9;
        alarms.memory = isAlarmState(stats.memoryUsageInBytes, server.limits.memory);
        alarms.disk = server.limits.disk === 0 ? false : isAlarmState(stats.diskUsageInBytes, server.limits.disk);
    }

    const diskLimit = server.limits.disk !== 0 ? bytesToString(mbToBytes(server.limits.disk)) : 'Unlimited';
    const memoryLimit = server.limits.memory !== 0 ? bytesToString(mbToBytes(server.limits.memory)) : 'Unlimited';
    const cpuLimit = server.limits.cpu !== 0 ? server.limits.cpu + ' %' : 'Unlimited';

    const allocation = server.allocations
        .filter((alloc) => alloc.isDefault)
        .map((a) => `${a.alias || ip(a.ip)}:${a.port}`)
        .join('');

    // Shared across both layouts: either the resource readouts, or the reason
    // there are none to show.
    const unavailable = !stats || isSuspended || server.isNodeUnderMaintenance;

    const renderUnavailable = () =>
        isSuspended ? (
            <Pill tone={'red'}>{server.status === 'suspended' ? 'Suspended' : 'Connection Error'}</Pill>
        ) : server.isNodeUnderMaintenance ? (
            <Pill tone={'yellow'}>Under Maintenance</Pill>
        ) : server.isTransferring || server.status ? (
            <Pill tone={'neutral'}>
                {server.isTransferring
                    ? 'Transferring'
                    : server.status === 'installing'
                    ? 'Installing'
                    : server.status === 'restoring_backup'
                    ? 'Restoring Backup'
                    : 'Unavailable'}
            </Pill>
        ) : (
            <Spinner size={'small'} />
        );

    const identity = (
        <>
            <div css={tw`flex items-center gap-2`}>
                <span className={'status-dot'} />
                <p css={tw`text-base font-medium text-neutral-100 break-words`}>{server.name}</p>
            </div>
            {!!server.description && (
                <p css={tw`mt-0.5 text-sm text-neutral-400 break-words line-clamp-2`}>{server.description}</p>
            )}
        </>
    );

    if (view === 'grid') {
        return (
            <GridCard to={`/server/${server.id}`} className={className} $status={stats?.status}>
                <div className={'status-bar'} />
                <div css={tw`flex items-start`}>
                    <div className={'icon mr-3'}>
                        <FontAwesomeIcon icon={faServer} />
                    </div>
                    <div css={tw`min-w-0 flex-1`}>{identity}</div>
                </div>

                <div css={tw`mt-3 flex items-center text-sm text-neutral-400`}>
                    <FontAwesomeIcon icon={faEthernet} css={tw`text-neutral-500`} fixedWidth />
                    <span css={tw`ml-2 truncate`}>{allocation || 'No allocation'}</span>
                </div>

                <div css={tw`mt-4 pt-4 border-t border-neutral-600 flex items-baseline justify-center`}>
                    {unavailable ? (
                        renderUnavailable()
                    ) : (
                        <>
                            <Stat
                                icon={faMicrochip}
                                value={`${stats.cpuUsagePercent.toFixed(2)} %`}
                                limit={cpuLimit}
                                alarm={alarms.cpu}
                            />
                            <Stat
                                icon={faMemory}
                                value={bytesToString(stats.memoryUsageInBytes)}
                                limit={memoryLimit}
                                alarm={alarms.memory}
                            />
                            <Stat
                                icon={faHdd}
                                value={bytesToString(stats.diskUsageInBytes)}
                                limit={diskLimit}
                                alarm={alarms.disk}
                            />
                        </>
                    )}
                </div>
            </GridCard>
        );
    }

    return (
        <StatusIndicatorBox as={Link} to={`/server/${server.id}`} className={className} $status={stats?.status}>
            <div css={tw`flex items-center col-span-12 sm:col-span-5 lg:col-span-6`}>
                <div className={'icon mr-4'}>
                    <FontAwesomeIcon icon={faServer} />
                </div>
                <div css={tw`min-w-0`}>{identity}</div>
            </div>
            <div css={tw`flex-1 ml-4 lg:block lg:col-span-2 hidden`}>
                <div css={tw`flex justify-center`}>
                    <FontAwesomeIcon icon={faEthernet} css={tw`text-neutral-500`} />
                    <p css={tw`text-sm text-neutral-400 ml-2`}>{allocation}</p>
                </div>
            </div>
            <div css={tw`hidden col-span-7 lg:col-span-4 sm:flex items-baseline justify-center`}>
                {unavailable ? (
                    <div css={tw`flex-1 text-center`}>{renderUnavailable()}</div>
                ) : (
                    <>
                        <Stat
                            icon={faMicrochip}
                            value={`${stats.cpuUsagePercent.toFixed(2)} %`}
                            limit={cpuLimit}
                            alarm={alarms.cpu}
                        />
                        <Stat
                            icon={faMemory}
                            value={bytesToString(stats.memoryUsageInBytes)}
                            limit={memoryLimit}
                            alarm={alarms.memory}
                        />
                        <Stat
                            icon={faHdd}
                            value={bytesToString(stats.diskUsageInBytes)}
                            limit={diskLimit}
                            alarm={alarms.disk}
                        />
                    </>
                )}
            </div>
            <div className={'status-bar'} />
        </StatusIndicatorBox>
    );
};
