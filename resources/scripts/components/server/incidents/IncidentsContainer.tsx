import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import FlashMessageRender from '@/components/FlashMessageRender';
import Spinner from '@/components/elements/Spinner';
import PaginationFooter from '@/components/elements/table/PaginationFooter';
import IncidentRow from '@/components/server/incidents/IncidentRow';
import { ServerContext } from '@/state/server';
import { useFlashKey } from '@/plugins/useFlash';
import getServerIncidents, { Incident, IncidentsResponse } from '@/api/server/incidents/getServerIncidents';
import acknowledgeServerIncident from '@/api/server/incidents/acknowledgeServerIncident';

const IncidentsContainer = () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearFlashes, clearAndAddHttpError } = useFlashKey('server:incidents');

    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [data, setData] = useState<IncidentsResponse | null>(null);

    useEffect(() => {
        clearFlashes();

        getServerIncidents(uuid, page)
            .then(setData)
            .catch((error) => clearAndAddHttpError(error))
            .then(() => setLoading(false));
    }, [uuid, page]);

    const acknowledge = (incident: Incident) => {
        // Marked locally first. The record on the server is the one that counts,
        // but making someone wait on a round trip to watch a border disappear is
        // silly.
        setData(
            (current) =>
                current && {
                    ...current,
                    unacknowledged: Math.max(0, current.unacknowledged - 1),
                    items: current.items.map((item) =>
                        item.uuid === incident.uuid ? { ...item, acknowledgedAt: new Date() } : item
                    ),
                }
        );

        acknowledgeServerIncident(uuid, incident.uuid).catch((error) => clearAndAddHttpError(error));
    };

    return (
        <ServerContentBlock title={'Crash Reports'}>
            <FlashMessageRender byKey={'server:incidents'} />
            {loading && !data ? (
                <Spinner centered />
            ) : !data?.items.length ? (
                <div className={'text-center py-10'}>
                    <p className={'text-sm text-neutral-300'}>Nothing has crashed.</p>
                    <p className={'text-xs text-neutral-500 mt-1'}>
                        If this server stops on its own, the report and the last of its console output land here.
                    </p>
                </div>
            ) : (
                <>
                    <p className={'text-xs text-neutral-400 mb-3'}>
                        Every time this server stopped without being asked to, and what it said on the way out.
                    </p>
                    {data.items.map((incident) => (
                        <IncidentRow key={incident.uuid} incident={incident} onAcknowledge={acknowledge} />
                    ))}
                </>
            )}
            {data && data.pagination.totalPages > 1 && (
                <PaginationFooter pagination={data.pagination} onPageSelect={setPage} />
            )}
        </ServerContentBlock>
    );
};

export default IncidentsContainer;
