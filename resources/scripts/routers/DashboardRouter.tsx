import React from 'react';
import { Route, Switch } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import AnnouncementBar from '@/components/AnnouncementBar';
import { faCreditCard, faHeartbeat } from '@fortawesome/free-solid-svg-icons';
import DashboardContainer from '@/components/dashboard/DashboardContainer';
import { NotFound } from '@/components/elements/ScreenBlock';
import TransitionRouter from '@/TransitionRouter';
import { useLocation } from 'react-router';
import Spinner from '@/components/elements/Spinner';
import routes from '@/routers/routes';

export default () => {
    const location = useLocation();

    return (
        <div className={'md:pl-64'}>
            <Sidebar>
                <Sidebar.Section label={'Account'}>
                    {routes.account
                        .filter((route) => !!route.name)
                        .map(({ path, name, icon, exact = false }) => (
                            <Sidebar.Link
                                key={path}
                                to={`/account/${path}`.replace('//', '/')}
                                icon={icon}
                                exact={exact}
                            >
                                {name}
                            </Sidebar.Link>
                        ))}
                </Sidebar.Section>
                {/* Only surfaced on the dashboard. Inside a server the sidebar is
                    given over to that server's own pages. */}
                <Sidebar.Section label={'Lumix Solutions'}>
                    <Sidebar.ExternalLink href={'https://billing.lumixsolutions.org/'} icon={faCreditCard} newTab>
                        Billing
                    </Sidebar.ExternalLink>
                    <Sidebar.ExternalLink href={'https://status.lumixsolutions.org'} icon={faHeartbeat} newTab>
                        Status
                    </Sidebar.ExternalLink>
                </Sidebar.Section>
            </Sidebar>
            <AnnouncementBar />
            <TransitionRouter>
                <React.Suspense fallback={<Spinner centered />}>
                    <Switch location={location}>
                        <Route path={'/'} exact>
                            <DashboardContainer />
                        </Route>
                        {routes.account.map(({ path, component: Component }) => (
                            <Route key={path} path={`/account/${path}`.replace('//', '/')} exact>
                                <Component />
                            </Route>
                        ))}
                        <Route path={'*'}>
                            <NotFound />
                        </Route>
                    </Switch>
                </React.Suspense>
            </TransitionRouter>
        </div>
    );
};
