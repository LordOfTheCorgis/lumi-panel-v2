import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

declare global {
    interface Window {
        turnstile?: {
            render: (el: HTMLElement, opts: Record<string, unknown>) => string;
            reset: (id?: string) => void;
            remove: (id?: string) => void;
        };
    }
}

export interface TurnstileHandle {
    reset: () => void;
}

interface Props {
    siteKey: string;
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
}

/**
 * Loads Cloudflare's script once and renders a widget explicitly, rather than
 * pulling in a wrapper package for what is three API calls.
 *
 * Rendered inline where it is placed, so unlike reCAPTCHA there is no floating
 * fixed-position badge to collide with the page.
 */
let scriptPromise: Promise<void> | null = null;

const loadScript = (): Promise<void> => {
    if (window.turnstile) return Promise.resolve();
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
        const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Failed to load Turnstile.')));
            return;
        }

        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Turnstile.'));
        document.head.appendChild(script);
    });

    return scriptPromise;
};

export default forwardRef<TurnstileHandle, Props>(({ siteKey, onVerify, onExpire, onError }, ref) => {
    const container = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);

    // Held in refs so re-rendering the parent doesn't tear down and re-render
    // the widget, which would throw away a token the user already earned.
    const handlers = useRef({ onVerify, onExpire, onError });
    handlers.current = { onVerify, onExpire, onError };

    useImperativeHandle(ref, () => ({
        reset: () => {
            if (widgetId.current && window.turnstile) {
                window.turnstile.reset(widgetId.current);
            }
        },
    }));

    useEffect(() => {
        let cancelled = false;

        loadScript()
            .then(() => {
                if (cancelled || !container.current || !window.turnstile || widgetId.current) return;

                widgetId.current = window.turnstile.render(container.current, {
                    sitekey: siteKey,
                    callback: (token: string) => handlers.current.onVerify(token),
                    'expired-callback': () => handlers.current.onExpire?.(),
                    'error-callback': () => handlers.current.onError?.(),
                    theme: 'dark',
                    // Fills the parent width rather than sitting at a fixed
                    // 300px, so it lines up with the form fields above it.
                    size: 'flexible',
                    // Visible on purpose. 'interaction-only' hides the widget
                    // until a challenge is required, which also hides every
                    // failure: if no token ever arrives the login button just
                    // silently does nothing and there is nothing on screen to
                    // explain why. On an auth form that trade isn't worth it.
                    appearance: 'always',
                });
            })
            .catch(() => handlers.current.onError?.());

        return () => {
            cancelled = true;
            if (widgetId.current && window.turnstile) {
                window.turnstile.remove(widgetId.current);
                widgetId.current = null;
            }
        };
    }, [siteKey]);

    return <div ref={container} />;
});
