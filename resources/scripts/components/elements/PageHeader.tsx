import React from 'react';
import tw from 'twin.macro';

interface Props {
    title: string;
    description?: string;
    // Actions aligned to the trailing edge of the header (toggles, buttons).
    children?: React.ReactNode;
}

/**
 * Standard heading for a panel screen. Upstream pages drop straight into their
 * content with no title, which leaves every screen looking the same at a glance
 * and gives actions nowhere consistent to live.
 */
const PageHeader = ({ title, description, children }: Props) => (
    <div css={tw`mb-6 flex flex-wrap items-end justify-between gap-4`}>
        <div css={tw`min-w-0`}>
            <h1 css={tw`font-header text-2xl font-semibold tracking-tight text-neutral-50`}>{title}</h1>
            {description && <p css={tw`mt-1 text-sm text-neutral-400`}>{description}</p>}
        </div>
        {children && <div css={tw`flex items-center gap-3`}>{children}</div>}
    </div>
);

export default PageHeader;
