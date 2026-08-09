import React, { useEffect, useRef, useState } from 'react';
import getPlayers, { FiveMPlayer } from '@/api/server/fivem/getPlayers';
import { ServerContext } from '@/state/server';
import { httpErrorToHuman } from '@/api/http';
import FlashMessageRender from '@/components/FlashMessageRender';
import Spinner from '@/components/elements/Spinner';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import GreyRowBox from '@/components/elements/GreyRowBox';
import useFlash from '@/plugins/useFlash';
import tw from 'twin.macro';

const POLL_INTERVAL_MS = 10000;

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { addError, clearFlashes } = useFlash();
    const [loading, setLoading] = useState(true);
    const [online, setOnline] = useState(false);
    const [players, setPlayers] = useState<FiveMPlayer[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval>>();

    useEffect(() => {
        clearFlashes('players');

        const load = () => {
            getPlayers(uuid)
                .then((response) => {
                    setOnline(response.online);
                    setPlayers(response.players);
                })
                .catch((error) => {
                    console.error(error);
                    addError({ key: 'players', message: httpErrorToHuman(error) });
                })
                .then(() => setLoading(false));
        };

        load();
        intervalRef.current = setInterval(load, POLL_INTERVAL_MS);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return (
        <ServerContentBlock title={'Players'}>
            <FlashMessageRender byKey={'players'} css={tw`mb-4`} />
            {loading ? (
                <Spinner size={'large'} centered />
            ) : !online ? (
                <p css={tw`text-center text-sm text-neutral-300`}>
                    Unable to reach the game server to retrieve the player list. It may be offline or still starting up.
                </p>
            ) : players.length === 0 ? (
                <p css={tw`text-center text-sm text-neutral-300`}>No players are currently connected.</p>
            ) : (
                <>
                    <p css={tw`text-sm text-neutral-300 mb-4`}>
                        {players.length} {players.length === 1 ? 'player is' : 'players are'} currently connected.
                    </p>
                    {players.map((player, index) => (
                        <GreyRowBox key={player.id} $hoverable={false} css={index > 0 ? tw`mt-1` : undefined}>
                            <div css={tw`flex-1 ml-2`}>
                                <p css={tw`text-sm`}>{player.name}</p>
                            </div>
                            <div css={tw`ml-8 text-center`}>
                                <p css={tw`text-sm`}>{player.ping}ms</p>
                                <p css={tw`mt-1 text-2xs text-neutral-500 uppercase select-none`}>Ping</p>
                            </div>
                        </GreyRowBox>
                    ))}
                </>
            )}
        </ServerContentBlock>
    );
};
