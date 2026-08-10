import React, { useEffect, useState } from 'react';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import tw from 'twin.macro';
import { Button } from '@/components/elements/button/index';
import SetupTOTPDialog from '@/components/dashboard/forms/SetupTOTPDialog';
import RecoveryTokensDialog from '@/components/dashboard/forms/RecoveryTokensDialog';
import DisableTOTPDialog from '@/components/dashboard/forms/DisableTOTPDialog';
import { useFlashKey } from '@/plugins/useFlash';

export default ({ recoveryTokens }: { recoveryTokens?: number }) => {
    const [tokens, setTokens] = useState<string[]>([]);
    const [visible, setVisible] = useState<'enable' | 'disable' | null>(null);
    const isEnabled = useStoreState((state: ApplicationStore) => state.user.data!.useTotp);
    const { clearAndAddHttpError } = useFlashKey('account:two-step');

    useEffect(() => {
        return () => {
            clearAndAddHttpError();
        };
    }, [visible]);

    const onTokens = (tokens: string[]) => {
        setTokens(tokens);
        setVisible(null);
    };

    return (
        <div>
            <SetupTOTPDialog open={visible === 'enable'} onClose={() => setVisible(null)} onTokens={onTokens} />
            <RecoveryTokensDialog tokens={tokens} open={tokens.length > 0} onClose={() => setTokens([])} />
            <DisableTOTPDialog open={visible === 'disable'} onClose={() => setVisible(null)} />
            {/* A bare button told you nothing about whether you were actually
                protected. Lead with the state, in colour. */}
            <div css={tw`flex items-center gap-2`}>
                <span css={[tw`h-2 w-2 flex-shrink-0 rounded-full`, isEnabled ? tw`bg-green-500` : tw`bg-red-500`]} />
                <span css={[tw`text-sm font-medium`, isEnabled ? tw`text-green-400` : tw`text-red-400`]}>
                    {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
            </div>
            <p css={tw`mt-2 text-sm text-neutral-400`}>
                {isEnabled
                    ? 'Your account is protected by an authenticator app.'
                    : 'Anyone with your password can sign in. Turn this on to require a code from your phone as well.'}
            </p>
            {isEnabled && recoveryTokens !== undefined && (
                <p css={[tw`mt-2 text-xs`, recoveryTokens <= 2 ? tw`text-yellow-400` : tw`text-neutral-500`]}>
                    {recoveryTokens} recovery code{recoveryTokens === 1 ? '' : 's'} remaining
                    {recoveryTokens <= 2 && ' — regenerate these soon.'}
                </p>
            )}
            <div css={tw`mt-6`}>
                {isEnabled ? (
                    <Button.Danger onClick={() => setVisible('disable')}>Disable Two-Step</Button.Danger>
                ) : (
                    <Button onClick={() => setVisible('enable')}>Enable Two-Step</Button>
                )}
            </div>
        </div>
    );
};
