import React, { useState } from 'react';
import useSWR from 'swr';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
    faBullhorn,
    faCheckCircle,
    faExclamationTriangle,
    faInfoCircle,
    faTimes,
} from '@fortawesome/free-solid-svg-icons';
import getAnnouncements, { Announcement, AnnouncementType } from '@/api/getAnnouncements';
import { usePersistedState } from '@/plugins/usePersistedState';
import { useStoreState } from 'easy-peasy';
import tw from 'twin.macro';

const presentation: Record<AnnouncementType, { icon: IconDefinition; bar: string; accent: string }> = {
    info: { icon: faInfoCircle, bar: 'bg-lumi-500', accent: 'text-lumi-100' },
    success: { icon: faCheckCircle, bar: 'bg-green-600', accent: 'text-green-100' },
    warning: { icon: faExclamationTriangle, bar: 'bg-yellow-600', accent: 'text-yellow-100' },
    danger: { icon: faBullhorn, bar: 'bg-red-600', accent: 'text-red-100' },
};

/**
 * Announcement bar. Renders nothing at all unless there is a visible
 * announcement the current user has not already dismissed, so it costs no
 * vertical space in the normal case.
 *
 * Dismissal is keyed on the announcement's `updatedAt`, meaning an edited
 * announcement re-surfaces for people who dismissed the previous wording.
 */
const AnnouncementBar = () => {
    const uuid = useStoreState((state) => state.user.data?.uuid);
    const [dismissed, setDismissed] = usePersistedState<string[]>(`${uuid}:dismissed_announcements`, []);
    const [index, setIndex] = useState(0);

    const { data } = useSWR<Announcement[]>('/api/client/announcements', getAnnouncements, {
        revalidateOnFocus: false,
        // Announcements are posted rarely; a slow poll is plenty and keeps a
        // long-lived console session from going stale.
        refreshInterval: 300000,
    });

    const key = (a: Announcement) => `${a.id}:${a.updatedAt}`;
    const visible = (data || []).filter((a) => !(dismissed || []).includes(key(a)));

    if (visible.length === 0) {
        return null;
    }

    const current = visible[Math.min(index, visible.length - 1)];
    const style = presentation[current.type] ?? presentation.info;

    const onDismiss = () => {
        setDismissed([...(dismissed || []), key(current)]);
        setIndex(0);
    };

    return (
        <div className={`${style.bar} relative`} role={'status'}>
            <div css={tw`mx-auto flex items-start gap-3 px-4 py-2.5 sm:px-6`} style={{ maxWidth: '1200px' }}>
                <FontAwesomeIcon icon={style.icon} className={style.accent} css={tw`mt-0.5 flex-shrink-0`} fixedWidth />
                <div css={tw`min-w-0 flex-1 text-sm text-white`}>
                    <span css={tw`font-semibold`}>{current.title}</span>
                    <span css={tw`mx-2 opacity-50`}>&middot;</span>
                    <span css={tw`opacity-95`}>{current.content}</span>
                </div>
                {visible.length > 1 && (
                    <button
                        onClick={() => setIndex((i) => (i + 1) % visible.length)}
                        className={style.accent}
                        css={tw`flex-shrink-0 text-xs underline opacity-90 hover:opacity-100`}
                    >
                        {visible.length - 1} more
                    </button>
                )}
                <button
                    onClick={onDismiss}
                    aria-label={'Dismiss announcement'}
                    className={style.accent}
                    css={tw`flex-shrink-0 opacity-75 transition-opacity duration-150 hover:opacity-100`}
                >
                    <FontAwesomeIcon icon={faTimes} fixedWidth />
                </button>
            </div>
        </div>
    );
};

export default AnnouncementBar;
