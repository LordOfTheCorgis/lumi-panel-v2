import { action, Action } from 'easy-peasy';

export interface SiteSettings {
    name: string;
    locale: string;
    turnstile: {
        enabled: boolean;
        siteKey: string;
    };
    subdomains: {
        enabled: boolean;
        domain: string;
    };
}

export interface SettingsStore {
    data?: SiteSettings;
    setSettings: Action<SettingsStore, SiteSettings>;
}

const settings: SettingsStore = {
    data: undefined,

    setSettings: action((state, payload) => {
        state.data = payload;
    }),
};

export default settings;
