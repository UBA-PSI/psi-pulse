import cron from 'node-cron';
import type { NitroApp } from 'nitropack';

// One task per callback; slow jobs must not overlap with themselves. Stop on shutdown/HMR.
export function useScheduler(nitro: NitroApp) {
    return {run(callback: () => Promise<void>) {
        return {everyMinute() {
            const task = cron.schedule('* * * * *', async () => {
                try { await callback() } catch { console.error('Scheduled task failed') }
            }, {noOverlap: true});
            nitro.hooks.hook('close', () => task.destroy());
            return task;
        }};
    }};
}
