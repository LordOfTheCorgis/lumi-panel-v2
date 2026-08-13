import React from 'react';
import Can from '@/components/elements/Can';
import { Button } from '@/components/elements/button/index';
import { ServerContext } from '@/state/server';

// Whatever the user set wins, falling back to the egg default - matching how
// the startup page resolves these.
const valueOf = (variables: { envVariable: string; serverValue: string | null; defaultValue: string }[], key: string) =>
    variables.find((v) => v.envVariable === key)?.serverValue ||
    variables.find((v) => v.envVariable === key)?.defaultValue ||
    null;

interface Props {
    className?: string;
}

/**
 * Opens the server's txAdmin panel in a new tab.
 *
 * Hidden unless the egg actually has txAdmin switched on, and gated behind the
 * control.txadmin permission so a subuser without it never sees the link.
 */
export default ({ className }: Props) => {
    const variables = ServerContext.useStoreState((state) => state.server.data?.variables ?? []);
    const allocations = ServerContext.useStoreState((state) => state.server.data?.allocations ?? []);

    // The egg declares this with a boolean rule but stores "1"/"0", so accept
    // the obvious truthy spellings rather than only the exact default.
    const enabled = ['1', 'true', 'yes'].includes(
        String(valueOf(variables, 'TXADMIN_ENABLE') ?? '')
            .trim()
            .toLowerCase()
    );

    // Was TXADMIN_PORT, which no current FiveM egg defines.
    const port = valueOf(variables, 'TXHOST_TXA_PORT');

    const allocation = allocations.find((a) => a.isDefault) ?? allocations[0];
    const host = allocation?.alias || allocation?.ip;

    if (!enabled || !port || !host) {
        return null;
    }

    return (
        <Can action={'control.txadmin'}>
            <a href={`http://${host}:${port}`} target={'_blank'} rel={'noreferrer'} className={className}>
                <Button.Text className={'w-full'}>txAdmin</Button.Text>
            </a>
        </Can>
    );
};
