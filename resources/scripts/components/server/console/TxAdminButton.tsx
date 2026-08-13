import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { ServerContext } from '@/state/server';

// Whatever the user set wins, falling back to the egg default - matching how
// the startup page resolves these.
const valueOf = (variables: { envVariable: string; serverValue: string | null; defaultValue: string }[], key: string) =>
    variables.find((v) => v.envVariable === key)?.serverValue ??
    variables.find((v) => v.envVariable === key)?.defaultValue ??
    null;

/**
 * Opens the server's txAdmin panel. Renders nothing unless the egg has txAdmin
 * switched on, so it stays out of the way on every non-FiveM server.
 */
export default ({ className }: { className?: string }) => {
    const variables = ServerContext.useStoreState((state) => state.server.data?.variables ?? []);
    const allocations = ServerContext.useStoreState((state) => state.server.data?.allocations ?? []);

    const enabled = valueOf(variables, 'TXADMIN_ENABLE');
    const port = valueOf(variables, 'TXHOST_TXA_PORT');

    // The egg types this as a boolean rule but stores "1"/"0"; accept the
    // obvious truthy spellings rather than only the one the default uses.
    const isEnabled = ['1', 'true', 'yes'].includes(
        String(enabled ?? '')
            .trim()
            .toLowerCase()
    );

    const allocation = allocations.find((a) => a.isDefault) ?? allocations[0];
    const host = allocation?.alias || allocation?.ip;

    if (!isEnabled || !port || !host) {
        return null;
    }

    return (
        <a
            href={`http://${host}:${port}`}
            target={'_blank'}
            rel={'noreferrer'}
            title={'Open the txAdmin panel in a new tab'}
            className={`inline-flex items-center justify-center gap-2 rounded-md border border-neutral-600 bg-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100 no-underline transition-colors duration-150 hover:border-neutral-500 hover:bg-neutral-600 ${
                className ?? ''
            }`}
        >
            txAdmin
            <FontAwesomeIcon icon={faExternalLinkAlt} className={'text-xs'} />
        </a>
    );
};
