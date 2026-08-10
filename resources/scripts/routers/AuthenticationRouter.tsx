import React from 'react';
import { Route, Switch, useRouteMatch } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components/macro';
import LoginContainer from '@/components/auth/LoginContainer';
import ForgotPasswordContainer from '@/components/auth/ForgotPasswordContainer';
import ResetPasswordContainer from '@/components/auth/ResetPasswordContainer';
import LoginCheckpointContainer from '@/components/auth/LoginCheckpointContainer';
import { NotFound } from '@/components/elements/ScreenBlock';
import { useHistory, useLocation } from 'react-router';
import tw from 'twin.macro';

/**
 * Slow, offset drifts for the two background lights. Different durations and
 * directions keep them from ever visibly syncing up, so the backdrop reads as
 * ambient rather than as a looping animation.
 */
const driftOne = keyframes`
    0%, 100% { transform: translate(-50%, 0) scale(1); opacity: 0.18; }
    50%      { transform: translate(-50%, 44px) scale(1.12); opacity: 0.30; }
`;

const driftTwo = keyframes`
    0%, 100% { transform: translate(0, 0) scale(1.06); opacity: 0.22; }
    50%      { transform: translate(-52px, -36px) scale(0.94); opacity: 0.14; }
`;

const glowBase = css`
    ${tw`pointer-events-none absolute rounded-full`};
    filter: blur(140px);
    will-change: transform, opacity;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

const GlowTop = styled.div`
    ${glowBase};
    top: -12rem;
    left: 50%;
    width: 40rem;
    height: 40rem;
    background-color: #ed5e5e;
    animation: ${driftOne} 16s ease-in-out infinite;
`;

const GlowCorner = styled.div`
    ${glowBase};
    bottom: -14rem;
    right: -8rem;
    width: 32rem;
    height: 32rem;
    background-color: #c81414;
    animation: ${driftTwo} 21s ease-in-out infinite;
`;

export default () => {
    const history = useHistory();
    const location = useLocation();
    const { path } = useRouteMatch();

    return (
        <div css={tw`relative min-h-screen w-full overflow-hidden`} style={{ backgroundColor: '#0a0a0a' }}>
            {/*
                Brand wash. Heavily blurred radials rather than a flat tint, so the
                red reads as light falling across a black room. Purely decorative.
            */}
            <div aria-hidden={'true'} css={tw`pointer-events-none absolute inset-0 overflow-hidden`}>
                <GlowTop />
                <GlowCorner />
            </div>

            <div css={tw`relative flex min-h-screen items-center justify-center px-4 py-12`}>
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
