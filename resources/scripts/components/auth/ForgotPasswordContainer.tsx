import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import requestPasswordResetEmail from '@/api/auth/requestPasswordResetEmail';
import { httpErrorToHuman } from '@/api/http';
import LoginFormContainer, { AuthLinkStyle } from '@/components/auth/LoginFormContainer';
import { useStoreState } from 'easy-peasy';
import Field from '@/components/elements/Field';
import { Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import tw from 'twin.macro';
import Button from '@/components/elements/Button';
import Turnstile, { TurnstileHandle } from '@/components/elements/Turnstile';
import useFlash from '@/plugins/useFlash';

interface Values {
    email: string;
}

export default () => {
    const ref = useRef<TurnstileHandle>(null);
    const [token, setToken] = useState('');
    // See LoginContainer: Turnstile solves itself, so a submit made before the
    // token lands is queued rather than rejected.
    const submitWhenVerified = useRef<(() => void) | null>(null);

    const { clearFlashes, addFlash } = useFlash();
    const { enabled: captchaEnabled, siteKey } = useStoreState((state) => state.settings.data!.turnstile);

    useEffect(() => {
        clearFlashes();
    }, []);

    const handleSubmission = ({ email }: Values, { setSubmitting, resetForm }: FormikHelpers<Values>) => {
        clearFlashes();

        if (captchaEnabled && !token) {
            submitWhenVerified.current = () =>
                handleSubmission({ email }, { setSubmitting, resetForm } as FormikHelpers<Values>);

            return;
        }

        requestPasswordResetEmail(email, token)
            .then((response) => {
                resetForm();
                addFlash({ type: 'success', title: 'Success', message: response });
            })
            .catch((error) => {
                console.error(error);
                addFlash({ type: 'error', title: 'Error', message: httpErrorToHuman(error) });
            })
            .then(() => {
                setToken('');
                ref.current?.reset();

                setSubmitting(false);
            });
    };

    return (
        <Formik
            onSubmit={handleSubmission}
            initialValues={{ email: '' }}
            validationSchema={object().shape({
                email: string()
                    .email('A valid email address must be provided to continue.')
                    .required('A valid email address must be provided to continue.'),
            })}
        >
            {({ isSubmitting }) => (
                <LoginFormContainer title={'Request Password Reset'}>
                    <Field
                        label={'Email'}
                        description={
                            'Enter your account email address to receive instructions on resetting your password.'
                        }
                        name={'email'}
                        type={'email'}
                    />
                    <div css={tw`mt-6`}>
                        <Button type={'submit'} size={'xlarge'} disabled={isSubmitting} isLoading={isSubmitting}>
                            Send Email
                        </Button>
                    </div>
                    {captchaEnabled && (
                        <Turnstile
                            ref={ref}
                            siteKey={siteKey}
                            onVerify={(value) => {
                                setToken(value);

                                const pending = submitWhenVerified.current;
                                submitWhenVerified.current = null;
                                if (pending) pending();
                            }}
                            onExpire={() => setToken('')}
                            onError={() => setToken('')}
                        />
                    )}
                    <div css={tw`mt-6 text-center`}>
                        <Link to={'/auth/login'} className={AuthLinkStyle}>
                            Return to Login
                        </Link>
                    </div>
                </LoginFormContainer>
            )}
        </Formik>
    );
};
