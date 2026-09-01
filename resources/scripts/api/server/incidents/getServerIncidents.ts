import http, { getPaginationSet, PaginatedResult } from '@/api/http';

export type IncidentCause =
    | 'out_of_memory'
    | 'port_conflict'
    | 'java_version'
    | 'missing_jar'
    | 'eula'
    | 'bad_resource'
    | 'startup_failure'
    | 'unknown';

export interface Incident {
    uuid: string;
    cause: IncidentCause;
    summary: string;
    logTail: string | null;
    // A boot loop is one report with a count on it rather than forty reports.
    occurrences: number;
    occurredAt: Date;
    acknowledgedAt: Date | null;
    exitCode: number | null;
    // Whether wings brought it back up on its own, which decides whether the
    // report reads as history or as something needing attention right now.
    restarted: boolean;
    uptimeSeconds: number | null;
    memoryBytes: number | null;
    memoryLimitBytes: number | null;
}

export interface IncidentsResponse extends PaginatedResult<Incident> {
    unacknowledged: number;
}

export const rawDataToIncident = (data: Record<string, any>): Incident => ({
    uuid: data.uuid,
    cause: data.cause,
    summary: data.summary,
    logTail: data.log_tail ?? null,
    occurrences: data.occurrences ?? 1,
    occurredAt: new Date(data.occurred_at),
    acknowledgedAt: data.acknowledged_at ? new Date(data.acknowledged_at) : null,
    exitCode: data.exit_code ?? null,
    restarted: Boolean(data.restarted),
    uptimeSeconds: data.uptime_seconds ?? null,
    memoryBytes: data.memory_bytes ?? null,
    memoryLimitBytes: data.memory_limit_bytes ?? null,
});

export default async (uuid: string, page = 1): Promise<IncidentsResponse> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/incidents`, { params: { page } });

    return {
        items: (data.data || []).map((item: any) => rawDataToIncident(item.attributes)),
        pagination: getPaginationSet(data.meta.pagination),
        unacknowledged: data.meta.unacknowledged ?? 0,
    };
};
