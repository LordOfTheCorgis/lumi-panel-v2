import React, { memo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import tw from 'twin.macro';
import isEqual from 'react-fast-compare';

interface Props {
    icon?: IconProp;
    title: string | React.ReactNode;
    className?: string;
    children: React.ReactNode;
}

const TitledGreyBox = ({ icon, title, children, className }: Props) => (
    <div css={tw`rounded-lg border border-neutral-600 bg-neutral-700 overflow-hidden`} className={className}>
        <div css={tw`flex items-center bg-neutral-800 px-4 py-3 border-b border-neutral-600`}>
            {typeof title === 'string' ? (
                <p css={tw`text-sm font-medium text-neutral-100`}>
                    {icon && <FontAwesomeIcon icon={icon} css={tw`mr-2 text-primary-400`} fixedWidth />}
                    {title}
                </p>
            ) : (
                // A custom title is a flex child here, so it collapses to its
                // content unless told to fill. That is what squashed the
                // select-all checkbox against the label on the subuser form.
                <div css={tw`flex-1 min-w-0`}>{title}</div>
            )}
        </div>
        <div css={tw`p-4`}>{children}</div>
    </div>
);

export default memo(TitledGreyBox, isEqual);
