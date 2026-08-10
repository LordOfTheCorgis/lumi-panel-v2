import React from 'react';
import { Route, Switch, useRouteMatch } from 'react-router-dom';
import LoginContainer from '@/components/auth/LoginContainer';
import ForgotPasswordContainer from '@/components/auth/ForgotPasswordContainer';
import ResetPasswordContainer from '@/components/auth/ResetPasswordContainer';
import LoginCheckpointContainer from '@/components/auth/LoginCheckpointContainer';
import { NotFound } from '@/components/elements/ScreenBlock';
import { useHistory, useLocation } from 'react-router';

export default () => {
    const history = useHistory();
    const location = useLocation();
    const { path } = useRouteMatch();

    return (
        <div className={'relative min-h-screen w-full overflow-hidden bg-[#0a0a0a]'}>
            {/*
                Brand wash. Two offset, heavily blurred radials rather than a flat
                tint, so the red reads as light falling across a black room instead
                of a coloured panel. Purely decorative.
            */}
            <div aria-hidden={'true'} className={'pointer-events-none absolute inset-0 overflow-hidden'}>
                <div
                    className={
                        'absolute -top-48 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-lumi-500 opacity-20 blur-[140px]'
                    }
                />
                <div
                    className={
                        'absolute -bottom-56 -right-32 h-[32rem] w-[32rem] rounded-full bg-lumi-700 opacity-20 blur-[140px]'
                    }
                />
            </div>

            <div className={'relative flex min-h-screen items-center justify-center px-4 py-12'}>
                <Switch location={location}>
                    <Route path={`${path}/login`} component={LoginContainer} exact />
                    <Route path={`${path}/login/checkpoint`} component={LoginCheckpointContainer} />
                    <Route path={`${path}/password`} component={ForgotPasswordContainer} exact />
                    <Route path={`${path}/password/reset/:token`} component={ResetPasswordContainer} />
                    <Route path={`${path}/checkpoint`} />
                    <Route path={'*'}>
                        <NotFound onBack={() => history.push('/auth/login')} />
                    </Route>
                </Switch>
            </div>
        </div>
    );
};
