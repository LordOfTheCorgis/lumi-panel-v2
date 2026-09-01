import React, { useEffect, useRef, useState } from 'react';
import { Link, RouteComponentProps } from 'react-router-dom';
import login from '@/api/auth/login';
import LoginFormContainer, { AuthLinkStyle } from '@/components/auth/LoginFormContainer';
import { useStoreState } from 'easy-peasy';
import { Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import Field from '@/components/elements/Field';
import tw from 'twin.macro';
import Button from '@/components/elements/Button';
import Turnstile, { TurnstileHandle } from '@/components/elements/Turnstile';
import useFlash from '@/plugins/useFlash';

interface Values {
    username: string;
    password: string;
}

const LoginContainer = ({ history }: RouteComponentProps) => {
    const ref = useRef<TurnstileHandle>(null);
    const [token, setToken] = useState('');
    // Set when the user submits before Turnstile has produced a token. The
    // widget is already working by then, so we submit for them once it lands
    // rather than making them click again.
    const submitWhenVerified = useRef<(() => void) | null>(null);
    // The "widget never returned" bail-out timer. Held in a ref so it can be
    // cancelled when the token does land, and torn down if the form unmounts
    // first - otherwise it fires 15s later into a dead component.
    const bailTimer = useRef<number | null>(null);

    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { enabled: captchaEnabled, siteKey } = useStoreState((state) => state.settings.data!.turnstile);

    const clearBailTimer = () => {
        if (bailTimer.current !== null) {
            window.clearTimeout(bailTimer.current);
            bailTimer.current = null;
        }
    };

    useEffect(() => {
        clearFlashes();
        return () => clearBailTimer();
    }, []);

    const onSubmit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes();

        // Turnstile renders on mount and solves itself, so there's nothing to
        // trigger here - just wait for the token and re-run this submit. The
        // timeout matters: without it a widget that never returns leaves the
        // button spinning forever with nothing explaining why.
        if (captchaEnabled && !token) {
            submitWhenVerified.current = () => onSubmit(values, { setSubmitting } as FormikHelpers<Values>);

            clearBailTimer();
            bailTimer.current = window.setTimeout(() => {
                bailTimer.current = null;
                if (!submitWhenVerified.current) return;

                submitWhenVerified.current = null;
                setSubmitting(false);
                clearAndAddHttpError({
                    error: new Error('Could not complete the security check. Please reload the page and try again.'),
                });
            }, 15000);

            return;
        }

        login({ ...values, captchaData: token })
            .then((response) => {
                if (response.complete) {
                    // @ts-expect-error this is valid
                    window.location = response.intended || '/';
                    return;
                }

                history.replace('/auth/login/checkpoint', { token: response.confirmationToken });
            })
            .catch((error) => {
                console.error(error);

                // Tokens are single use; keeping a spent one guarantees the
                // next attempt fails verification too.
                setToken('');
                ref.current?.reset();

                setSubmitting(false);
                clearAndAddHttpError({ error });
            });
    };

    return (
        <Formik
            onSubmit={onSubmit}
            initialValues={{ username: '', password: '' }}
            validationSchema={object().shape({
                username: string().required('A username or email must be provided.'),
                password: string().required('Please enter your account password.'),
            })}
        >
            {({ isSubmitting }) => (
                <LoginFormContainer title={'Sign in to continue'}>
                    <Field type={'text'} label={'Username or Email'} name={'username'} disabled={isSubmitting} />
                    <div css={tw`mt-6`}>
                        <Field type={'password'} label={'Password'} name={'password'} disabled={isSubmitting} />
                    </div>
                    {captchaEnabled && (
                        <div css={tw`mt-6`}>
                            <Turnstile
                                ref={ref}
                                siteKey={siteKey}
                                onVerify={(value) => {
                                    setToken(value);
                                    clearBailTimer();

                                    const pending = submitWhenVerified.current;
                                    submitWhenVerified.current = null;
                                    if (pending) pending();
                                }}
                                onExpire={() => setToken('')}
                                onError={() => {
                                    setToken('');
                                    submitWhenVerified.current = null;
                                    clearAndAddHttpError({
                                        error: new Error(
                                            'The security check failed to load. Disable any ad blocker for this page and reload.'
                                        ),
                                    });
                                }}
                            />
                        </div>
                    )}
                    <div css={tw`mt-6`}>
                        <Button type={'submit'} size={'xlarge'} isLoading={isSubmitting} disabled={isSubmitting}>
                            Login
                        </Button>
                    </div>
                    <div css={tw`mt-6 text-center`}>
                        <Link to={'/auth/password'} className={AuthLinkStyle}>
                            Forgot password?
                        </Link>
                    </div>
                </LoginFormContainer>
            )}
        </Formik>
    );
};

export default LoginContainer;
