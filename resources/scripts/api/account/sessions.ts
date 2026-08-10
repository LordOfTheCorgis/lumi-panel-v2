import useSWR, { ConfigInterface } from 'swr';
import { AxiosError } from 'axios';
import http from '@/api/http';
import { useUserSWRKey } from '@/plugins/useSWRKey';

export interface AccountSession {
    id: string;
    isCurrent: boolean;
    ip: string | null;
    userAgent: string | null;
    lastActivity: Date;
}

export interface SessionResponse {
    // False when the panel's session driver isn't "database", in which case
    // nothing is recorded and there is nothing we can list.
    supported: boolean;
    items: AccountSession[];
}

const toSession = (data: any): AccountSession => ({
    id: data.id,
    isCurrent: data.is_current,
    ip: data.ip,
    userAgent: data.user_agent,
    lastActivity: new Date(data.last_activity),
});

export const useSessions = (config?: ConfigInterface<SessionResponse, AxiosError>) => {
    const key = useUserSWRKey(['account', 'sessions']);

    return useSWR(
        key,
        async (): Promise<SessionResponse> => {
            const { data } = await http.get('/api/client/account/sessions');

            return {
                supported: data.meta?.supported ?? false,
                items: (data.data || []).map((d: any) => toSession(d.attributes)),
            };
        },
        { revalidateOnFocus: false, ...(config || {}) }
    );
};

export const revokeSession = async (id: string): Promise<void> => {
    await http.delete(`/api/client/account/sessions/${id}`);
};

export const revokeOtherSessions = async (): Promise<void> => {
    await http.delete('/api/client/account/sessions');
};
