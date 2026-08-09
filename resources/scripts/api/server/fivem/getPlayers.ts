import http from '@/api/http';

export interface FiveMPlayer {
    id: number;
    name: string;
    ping: number;
}

export interface FiveMPlayersResponse {
    online: boolean;
    players: FiveMPlayer[];
}

export default (uuid: string): Promise<FiveMPlayersResponse> => {
    return new Promise((resolve, reject) => {
        http.get(`/api/client/servers/${uuid}/players`)
            .then(({ data }) =>
                resolve({
                    online: data.online,
                    players: data.players,
                })
            )
            .catch(reject);
    });
};
