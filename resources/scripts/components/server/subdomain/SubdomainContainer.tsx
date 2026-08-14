import React, { useEffect, useState } from 'react';
import tw from 'twin.macro';
import { faGlobe, faPlug, faServer, faTerminal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
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

// Small labelled row for the details panels. Values are monospace because
// they're all addresses, ports and record names.
const Detail = ({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className={'flex items-baseline justify-between gap-4 py-2 border-b border-neutral-700 last:border-b-0'}>
        <p className={'text-xs uppercase tracking-wide text-neutral-400 whitespace-nowrap'}>{label}</p>
        <p className={`text-sm text-neutral-200 truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
);

const SubdomainContainer = () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    const { clearFlashes, clearAndAddHttpError } = useFlashKey('server:subdomain');

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
                setConfirm(false);

                // Submitting with Enter and holding the key a moment sends
                // repeat keydowns. The claim form unmounts on the first one, so
                // the rest land on whatever button took its place - which is
                // Release, and which is why the confirm dialog appeared the
                // instant a subdomain was created. Dropping focus first means
                // there is nothing for the repeats to activate.
                (document.activeElement as HTMLElement | null)?.blur();
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

    // Mirrors the server-side rules so the button disables before a round trip
    // that would only come back with the same complaint.
    const trimmed = value.trim().toLowerCase();
    const validLabel =
        trimmed.length >= bounds.min && trimmed.length <= bounds.max && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(trimmed);

    return (
        <ServerContentBlock showFlashKey={'server:subdomain'} title={'Subdomain'}>
            {loading ? (
                <Spinner size={'large'} centered />
            ) : !enabled ? (
                <p css={tw`text-center text-sm text-neutral-300`}>
                    Subdomains are not available on this panel right now.
                </p>
            ) : subdomain ? (
                <>
                    <Dialog.Confirm
                        open={confirm && !!subdomain}
                        onClose={() => setConfirm(false)}
                        title={'Release Subdomain'}
                        confirm={'Release'}
                        onConfirmed={release}
                    >
                        {subdomain.fqdn} will stop pointing at this server and the name becomes available for anyone
                        else to claim. Players using it will no longer be able to connect.
                    </Dialog.Confirm>

                    {/* Hero. The address is the whole point of the page, so it
                        gets the space rather than sharing a row with a button. */}
                    <div
                        className={
                            'rounded-lg border border-neutral-600 bg-gradient-to-br from-neutral-700 to-neutral-800 p-6 sm:p-8 text-center'
                        }
                    >
                        <p className={'text-xs uppercase tracking-widest text-neutral-400 mb-3'}>
                            Your Connect Address
                        </p>
                        <CopyOnClick text={subdomain.fqdn}>
                            <div
                                className={
                                    'inline-block max-w-full cursor-pointer rounded-md bg-neutral-900/80 px-5 py-3 border border-neutral-600 hover:border-primary-400 transition-colors duration-150'
                                }
                            >
                                <span className={'font-mono text-lg sm:text-2xl text-neutral-50 break-all'}>
                                    {subdomain.fqdn}
                                </span>
                            </div>
                        </CopyOnClick>
                        <p className={'text-xs text-neutral-400 mt-3'}>
                            Click to copy. No port needed &mdash; players connect with this alone.
                        </p>
                    </div>

                    {/* The thing a player actually pastes. */}
                    <TitledGreyBox title={'In-Game Connect Command'} icon={faTerminal} className={'mt-6'}>
                        <CopyOnClick text={`connect ${subdomain.fqdn}`}>
                            <Code dark className={'block truncate hover:bg-neutral-700 transition-colors duration-150'}>
                                connect {subdomain.fqdn}
                            </Code>
                        </CopyOnClick>
                        <p className={'text-xs text-neutral-400 mt-2'}>Press F8 in FiveM, paste this, and hit enter.</p>
                    </TitledGreyBox>

                    <div className={'grid grid-cols-1 md:grid-cols-2 gap-6 mt-6'}>
                        <TitledGreyBox title={'Connection'} icon={faPlug}>
                            <Detail label={'Points to'} value={subdomain.target || 'unknown'} />
                            <Detail label={'Game port'} value={subdomain.port ?? 'unknown'} />
                            <Detail
                                label={'Claimed'}
                                value={subdomain.createdAt.toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                })}
                                mono={false}
                            />
                        </TitledGreyBox>

                        {/* Shown so a customer debugging a connection issue can
                            see exactly what we published on their behalf. */}
                        <TitledGreyBox title={'DNS Records'} icon={faServer}>
                            <Detail label={'A'} value={`${subdomain.fqdn} → ${subdomain.target || '?'}`} />
                            <Detail label={'SRV'} value={`_cfx._udp → port ${subdomain.port ?? '?'}`} />
                            <Detail label={'TTL'} value={`${subdomain.ttl}s`} />
                        </TitledGreyBox>
                    </div>

                    <Can action={'subdomain.delete'}>
                        <div
                            className={
                                'mt-6 rounded-lg border border-red-500/40 bg-red-500/5 p-4 sm:flex items-center justify-between'
                            }
                        >
                            <div className={'min-w-0'}>
                                <p className={'text-sm font-medium text-neutral-100'}>Release this subdomain</p>
                                <p className={'text-xs text-neutral-400 mt-1'}>
                                    Frees the name for anyone else to claim. Players using it will stop connecting
                                    immediately.
                                </p>
                            </div>
                            <Button.Danger
                                type={'button'}
                                variant={Button.Variants.Secondary}
                                size={Button.Sizes.Small}
                                className={'mt-4 sm:mt-0 sm:ml-4 flex-shrink-0'}
                                disabled={submitting}
                                onClick={() => setConfirm(true)}
                            >
                                Release
                            </Button.Danger>
                        </div>
                    </Can>
                </>
            ) : (
                <Can
                    action={'subdomain.create'}
                    renderOnError={
                        <TitledGreyBox title={'Subdomain'} icon={faGlobe}>
                            <p css={tw`text-sm text-neutral-300`}>
                                This server does not have a subdomain, and you do not have permission to claim one.
                            </p>
                        </TitledGreyBox>
                    }
                >
                    <div className={'rounded-lg border border-neutral-600 bg-neutral-700 p-6 sm:p-8'}>
                        <div className={'text-center max-w-lg mx-auto'}>
                            <FontAwesomeIcon icon={faGlobe} className={'text-3xl text-primary-400 mb-4'} />
                            <h2 className={'text-lg font-medium text-neutral-100'}>Claim your address</h2>
                            <p className={'text-sm text-neutral-300 mt-2'}>
                                Give players a name to remember instead of an IP and port. It keeps working if your
                                server moves nodes or changes port.
                            </p>
                        </div>

                        <form
                            className={'mt-6 max-w-lg mx-auto'}
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (validLabel && !submitting) submit();
                            }}
                        >
                            <div className={'flex items-stretch'}>
                                <Input
                                    value={value}
                                    onChange={(e) => setValue(e.currentTarget.value)}
                                    placeholder={'myserver'}
                                    aria-label={'Subdomain'}
                                    maxLength={bounds.max}
                                    autoCorrect={'off'}
                                    autoCapitalize={'none'}
                                    spellCheck={false}
                                    css={tw`rounded-r-none font-mono`}
                                />
                                <span
                                    className={
                                        'flex items-center px-3 bg-neutral-800 border border-l-0 border-neutral-600 rounded-r font-mono text-sm text-neutral-300 select-none whitespace-nowrap'
                                    }
                                >
                                    .{domain}
                                </span>
                            </div>

                            {/* Live preview beats explaining the format in prose. */}
                            <p className={'text-center text-sm text-neutral-400 mt-4'}>
                                Players will connect to{' '}
                                <span className={'font-mono text-neutral-200'}>
                                    {trimmed.length > 0 ? `${trimmed}.${domain}` : `yourname.${domain}`}
                                </span>
                            </p>

                            <div className={'mt-6 flex justify-center'}>
                                <Button type={'submit'} disabled={submitting || !validLabel}>
                                    Claim Subdomain
                                </Button>
                            </div>

                            <p className={'text-xs text-neutral-500 mt-4 text-center'}>
                                {bounds.min}&ndash;{bounds.max} characters. Letters, numbers and hyphens only, and it
                                cannot start or end with a hyphen.
                            </p>
                        </form>
                    </div>
                </Can>
            )}
        </ServerContentBlock>
    );
};

export default SubdomainContainer;
