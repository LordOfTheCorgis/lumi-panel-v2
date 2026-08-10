import useSWR, { ConfigInterface } from 'swr';
import { AxiosError } from 'axios';
import http from '@/api/http';
import { useUserSWRKey } from '@/plugins/useSWRKey';

export interface AccountDetails {
    uuid: string;
    username: string;
    email: string;
    admin: boolean;
    twoFactorEnabled: boolean;
    recoveryTokens: number;
    passwordChangedAt: Date | null;
    createdAt: Date | null;
}

const toAccountDetails = (data: any): AccountDetails => ({
    uuid: data.uuid,
    username: data.username,
    email: data.email,
    admin: data.admin,
    twoFactorEnabled: data.two_factor_enabled,
    recoveryTokens: data.recovery_tokens ?? 0,
    passwordChangedAt: data.password_changed_at ? new Date(data.password_changed_at) : null,
    createdAt: data.created_at ? new Date(data.created_at) : null,
});

export const useAccountDetails = (config?: ConfigInterface<AccountDetails, AxiosError>) => {
    const key = useUserSWRKey(['account', 'details']);

    return useSWR(
        key,
        async () => {
            const { data } = await http.get('/api/client/account');

            return toAccountDetails(data.attributes);
        },
        { revalidateOnFocus: false, ...(config || {}) }
    );
};
