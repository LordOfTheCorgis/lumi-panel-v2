import React, { forwardRef } from 'react';
import { Form } from 'formik';
import styled, { keyframes } from 'styled-components/macro';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import FlashMessageRender from '@/components/FlashMessageRender';
import Logo from '@/assets/images/logo.png';
import tw from 'twin.macro';

type Props = React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement> & {
    title?: string;
};

/**
 * Shared styling for the secondary links under each auth card ("Forgot
 * password?", "Return to Login"). Exported so all four screens stay identical.
 */
export const AuthLinkStyle =
    'text-sm text-neutral-400 no-underline cursor-pointer transition-colors duration-150 hover:text-lumi-400';

const rise = keyframes`
    from { opacity: 0; transform: translateY(20px) scale(0.985); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
`;

// Drives the highlight that travels around the card's border.
const orbit = keyframes`
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to   { transform: translate(-50%, -50%) rotate(360deg); }
`;

const Stage = styled.div`
    ${tw`w-full max-w-md`};
    animation: ${rise} 620ms cubic-bezier(0.22, 1, 0.36, 1) both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

/**
 * The border is drawn as a 1px band of background behind an inset surface,
 * rather than with `border`. That lets a rotating conic gradient sit in the
 * band and read as a highlight orbiting all four sides, which a gradient on a
 * real border cannot do.
 */
const Card = styled.div`
    ${tw`relative overflow-hidden rounded-2xl shadow-2xl`};
    padding: 1px;
    background-color: #2b2b2b;
    isolation: isolate;

    &::before {
        content: '';
        ${tw`absolute left-1/2 top-1/2`};
        width: 200%;
        aspect-ratio: 1 / 1;
        background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 250deg,
            rgba(237, 94, 94, 0.12) 285deg,
            rgba(237, 94, 94, 0.9) 330deg,
            #f18383 348deg,
            rgba(237, 94, 94, 0.12) 356deg,
            transparent 360deg
        );
        animation: ${orbit} 6s linear infinite;
    }

    @media (prefers-reduced-motion: reduce) {
        &::before {
            animation: none;
            opacity: 0;
        }
    }
`;

/**
 * Sits on top of the border band, leaving only the 1px ring exposed. This must
 * stay fully opaque: any transparency lets the rotating gradient behind it show
 * through the middle of the card as a sweeping wedge.
 */
const Surface = styled.div`
    ${tw`relative rounded-2xl p-6 sm:p-8`};
    z-index: 1;
    background-color: #131313;
`;

// Staggers the card's contents in behind the card itself.
const Reveal = styled.div<{ $delay: number }>`
    animation: ${fadeUp} 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: ${(props) => props.$delay}ms;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

const Mark = styled.img`
    ${tw`mx-auto h-16 w-16 select-none`};
`;

export default forwardRef<HTMLFormElement, Props>(({ title, children, ...props }, ref) => {
    const name = useStoreState((state: ApplicationStore) => state.settings.data!.name);

    return (
        <Stage>
            <FlashMessageRender css={tw`mb-4`} />

            <Form {...props} ref={ref}>
                <Card>
                    <Surface>
                        <Reveal $delay={120}>
                            <div css={tw`text-center`}>
                                <Mark src={Logo} alt={name} draggable={false} />
                                <h1 css={tw`mt-4 font-header text-2xl font-semibold tracking-tight text-white`}>
                                    {name}
                                </h1>
                                {title && <p css={tw`mt-1 text-sm text-neutral-400`}>{title}</p>}
                            </div>
                        </Reveal>

                        <div css={tw`my-6 h-px bg-neutral-600`} />

                        <Reveal $delay={220}>{children}</Reveal>
                    </Surface>
                </Card>
            </Form>

            <Reveal $delay={320}>
                <p css={tw`mt-8 text-center text-xs text-neutral-500`}>
                    &copy; 2025 - {new Date().getFullYear()} Lumix Solutions
                    <span css={tw`mx-2`}>&middot;</span>
                    powered by{' '}
                    <a
                        rel={'noopener nofollow noreferrer'}
                        href={'https://pterodactyl.io'}
                        target={'_blank'}
                        css={tw`no-underline text-neutral-500 hover:text-neutral-300 transition-colors duration-150`}
                    >
                        Pterodactyl
                    </a>
                </p>
            </Reveal>
        </Stage>
    );
});
