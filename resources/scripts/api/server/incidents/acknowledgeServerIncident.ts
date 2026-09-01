import http from '@/api/http';

export default async (uuid: string, incident: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/incidents/${incident}/acknowledge`);
};
