import React, { useEffect, useState } from 'react';
import { Server } from '@/api/server/getServer';
import getServers from '@/api/getServers';
import ServerRow, { ServerListView } from '@/components/dashboard/ServerRow';
import Spinner from '@/components/elements/Spinner';
import PageContentBlock from '@/components/elements/PageContentBlock';
import useFlash from '@/plugins/useFlash';
import { useStoreState } from 'easy-peasy';
import { usePersistedState } from '@/plugins/usePersistedState';
import Switch from '@/components/elements/Switch';
import tw from 'twin.macro';
import useSWR from 'swr';
import { PaginatedResult } from '@/api/http';
import Pagination from '@/components/elements/Pagination';
import PageHeader from '@/components/elements/PageHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faServer, faThLarge } from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useLocation } from 'react-router-dom';

const ViewButton = ({
    icon,
    label,
    active,
    onClick,
}: {
    icon: IconDefinition;
    label: string;
    active: boolean;
    onClick: () => void;
}) => (
    <button
        type={'button'}
        onClick={onClick}
        title={label}
        aria-label={label}
        aria-pressed={active}
        css={[
            tw`rounded px-2.5 py-1.5 text-sm transition-colors duration-150`,
            active ? tw`bg-neutral-600 text-neutral-50` : tw`text-neutral-400 hover:text-neutral-100`,
        ]}
    >
        <FontAwesomeIcon icon={icon} fixedWidth />
    </button>
);

export default () => {
    const { search } = useLocation();
    const defaultPage = Number(new URLSearchParams(search).get('page') || '1');

    const [page, setPage] = useState(!isNaN(defaultPage) && defaultPage > 0 ? defaultPage : 1);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const uuid = useStoreState((state) => state.user.data!.uuid);
    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const [showOnlyAdmin, setShowOnlyAdmin] = usePersistedState(`${uuid}:show_all_servers`, false);
    const [view, setView] = usePersistedState<ServerListView>(`${uuid}:server_list_view`, 'list');

    const { data: servers, error } = useSWR<PaginatedResult<Server>>(
        ['/api/client/servers', showOnlyAdmin && rootAdmin, page],
        () => getServers({ page, type: showOnlyAdmin && rootAdmin ? 'admin' : undefined })
    );

    useEffect(() => {
        setPage(1);
    }, [showOnlyAdmin]);

    useEffect(() => {
        if (!servers) return;
        if (servers.pagination.currentPage > 1 && !servers.items.length) {
            setPage(1);
        }
    }, [servers?.pagination.currentPage]);

    useEffect(() => {
        // Don't use react-router to handle changing this part of the URL, otherwise it
        // triggers a needless re-render. We just want to track this in the URL incase the
        // user refreshes the page.
        window.history.replaceState(null, document.title, `/${page <= 1 ? '' : `?page=${page}`}`);
    }, [page]);

    useEffect(() => {
        if (error) clearAndAddHttpError({ key: 'dashboard', error });
        if (!error) clearFlashes('dashboard');
    }, [error]);

    return (
        <PageContentBlock title={'Dashboard'} showFlashKey={'dashboard'}>
            <PageHeader
                title={showOnlyAdmin ? 'All Servers' : 'Your Servers'}
                description={
                    servers
                        ? `${servers.pagination.total} server${servers.pagination.total === 1 ? '' : 's'} available`
                        : 'Loading servers…'
                }
            >
                {rootAdmin && (
                    <label css={tw`flex items-center gap-3 cursor-pointer select-none`}>
                        <span css={tw`text-sm text-neutral-400`}>Show all servers</span>
                        <Switch
                            name={'show_all_servers'}
                            defaultChecked={showOnlyAdmin}
                            onChange={() => setShowOnlyAdmin((s) => !s)}
                        />
                    </label>
                )}
                <div
                    css={tw`flex items-center rounded-md border border-neutral-600 bg-neutral-800 p-0.5`}
                    role={'group'}
                    aria-label={'Server layout'}
                >
                    <ViewButton
                        icon={faList}
                        label={'List view'}
                        active={view === 'list'}
                        onClick={() => setView('list')}
                    />
                    <ViewButton
                        icon={faThLarge}
                        label={'Grid view'}
                        active={view === 'grid'}
                        onClick={() => setView('grid')}
                    />
                </div>
            </PageHeader>
            {!servers ? (
                <Spinner centered size={'large'} />
            ) : (
                <Pagination data={servers} onPageSelect={setPage}>
                    {({ items }) =>
                        items.length > 0 ? (
                            <div
                                css={
                                    view === 'grid'
                                        ? tw`grid gap-3 sm:grid-cols-2 xl:grid-cols-3`
                                        : tw`flex flex-col gap-3`
                                }
                            >
                                {items.map((server) => (
                                    <ServerRow key={server.uuid} server={server} view={view} />
                                ))}
                            </div>
                        ) : (
                            <div
                                css={tw`rounded-lg border border-dashed border-neutral-600 px-6 py-16 text-center bg-neutral-800 bg-opacity-40`}
                            >
                                <FontAwesomeIcon icon={faServer} css={tw`text-3xl text-neutral-500`} />
                                <p css={tw`mt-4 text-sm text-neutral-400`}>
                                    {showOnlyAdmin
                                        ? 'There are no other servers to display.'
                                        : 'There are no servers associated with your account.'}
                                </p>
                            </div>
                        )
                    }
                </Pagination>
            )}
        </PageContentBlock>
    );
};
