import http from '@/api/http';

export interface Subdomain {
    id: number;
    subdomain: string;
    domain: string;
    fqdn: string;
    target: string | null;
    port: number | null;
    ttl: number;
    createdAt: Date;
}

export interface SubdomainResponse {
    subdomain: Subdomain | null;
    // Config the form needs, sent alongside so the UI doesn't have to hardcode
    // the base domain or duplicate the length rules.
    enabled: boolean;
    domain: string;
    minLength: number;
    maxLength: number;
}

export const rawDataToSubdomain = (data: Record<string, any>): Subdomain => ({
    id: data.id,
    subdomain: data.subdomain,
    domain: data.domain,
    fqdn: data.fqdn,
    target: data.target ?? null,
    port: data.port ?? null,
    ttl: data.ttl,
    createdAt: new Date(data.created_at),
});

export default async (uuid: string): Promise<SubdomainResponse> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/network/subdomain`);

    return {
        subdomain: data.attributes ? rawDataToSubdomain(data.attributes) : null,
        enabled: data.meta.enabled,
        domain: data.meta.domain,
        minLength: data.meta.min_length,
        maxLength: data.meta.max_length,
    };
};
