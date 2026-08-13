import TransferListener from '@/components/server/TransferListener';
import React, { useEffect, useMemo, useState } from 'react';
import { Route, Switch, useRouteMatch } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import AnnouncementBar from '@/components/AnnouncementBar';
import TransitionRouter from '@/TransitionRouter';
import WebsocketHandler from '@/components/server/WebsocketHandler';
import { ServerContext } from '@/state/server';
import Can from '@/components/elements/Can';
import Spinner from '@/components/elements/Spinner';
import { NotFound, ServerError } from '@/components/elements/ScreenBlock';
import { httpErrorToHuman } from '@/api/http';
import { useStoreState } from 'easy-peasy';
import InstallListener from '@/components/server/InstallListener';
import ErrorBoundary from '@/components/elements/ErrorBoundary';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { useLocation } from 'react-router';
import ConflictStateRenderer from '@/components/server/ConflictStateRenderer';
import PermissionRoute from '@/components/elements/PermissionRoute';
import routes from '@/routers/routes';

export default () => {
    const match = useRouteMatch<{ id: string }>();
    const location = useLocation();

    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const [error, setError] = useState('');

    const id = ServerContext.useStoreState((state) => state.server.data?.id);
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const serverName = ServerContext.useStoreState((state) => state.server.data?.name);
    const isFiveM = ServerContext.useStoreState(
        // Was TXADMIN_PORT, which no current FiveM egg defines - the variable is
        // TXHOST_TXA_PORT now, so this was always false and the Players tab never
        // appeared. FIVEM_LICENSE is on every FiveM egg whether or not txAdmin is
        // enabled, and matches what the startup page keys off.
        (state) => state.server.data?.variables.some((v) => v.envVariable === 'FIVEM_LICENSE') ?? false
    );
    const inConflictState = ServerContext.useStoreState((state) => state.server.inConflictState);
    const serverId = ServerContext.useStoreState((state) => state.server.data?.internalId);
    const getServer = ServerContext.useStoreActions((actions) => actions.server.getServer);
    const clearServerState = ServerContext.useStoreActions((actions) => actions.clearServerState);

    const to = (value: string, url = false) => {
        if (value === '/') {
            return url ? match.url : match.path;
        }
        return `${(url ? match.url : match.path).replace(/\/*$/, '')}/${value.replace(/^\/+/, '')}`;
    };

    useEffect(
        () => () => {
            clearServerState();
        },
        []
    );

    // Bucket the sidebar routes by their group, preserving the order the groups
    // first appear in the route table so the sidebar order is controlled there
    // rather than here.
    const groupedRoutes = useMemo(() => {
        const groups = new Map<string, typeof routes.server>();

        routes.server
            .filter((route) => !!route.name && (!route.requiresFiveM || isFiveM))
            .forEach((route) => {
                const key = route.group || 'Server';

                groups.set(key, [...(groups.get(key) || []), route]);
            });

        return Array.from(groups.entries());
    }, [isFiveM]);

    useEffect(() => {
        setError('');

        getServer(match.params.id).catch((error) => {
            console.error(error);
            setError(httpErrorToHuman(error));
        });

        return () => {
            clearServerState();
        };
    }, [match.params.id]);

    return (
        <div className={'md:pl-64'} key={'server-router'}>
            <Sidebar>
                {!!uuid && !!id && (
                    <>
                        {/* Which server you are inside. The groups below are
                            generic headings, so without this the sidebar gives
                            no clue which machine you are looking at. */}
                        <div className={'mx-3 mt-2 mb-1 rounded-md bg-neutral-800 px-3 py-2'}>
                            <p className={'text-2xs font-semibold uppercase tracking-widest text-neutral-500'}>
                                Managing
                            </p>
                            <p className={'truncate text-sm font-medium text-neutral-100'}>{serverName}</p>
                        </div>

                        {groupedRoutes.map(([group, groupRoutes]) => (
                            <Sidebar.Section key={group} label={group}>
                                {groupRoutes.map((route) =>
                                    route.permission ? (
                                        <Can key={route.path} action={route.permission} matchAny>
                                            <Sidebar.Link
                                                to={to(route.path, true)}
                                                icon={route.icon}
                                                exact={route.exact}
                                            >
                                                {route.name}
                                            </Sidebar.Link>
                                        </Can>
                                    ) : (
                                        <Sidebar.Link
                                            key={route.path}
                                            to={to(route.path, true)}
                                            icon={route.icon}
                                            exact={route.exact}
                                        >
                                            {route.name}
                                        </Sidebar.Link>
                                    )
                                )}
                            </Sidebar.Section>
                        ))}
                        {rootAdmin && (
                            <Sidebar.Section label={'Administration'}>
                                <Sidebar.ExternalLink
                                    href={`/admin/servers/view/${serverId}`}
                                    icon={faExternalLinkAlt}
                                    newTab
                                >
                                    Manage Server
                                </Sidebar.ExternalLink>
                            </Sidebar.Section>
                        )}
                    </>
                )}
            </Sidebar>
            <AnnouncementBar />
            {!uuid || !id ? (
                error ? (
                    <ServerError message={error} />
                ) : (
                    <Spinner size={'large'} centered />
                )
            ) : (
                <>
                    <InstallListener />
                    <TransferListener />
                    <WebsocketHandler />
                    {inConflictState && (!rootAdmin || (rootAdmin && !location.pathname.endsWith(`/server/${id}`))) ? (
                        <ConflictStateRenderer />
                    ) : (
                        <ErrorBoundary>
                            <TransitionRouter>
                                <Switch location={location}>
                                    {routes.server
                                        .filter((route) => !route.requiresFiveM || isFiveM)
                                        .map(({ path, permission, component: Component }) => (
                                            <PermissionRoute key={path} permission={permission} path={to(path)} exact>
                                                <Spinner.Suspense>
                                                    <Component />
                                                </Spinner.Suspense>
                                            </PermissionRoute>
                                        ))}
                                    <Route path={'*'} component={NotFound} />
                                </Switch>
                            </TransitionRouter>
                        </ErrorBoundary>
                    )}
                </>
            )}
        </div>
    );
};
