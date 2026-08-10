import useSWR, { ConfigInterface } from 'swr';
import { AxiosError } from 'axios';
import http from '@/api/http';
import { useUserSWRKey } from '@/plugins/useSWRKey';

export interface DiscordLink {
    // False when the panel has no Discord credentials configured, in which case
    // the whole card stays hidden rather than offering a button that can't work.
    enabled: boolean;
    linked: boolean;
    username: string | null;
    linkedAt: Date | null;
}

export const useDiscordLink = (config?: ConfigInterface<DiscordLink, AxiosError>) => {
    const key = useUserSWRKey(['account', 'discord']);

    return useSWR(
        key,
        async (): Promise<DiscordLink> => {
            const { data } = await http.get('/api/client/account/discord');

            return {
                enabled: data.enabled,
                linked: data.linked,
                username: data.username,
                linkedAt: data.linked_at ? new Date(data.linked_at) : null,
            };
        },
        { revalidateOnFocus: false, ...(config || {}) }
    );
};

export const unlinkDiscord = async (): Promise<void> => {
    await http.delete('/api/client/account/discord');
};
