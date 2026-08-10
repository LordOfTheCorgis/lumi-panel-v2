import React, { forwardRef } from 'react';
import { Form } from 'formik';
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

export default forwardRef<HTMLFormElement, Props>(({ title, children, ...props }, ref) => {
    const name = useStoreState((state: ApplicationStore) => state.settings.data!.name);

    return (
        <div css={tw`w-full max-w-md`}>
            <div css={tw`mb-8 text-center`}>
                <img src={Logo} alt={name} css={tw`mx-auto h-20 w-20 select-none`} draggable={false} />
                <h1 css={tw`mt-4 font-header text-2xl font-semibold tracking-tight text-white`}>{name}</h1>
                {title && <p css={tw`mt-1 text-sm text-neutral-400`}>{title}</p>}
            </div>

            <FlashMessageRender css={tw`mb-4`} />

            <Form {...props} ref={ref}>
                <div
                    css={tw`rounded-2xl border border-neutral-800 bg-neutral-900 bg-opacity-70 p-6 sm:p-8 shadow-2xl`}
                    style={{ backdropFilter: 'blur(12px)' }}
                >
                    {children}
                </div>
            </Form>

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
        </div>
    );
});
