import React, { useMemo } from 'react';
import cronstrue from 'cronstrue';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { CronValues } from '@/components/server/schedules/SchedulePresets';

/**
 * Turns the five cron fields into a sentence, live as they are typed.
 *
 * Previously you filled in five boxes and found out what they meant by saving
 * the schedule and waiting - or by not finding out at all, which is how you end
 * up with a backup task running every minute.
 */
const CronSummary = ({ cron }: { cron: CronValues }) => {
    const { text, error } = useMemo(() => {
        const expression = `${cron.minute} ${cron.hour} ${cron.dayOfMonth} ${cron.month} ${cron.dayOfWeek}`;

        try {
            return { text: cronstrue.toString(expression, { verbose: false }), error: false };
        } catch (e) {
            // cronstrue throws with a usable message; anything else is on us.
            return { text: e instanceof Error ? e.message.replace(/^Error: /, '') : 'Invalid expression', error: true };
        }
    }, [cron.minute, cron.hour, cron.dayOfMonth, cron.month, cron.dayOfWeek]);

    return (
        <div
            className={
                'mt-3 flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ' +
                (error ? 'border-yellow-600 bg-yellow-600/10' : 'border-neutral-600 bg-neutral-800')
            }
        >
            <FontAwesomeIcon
                icon={error ? faExclamationTriangle : faCalendarAlt}
                className={error ? 'mt-0.5 text-yellow-500' : 'mt-0.5 text-primary-400'}
                fixedWidth
            />
            <div className={'min-w-0'}>
                <p className={error ? 'text-yellow-200' : 'text-neutral-100'}>{text}</p>
                {!error && (
                    <p className={'mt-0.5 font-mono text-xs text-neutral-500'}>
                        {cron.minute} {cron.hour} {cron.dayOfMonth} {cron.month} {cron.dayOfWeek}
                    </p>
                )}
            </div>
        </div>
    );
};

export default CronSummary;
