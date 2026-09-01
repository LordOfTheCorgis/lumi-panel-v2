import React, { useState } from 'react';
import { Dialog } from '@/components/elements/dialog';
import { Button } from '@/components/elements/button/index';
import Input from '@/components/elements/Input';

interface Props {
    // The destination, or null when nothing is pending. Doubles as the open flag
    // so the caller doesn't have to juggle two pieces of state.
    href: string | null;
    onClose: () => void;
    onContinue: (remember: boolean) => void;
}

const hostnameOf = (href: string): string => {
    try {
        return new URL(href, window.location.origin).hostname;
    } catch (e) {
        // Shouldn't happen with hardcoded links, but a busted href is no reason
        // to blow up the whole sidebar.
        return href;
    }
};

/**
 * Leaving-site interstitial. Shown before a link carries someone off the panel,
 * with the usual "don't show this again" escape hatch so it only ever annoys a
 * person once.
 */
const ExternalRedirectDialog = ({ href, onClose, onContinue }: Props) => {
    const [remember, setRemember] = useState(false);

    const close = () => {
        setRemember(false);
        onClose();
    };

    return (
        <Dialog open={href !== null} onClose={close} title={"You're leaving the panel"}>
            <Dialog.Icon type={'info'} position={'title'} />
            <p className={'mt-4 text-sm text-neutral-300'}>
                <span className={'font-medium text-neutral-100'}>{href ? hostnameOf(href) : ''}</span> is a separate
                site with its own account and session. It opens in a new tab, so the panel stays put in this one.
            </p>
            <label className={'mt-4 flex items-center gap-2.5 cursor-pointer text-sm text-neutral-300'}>
                <Input type={'checkbox'} checked={remember} onChange={(e) => setRemember(e.currentTarget.checked)} />
                Don&apos;t warn me about external links again
            </label>
            <Dialog.Footer>
                <Button.Text onClick={close}>Cancel</Button.Text>
                <Button onClick={() => onContinue(remember)}>Continue</Button>
            </Dialog.Footer>
        </Dialog>
    );
};

export default ExternalRedirectDialog;
