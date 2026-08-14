import http from '@/api/http';
import { Subdomain, rawDataToSubdomain } from '@/api/server/network/getServerSubdomain';

export default async (uuid: string, subdomain: string): Promise<Subdomain> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/network/subdomain`, { subdomain });

    return rawDataToSubdomain(data.attributes);
};
