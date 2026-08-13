import React from 'react';

export interface CronValues {
    minute: string;
    hour: string;
    dayOfMonth: string;
    month: string;
    dayOfWeek: string;
}

interface Preset {
    label: string;
    cron: CronValues;
}

// The overwhelming majority of schedules people actually create are one of
// these. Offering them as one click means most users never have to learn cron
// syntax at all, while the fields underneath stay available for the rest.
export const presets: Preset[] = [
    { label: 'Every 5 minutes', cron: { minute: '*/5', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' } },
    { label: 'Every 30 minutes', cron: { minute: '*/30', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' } },
    { label: 'Hourly', cron: { minute: '0', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' } },
    { label: 'Every 6 hours', cron: { minute: '0', hour: '*/6', dayOfMonth: '*', month: '*', dayOfWeek: '*' } },
    { label: 'Daily at 4am', cron: { minute: '0', hour: '4', dayOfMonth: '*', month: '*', dayOfWeek: '*' } },
    { label: 'Weekly (Sun 4am)', cron: { minute: '0', hour: '4', dayOfMonth: '*', month: '*', dayOfWeek: '0' } },
    { label: 'Monthly (1st, 4am)', cron: { minute: '0', hour: '4', dayOfMonth: '1', month: '*', dayOfWeek: '*' } },
];

export const matches = (a: CronValues, b: CronValues): boolean =>
    a.minute === b.minute &&
    a.hour === b.hour &&
    a.dayOfMonth === b.dayOfMonth &&
    a.month === b.month &&
    a.dayOfWeek === b.dayOfWeek;

const SchedulePresets = ({ current, onSelect }: { current: CronValues; onSelect: (cron: CronValues) => void }) => (
    <div className={'flex flex-wrap gap-2'}>
        {presets.map((preset) => {
            const active = matches(current, preset.cron);

            return (
                <button
                    key={preset.label}
                    type={'button'}
                    onClick={() => onSelect(preset.cron)}
                    aria-pressed={active}
                    className={
                        'rounded-full border px-3 py-1.5 text-xs transition-colors duration-150 ' +
                        (active
                            ? 'border-primary-500 bg-primary-500/15 text-primary-400'
                            : 'border-neutral-600 bg-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100')
                    }
                >
                    {preset.label}
                </button>
            );
        })}
    </div>
);

export default SchedulePresets;
