import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import useEventListener from '@/plugins/useEventListener';
import SearchModal from '@/components/dashboard/search/SearchModal';
import { SidebarIconStyle, SidebarLinkStyle } from '@/components/elements/SidebarStyles';

export default () => {
    const [visible, setVisible] = useState(false);

    useEventListener('keydown', (e: KeyboardEvent) => {
        if (['input', 'textarea'].indexOf(((e.target as HTMLElement).tagName || 'input').toLowerCase()) < 0) {
            if (!visible && e.metaKey && e.key.toLowerCase() === '/') {
                setVisible(true);
            }
        }
    });

    return (
        <>
            {visible && <SearchModal appear visible={visible} onDismissed={() => setVisible(false)} />}
            <button onClick={() => setVisible(true)} className={SidebarLinkStyle}>
                <span className={SidebarIconStyle}>
                    <FontAwesomeIcon icon={faSearch} fixedWidth />
                </span>
                <span className={'truncate'}>Search</span>
                <span className={'ml-auto text-2xs text-neutral-500 tracking-wide'}>⌘/</span>
            </button>
        </>
    );
};
