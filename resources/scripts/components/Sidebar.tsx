import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useLocation } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faBars, faCogs, faLayerGroup, faSignOutAlt, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import SearchContainer from '@/components/dashboard/search/SearchContainer';
import http from '@/api/http';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import Avatar from '@/components/Avatar';
import Logo from '@/assets/images/logo.png';
import {
    SidebarActiveStyle,
    SidebarIconStyle as iconSlot,
    SidebarLinkStyle,
} from '@/components/elements/SidebarStyles';

/**
 * The drawer is only ever open on small screens; from `md` up the sidebar is a
 * permanent column and this context is inert. Nested links consume it so that
 * following one on mobile closes the drawer behind them.
 */
const DrawerContext = createContext<{ close: () => void }>({ close: () => undefined });

interface LinkProps {
    to: string;
    icon?: IconDefinition;
    exact?: boolean;
    children: React.ReactNode;
}

const SidebarLink = ({ to, icon, exact = false, children }: LinkProps) => {
    const { close } = useContext(DrawerContext);

    return (
        <NavLink
            to={to}
            exact={exact}
            onClick={close}
            className={SidebarLinkStyle}
            activeClassName={SidebarActiveStyle}
        >
            <span className={iconSlot}>{icon && <FontAwesomeIcon icon={icon} fixedWidth />}</span>
            <span className={'truncate'}>{children}</span>
        </NavLink>
    );
};

interface ExternalLinkProps {
    href: string;
    icon?: IconDefinition;
    newTab?: boolean;
    children: React.ReactNode;
}

const SidebarExternalLink = ({ href, icon, newTab = false, children }: ExternalLinkProps) => {
    const { close } = useContext(DrawerContext);

    return (
        <a
            href={href}
            onClick={close}
            rel={'noreferrer'}
            {...(newTab ? { target: '_blank' } : {})}
            className={SidebarLinkStyle}
        >
            <span className={iconSlot}>{icon && <FontAwesomeIcon icon={icon} fixedWidth />}</span>
            <span className={'truncate'}>{children}</span>
        </a>
    );
};

const SidebarSection = ({ label, children }: { label?: string; children: React.ReactNode }) => (
    <div className={'px-3 py-2'}>
        {label && (
            <p className={'px-3 pb-2 text-2xs font-semibold uppercase tracking-widest text-neutral-500'}>{label}</p>
        )}
        <div className={'space-y-0.5'}>{children}</div>
    </div>
);

interface Props {
    // Contextual navigation (i.e. the current server's pages) rendered between
    // the global links and the account footer.
    children?: React.ReactNode;
}

const Sidebar = ({ children }: Props) => {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const name = useStoreState((state: ApplicationStore) => state.settings.data!.name);
    const username = useStoreState((state: ApplicationStore) => state.user.data!.username);
    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data!.rootAdmin);

    // A route change that isn't driven by a sidebar link (browser back, a link in
    // the page body) should still collapse the drawer.
    useEffect(() => setOpen(false), [location.pathname]);

    // The drawer overlays the page on mobile, so stop the body scrolling behind it.
    useEffect(() => {
        document.body.classList.toggle('overflow-hidden', open);

        return () => document.body.classList.remove('overflow-hidden');
    }, [open]);

    const onTriggerLogout = () => {
        setIsLoggingOut(true);
        http.post('/auth/logout').finally(() => {
            // @ts-expect-error this is valid
            window.location = '/';
        });
    };

    return (
        <DrawerContext.Provider value={{ close: () => setOpen(false) }}>
            <SpinnerOverlay visible={isLoggingOut} />

            {/* Mobile header. Hidden entirely once the sidebar becomes permanent. */}
            <div
                className={
                    'md:hidden sticky top-0 z-30 flex items-center h-14 px-4 bg-black gap-3 border-b border-neutral-800'
                }
            >
                <button
                    onClick={() => setOpen(true)}
                    aria-label={'Open navigation'}
                    className={'p-2 -ml-2 rounded-md text-neutral-300 hover:text-neutral-50 hover:bg-neutral-700'}
                >
                    <FontAwesomeIcon icon={faBars} />
                </button>
                <Link
                    to={'/'}
                    className={
                        'flex items-center gap-2 text-lg font-header font-medium no-underline text-neutral-100 truncate'
                    }
                >
                    <img src={Logo} alt={''} className={'h-7 w-7 shrink-0'} draggable={false} />
                    <span className={'truncate'}>{name}</span>
                </Link>
            </div>

            {/* Scrim. Only rendered while the drawer is open. */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    className={'md:hidden fixed inset-0 z-40 bg-black/60'}
                    aria-hidden={'true'}
                />
            )}

            <nav
                aria-label={'Main'}
                className={
                    'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-black border-r border-neutral-800 ' +
                    'transition-transform duration-200 ease-in-out md:translate-x-0 ' +
                    (open ? 'translate-x-0' : '-translate-x-full')
                }
            >
                <div className={'flex items-center h-14 px-5 shrink-0 border-b border-neutral-800'}>
                    <Link
                        to={'/'}
                        className={
                            'flex items-center gap-2.5 min-w-0 text-lg font-header font-medium no-underline text-neutral-100 hover:text-lumi-400 transition-colors duration-150'
                        }
                    >
                        <img src={Logo} alt={''} className={'h-8 w-8 shrink-0'} draggable={false} />
                        <span className={'truncate'}>{name}</span>
                    </Link>
                    <button
                        onClick={() => setOpen(false)}
                        aria-label={'Close navigation'}
                        className={
                            'md:hidden ml-auto p-2 -mr-2 rounded-md text-neutral-400 hover:text-neutral-50 hover:bg-neutral-700'
                        }
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div className={'flex flex-1 flex-col overflow-y-auto py-2'}>
                    <SidebarSection>
                        <SearchContainer />
                        <SidebarLink to={'/'} icon={faLayerGroup} exact>
                            Dashboard
                        </SidebarLink>
                    </SidebarSection>

                    {children}

                    {/* Only rendered for root admins. */}
                    {rootAdmin && (
                        <SidebarSection label={'Administration'}>
                            <SidebarExternalLink href={'/admin'} icon={faCogs}>
                                Admin Panel
                            </SidebarExternalLink>
                        </SidebarSection>
                    )}
                </div>

                <div className={'shrink-0 border-t border-neutral-800 p-3 space-y-0.5'}>
                    <NavLink
                        to={'/account'}
                        onClick={() => setOpen(false)}
                        className={SidebarLinkStyle}
                        activeClassName={SidebarActiveStyle}
                    >
                        <span className={`${iconSlot} rounded-full overflow-hidden`}>
                            <Avatar.User />
                        </span>
                        <span className={'truncate'}>{username}</span>
                    </NavLink>
                    <button onClick={onTriggerLogout} className={SidebarLinkStyle}>
                        <span className={iconSlot}>
                            <FontAwesomeIcon icon={faSignOutAlt} fixedWidth />
                        </span>
                        <span className={'truncate'}>Sign Out</span>
                    </button>
                </div>
            </nav>
        </DrawerContext.Provider>
    );
};

Sidebar.Link = SidebarLink;
Sidebar.ExternalLink = SidebarExternalLink;
Sidebar.Section = SidebarSection;

export default Sidebar;
