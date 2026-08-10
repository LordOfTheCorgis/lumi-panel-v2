import * as React from 'react';
import UpdatePasswordForm from '@/components/dashboard/forms/UpdatePasswordForm';
import UpdateEmailAddressForm from '@/components/dashboard/forms/UpdateEmailAddressForm';
import ConfigureTwoFactorForm from '@/components/dashboard/forms/ConfigureTwoFactorForm';
import PageContentBlock from '@/components/elements/PageContentBlock';
import PageHeader from '@/components/elements/PageHeader';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import FlashMessageRender from '@/components/FlashMessageRender';
import MessageBox from '@/components/MessageBox';
import AccountIdentity from '@/components/dashboard/AccountIdentity';
import AccountSecuritySummary from '@/components/dashboard/AccountSecuritySummary';
import AccountRecentActivity from '@/components/dashboard/AccountRecentActivity';
import AccountSessions from '@/components/dashboard/AccountSessions';
import { useAccountDetails } from '@/api/account/getAccountDetails';
import { useLocation } from 'react-router-dom';
import { faEnvelope, faLock, faShieldAlt } from '@fortawesome/free-solid-svg-icons';

export default () => {
    const { state } = useLocation<undefined | { twoFactorRedirect?: boolean }>();
    const { data: details } = useAccountDetails();

    return (
        <PageContentBlock title={'Account Overview'}>
            <PageHeader title={'Account'} description={'Your profile, security settings and recent activity.'} />

            {state?.twoFactorRedirect && (
                <MessageBox title={'2-Factor Required'} type={'error'}>
                    Your account must have two-factor authentication enabled in order to continue.
                </MessageBox>
            )}

            <div className={'space-y-6'}>
                <AccountIdentity details={details} />

                <AccountSecuritySummary details={details} />

                <div className={'grid gap-6 lg:grid-cols-3'}>
                    <TitledGreyBox title={'Update Password'} icon={faLock}>
                        <FlashMessageRender byKey={'account:password'} className={'mb-3'} />
                        <UpdatePasswordForm />
                    </TitledGreyBox>
                    <TitledGreyBox title={'Update Email Address'} icon={faEnvelope}>
                        <FlashMessageRender byKey={'account:email'} className={'mb-3'} />
                        <UpdateEmailAddressForm />
                    </TitledGreyBox>
                    <TitledGreyBox title={'Two-Step Verification'} icon={faShieldAlt}>
                        <ConfigureTwoFactorForm recoveryTokens={details?.recoveryTokens} />
                    </TitledGreyBox>
                </div>

                <div className={'grid gap-6 lg:grid-cols-2'}>
                    <AccountSessions />
                    <AccountRecentActivity />
                </div>
            </div>
        </PageContentBlock>
    );
};
