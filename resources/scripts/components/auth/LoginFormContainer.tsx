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

const float = keyframes`
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
`;

// Travels the full width of the card. The highlight is 45% as wide as its
// parent, so 222% of its own width clears the far edge.
const sweep = keyframes`
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(222%); }
`;

const Stage = styled.div`
    ${tw`w-full max-w-md`};
    animation: ${rise} 620ms cubic-bezier(0.22, 1, 0.36, 1) both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

const Card = styled.div`
    ${tw`relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 bg-opacity-70 p-6 sm:p-8 shadow-2xl`};
    backdrop-filter: blur(12px);

    /* Static hairline along the top edge. */
    &::before {
        content: '';
        ${tw`absolute inset-x-0 top-0 h-px`};
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
    }

    /* Brand highlight that periodically travels along that hairline. */
    &::after {
        content: '';
        ${tw`absolute left-0 top-0 h-px`};
        width: 45%;
        background: linear-gradient(90deg, transparent, rgba(255, 76, 76, 0.9), transparent);
        animation: ${sweep} 5s cubic-bezier(0.4, 0, 0.2, 1) 1.4s infinite;
    }

    @media (prefers-reduced-motion: reduce) {
        &::after {
            animation: none;
            opacity: 0;
        }
    }
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
    animation: ${float} 6s ease-in-out infinite;
    filter: drop-shadow(0 0 20px rgba(255, 76, 76, 0.35));

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

export default forwardRef<HTMLFormElement, Props>(({ title, children, ...props }, ref) => {
    const name = useStoreState((state: ApplicationStore) => state.settings.data!.name);

    return (
        <Stage>
            <FlashMessageRender css={tw`mb-4`} />

            <Form {...props} ref={ref}>
                <Card>
                    <Reveal $delay={120}>
                        <div css={tw`text-center`}>
                            <Mark src={Logo} alt={name} draggable={false} />
                            <h1 css={tw`mt-4 font-header text-2xl font-semibold tracking-tight text-white`}>{name}</h1>
                            {title && <p css={tw`mt-1 text-sm text-neutral-400`}>{title}</p>}
                        </div>
                    </Reveal>

                    <div css={tw`my-6 h-px bg-neutral-800`} />

                    <Reveal $delay={220}>{children}</Reveal>
                </Card>
            </Form>

            <Reveal $delay={320}>
                <p css={tw`mt-8 text-center text-xs text-neutral-600`}>
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
