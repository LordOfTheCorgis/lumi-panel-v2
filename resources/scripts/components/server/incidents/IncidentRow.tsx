import React, { useState } from 'react';
import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { Incident, IncidentCause } from '@/api/server/incidents/getServerIncidents';
import { Button } from '@/components/elements/button/index';
import { bytesToString } from '@/lib/formatters';
import { formatDistanceToNowStrict } from 'date-fns';

// Colour carries meaning here rather than decoration: memory and resource
// problems are the customer's to fix, the rest are usually ours to look at.
const presentation: Record<IncidentCause, { label: string; className: string }> = {
    out_of_memory: { label: 'Out of memory', className: 'bg-red-500/15 text-red-300 ring-red-500/30' },
    port_conflict: { label: 'Port conflict', className: 'bg-yellow-500/15 text-yellow-200 ring-yellow-500/30' },
    java_version: { label: 'Java version', className: 'bg-yellow-500/15 text-yellow-200 ring-yellow-500/30' },
    missing_jar: { label: 'Missing file', className: 'bg-yellow-500/15 text-yellow-200 ring-yellow-500/30' },
    eula: { label: 'EULA', className: 'bg-yellow-500/15 text-yellow-200 ring-yellow-500/30' },
    bad_resource: { label: 'Bad resource', className: 'bg-orange-500/15 text-orange-200 ring-orange-500/30' },
    startup_failure: { label: 'Never started', className: 'bg-orange-500/15 text-orange-200 ring-orange-500/30' },
    unknown: { label: 'Unknown', className: 'bg-neutral-500/15 text-neutral-300 ring-neutral-500/30' },
};

const uptime = (seconds: number): string => {
    if (seconds < 90) return `${seconds}s`;
    if (seconds < 5400) return `${Math.round(seconds / 60)}m`;
    if (seconds < 172800) return `${Math.round(seconds / 3600)}h`;

    return `${Math.round(seconds / 86400)}d`;
};

interface Props {
    incident: Incident;
    onAcknowledge: (incident: Incident) => void;
}

const IncidentRow = ({ incident, onAcknowledge }: Props) => {
    const [open, setOpen] = useState(false);
    const cause = presentation[incident.cause] ?? presentation.unknown;

    return (
        <div
            className={classNames('rounded-md bg-gray-700 border-l-4 mb-2', {
                'border-red-500': !incident.acknowledgedAt,
                'border-transparent': !!incident.acknowledgedAt,
            })}
        >
            <div className={'p-4'}>
                <div className={'flex flex-wrap items-center gap-2 mb-2'}>
                    <span
                        className={classNames(
                            'px-2 py-0.5 rounded text-2xs font-semibold uppercase tracking-wide ring-1 ring-inset',
                            cause.className
                        )}
                    >
                        {cause.label}
                    </span>
                    {incident.occurrences > 1 && (
                        <span className={'px-2 py-0.5 rounded text-2xs font-semibold bg-gray-600 text-neutral-200'}>
                            {incident.occurrences}&times;
                        </span>
                    )}
                    <span className={'text-xs text-neutral-400'}>
                        {formatDistanceToNowStrict(incident.occurredAt, { addSuffix: true })}
                    </span>
                    {incident.restarted && <span className={'text-xs text-green-400'}>Restarted automatically</span>}
                </div>

                <p className={'text-sm text-neutral-100'}>{incident.summary}</p>

                <div className={'flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-neutral-400'}>
                    {incident.uptimeSeconds !== null && <span>Up for {uptime(incident.uptimeSeconds)}</span>}
                    {incident.memoryBytes !== null && incident.memoryLimitBytes ? (
                        <span>
                            Memory {bytesToString(incident.memoryBytes)} of {bytesToString(incident.memoryLimitBytes)}
                        </span>
                    ) : null}
                    {incident.exitCode !== null && <span>Exit code {incident.exitCode}</span>}
                </div>

                <div className={'flex items-center gap-3 mt-3'}>
                    {incident.logTail && (
                        <button
                            onClick={() => setOpen((value) => !value)}
                            className={'flex items-center gap-1.5 text-xs text-neutral-300 hover:text-neutral-50'}
                        >
                            <FontAwesomeIcon
                                icon={faChevronDown}
                                className={classNames('w-3 h-3 transition-transform duration-150', {
                                    'rotate-180': open,
                                })}
                            />
                            {open ? 'Hide' : 'Show'} the last of the console
                        </button>
                    )}
                    {!incident.acknowledgedAt && (
                        <Button.Text
                            size={Button.Sizes.Small}
                            className={'ml-auto'}
                            onClick={() => onAcknowledge(incident)}
                        >
                            Mark as read
                        </Button.Text>
                    )}
                </div>
            </div>

            {open && incident.logTail && (
                <pre
                    className={
                        'mx-4 mb-4 p-3 rounded bg-black text-xs font-mono text-neutral-300 overflow-x-auto whitespace-pre'
                    }
                >
                    {incident.logTail}
                </pre>
            )}
        </div>
    );
};

export default IncidentRow;
