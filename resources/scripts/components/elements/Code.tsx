import React from 'react';
import classNames from 'classnames';

// Extends the standard element props so things like onClick survive. CopyOnClick
// clones its child and injects a handler; swallowing it here is why clicking a
// <Code> to copy silently did nothing.
interface CodeProps extends React.HTMLAttributes<HTMLElement> {
    dark?: boolean | undefined;
    className?: string;
    children: React.ReactChild | React.ReactFragment | React.ReactPortal;
}

export default ({ dark, className, children, ...rest }: CodeProps) => (
    <code
        {...rest}
        className={classNames('font-mono text-sm px-2 py-1 inline-block rounded', className, {
            'bg-neutral-700': !dark,
            'bg-neutral-900 text-gray-100': dark,
        })}
    >
        {children}
    </code>
);
