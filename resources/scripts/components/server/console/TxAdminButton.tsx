import React from 'react';
import Can from '@/components/elements/Can';
import { Button } from '@/components/elements/button/index';
import { ServerContext } from '@/state/server';

const TXADMIN_ENV_VARIABLE = 'TXADMIN_PORT';

interface Props {
    className?: string;
}

export default ({ className }: Props) => {
    const variables = ServerContext.useStoreState((state) => state.server.data!.variables);
    const allocations = ServerContext.useStoreState((state) => state.server.data!.allocations);

    const portVariable = variables.find((v) => v.envVariable === TXADMIN_ENV_VARIABLE);

    if (!portVariable) {
        return null;
    }

    const port = portVariable.serverValue || portVariable.defaultValue;
    const defaultAllocation = allocations.find((a) => a.isDefault);

    if (!port || !defaultAllocation) {
        return null;
    }

    const txAdminUrl = `http://${defaultAllocation.ip}:${port}`;

    return (
        <Can action={'control.txadmin'}>
            <a href={txAdminUrl} target={'_blank'} rel={'noreferrer'} className={className}>
                <Button.Text className={'w-full'}>txAdmin</Button.Text>
            </a>
        </Can>
    );
};