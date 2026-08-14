import React, { useEffect, useState } from 'react';
import tw from 'twin.macro';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import Input from '@/components/elements/Input';
import { Button } from '@/components/elements/button/index';
import { Dialog } from '@/components/elements/dialog';
import Code from '@/components/elements/Code';
import CopyOnClick from '@/components/elements/CopyOnClick';
import Can from '@/components/elements/Can';
import Spinner from '@/components/elements/Spinner';
import { ServerContext } from '@/state/server';
import { useFlashKey } from '@/plugins/useFlash';
import getServerSubdomain, { Subdomain } from '@/api/server/network/getServerSubdomain';
import createServerSubdomain from '@/api/server/network/createServerSubdomain';
import deleteServerSubdomain from '@/api/server/network/deleteServerSubdomain';

const SubdomainBox = () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const primaryPort = ServerContext.useStoreState(
        (state) => state.server.data!.allocations.find((a) => a.isDefault)?.port
    );

    const { clearFlashes, clearAndAddHttpError } = useFlashKey('server:network');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [domain, setDomain] = useState('');
    const [bounds, setBounds] = useState({ min: 3, max: 32 });
    const [subdomain, setSubdomain] = useState<Subdomain | null>(null);
    const [value, setValue] = useState('');

    useEffect(() => {
        getServerSubdomain(uuid)
            .then((data) => {
                setEnabled(data.enabled);
                setDomain(data.domain);
                setSubdomain(data.subdomain);
                setBounds({ min: data.minLength, max: data.maxLength });
            })
            .catch((error) => clearAndAddHttpError(error))
            .then(() => setLoading(false));
    }, [uuid]);

    const submit = () => {
        clearFlashes();
        setSubmitting(true);

        createServerSubdomain(uuid, value)
            .then((created) => {
                setSubdomain(created);
                setValue('');
            })
            .catch((error) => clearAndAddHttpError(error))
            .then(() => setSubmitting(false));
    };

    const release = () => {
        clearFlashes();
        setSubmitting(true);

        deleteServerSubdomain(uuid)
            .then(() => setSubdomain(null))
            .catch((error) => clearAndAddHttpError(error))
            .then(() => setSubmitting(false));
    };

    // Nothing to show if the panel has no zone wired up. Better an absent card
    // than one that only ever errors.
    if (!loading && !enabled) {
        return null;
    }

    return (
        <TitledGreyBox title={'Subdomain'} icon={faGlobe} css={tw`mb-6`}>
            {loading ? (
                <Spinner size={'small'} centered />
            ) : subdomain ? (
                <>
                    <Dialog.Confirm
                        open={confirm}
                        onClose={() => setConfirm(false)}
                        title={'Release Subdomain'}
                        confirm={'Release'}
                        onConfirmed={release}
                    >
                        {subdomain.fqdn} will stop pointing at this server and the name becomes available for anyone
                        else to claim. Players using it will no longer be able to connect.
                    </Dialog.Confirm>
                    <div css={tw`sm:flex items-center justify-between`}>
                        <div css={tw`min-w-0`}>
                            <CopyOnClick text={primaryPort ? `${subdomain.fqdn}:${primaryPort}` : subdomain.fqdn}>
                                <Code dark className={'truncate'}>
                                    {primaryPort ? `${subdomain.fqdn}:${primaryPort}` : subdomain.fqdn}
                                </Code>
                            </CopyOnClick>
                            <p css={tw`text-xs text-neutral-400 mt-2`}>
                                Give this to your players instead of the raw IP. DNS changes can take a few minutes to
                                reach everyone.
                            </p>
                        </div>
                        <Can action={'subdomain.delete'}>
                            <Button.Danger
                                variant={Button.Variants.Secondary}
                                size={Button.Sizes.Small}
                                // flex-shrink-0, not shrink-0: twin.macro's class map is older
                                // than the Tailwind build, so the v3 alias doesn't resolve here.
                                css={tw`mt-4 sm:mt-0 sm:ml-4 flex-shrink-0`}
                                disabled={submitting}
                                onClick={() => setConfirm(true)}
                            >
                                Release
                            </Button.Danger>
                        </Can>
                    </div>
                </>
            ) : (
                <Can
                    action={'subdomain.create'}
                    renderOnError={
                        <p css={tw`text-sm text-neutral-300`}>
                            This server does not have a subdomain, and you do not have permission to claim one.
                        </p>
                    }
                >
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (value.trim().length > 0 && !submitting) submit();
                        }}
                    >
                        <div css={tw`flex items-stretch`}>
                            <Input
                                value={value}
                                onChange={(e) => setValue(e.currentTarget.value)}
                                placeholder={'myserver'}
                                aria-label={'Subdomain'}
                                maxLength={bounds.max}
                                autoCorrect={'off'}
                                autoCapitalize={'none'}
                                spellCheck={false}
                                css={tw`rounded-r-none`}
                            />
                            <span
                                css={tw`flex items-center px-3 bg-neutral-800 border border-l-0 border-neutral-600 rounded-r text-sm text-neutral-300 select-none whitespace-nowrap`}
                            >
                                .{domain}
                            </span>
                        </div>
                        <p css={tw`text-xs text-neutral-400 mt-2`}>
                            {bounds.min}-{bounds.max} characters. Letters, numbers and hyphens only. Once claimed it is
                            yours until you release it.
                        </p>
                        <div css={tw`mt-4 flex justify-end`}>
                            <Button type={'submit'} disabled={submitting || value.trim().length === 0}>
                                Claim Subdomain
                            </Button>
                        </div>
                    </form>
                </Can>
            )}
        </TitledGreyBox>
    );
};

export default SubdomainBox;
