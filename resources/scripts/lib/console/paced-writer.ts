/**
 * Smooth console scrolling.
 *
 * Two things make the console jump rather than scroll, and both have to go.
 *
 * The first is bursts: a socket delivers a whole restart's worth of output in a
 * couple of frames, and writing it as it arrives moves the viewport forty rows
 * in one paint. So we queue instead, and drain at a rate the eye can actually
 * follow. The queue is allowed to fall behind the server while that happens -
 * that's the trade, and it's the right one, because output arriving faster than
 * you can read it is not information you're losing.
 *
 * The second is that xterm scrolls in whole rows. Even one line per frame steps
 * the view a full row height at once, which reads as a stutter rather than
 * motion. So after each write - which has already yanked the content up by
 * however many rows scrolled - we push the rendered screen back down by exactly
 * that many pixels, then bleed the offset off over the following frames. The
 * content ends up moving continuously at sub-row precision even though the
 * buffer underneath it is still stepping a row at a time.
 *
 * Because we add the full row on write and subtract at the same rate we're
 * writing, the offset settles at a roughly constant value under steady output,
 * which is what makes it glide instead of pulse.
 */

// Rows per second, as a floor plus a term proportional to how far behind we
// are. The floor is the speed a single line drifts in at. The proportional part
// is what actually clears a burst, and it has to be added to the floor rather
// than max()'d with it - otherwise the last forty lines of every burst crawl in
// at the floor rate while the four hundred before them flew past.
export const MIN_ROWS_PER_SECOND = 30;
export const MAX_ROWS_PER_SECOND = 600;

// Divisor on the backlog. Turn this up for gentler scrolling and more lag behind
// the server, down for the reverse. At 0.8 a 300 line burst takes about two
// seconds to walk through.
export const CATCH_UP_SECONDS = 0.8;

// Past this the queue isn't scrolling, it's a server booting. Dump the lot and
// land at the end - nobody reads twelve hundred lines of startup spam on the way
// past, and pretending otherwise means a five second wait to see the prompt.
export const SNAP_THRESHOLD_LINES = 1200;

// Ceiling on how far the screen is allowed to sit below where it belongs. Only
// reachable if the frame rate collapses mid-burst; the clamp costs one frame of
// smoothness and saves a half-screen of empty space at the top.
export const MAX_OFFSET_ROWS = 3;

// Backstop for the case rAF never fires - a backgrounded tab watching a chatty
// server. Nothing drains, so the queue has to be bounded somewhere.
export const MAX_QUEUED_LINES = 5000;

export interface PacedWriterHooks {
    /**
     * Write a chunk holding `lines` newline-terminated lines, and report back how
     * many rows the buffer actually scrolled. That isn't always `lines`: a console
     * that hasn't filled its screen yet grows downward instead of scrolling, and
     * offsetting for a scroll that didn't happen bounces the whole view.
     */
    write: (chunk: string, lines: number) => number;
    /** Push the rendered screen down by this many pixels. Zero means sitting flush. */
    setOffset: (pixels: number) => void;
    /** Height of one row in pixels, or 0 if the terminal isn't on screen yet. */
    rowHeight: () => number;
    /** False once someone scrolls up to read scrollback. */
    pinnedToBottom: () => boolean;
}

interface Scheduler {
    request: (cb: (now: number) => void) => number;
    cancel: (handle: number) => void;
}

const defaultScheduler: Scheduler = {
    request: (cb) => requestAnimationFrame(cb),
    cancel: (handle) => cancelAnimationFrame(handle),
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export class PacedWriter {
    private queue: string[] = [];
    private offset = 0;
    // Fractional lines carried between frames. Without it a rate that works out
    // to 0.4 lines per frame would floor to zero forever and never write.
    private credit = 0;
    private lastTick: number | null = null;
    private frame: number | null = null;
    private readonly scheduler: Scheduler;
    private readonly smooth: boolean;

    constructor(private hooks: PacedWriterHooks, options: { smooth?: boolean; scheduler?: Scheduler } = {}) {
        this.smooth = options.smooth ?? true;
        this.scheduler = options.scheduler ?? defaultScheduler;
    }

    push(line: string): void {
        this.queue.push(line);

        if (this.queue.length > MAX_QUEUED_LINES) {
            this.queue.splice(0, this.queue.length - MAX_QUEUED_LINES);
        }

        this.schedule();
    }

    /** Everything queued but not yet written. Exposed for the "N lines behind" affordance. */
    get pending(): number {
        return this.queue.length;
    }

    clear(): void {
        this.cancel();
        this.queue = [];
        this.credit = 0;
        this.setOffset(0);
    }

    dispose(): void {
        this.cancel();
        this.queue = [];
    }

    tick(now: number): void {
        // First frame after an idle stretch has no meaningful delta, and a tab
        // coming back from the background has a uselessly large one.
        const dt = this.lastTick === null ? 1 / 60 : clamp((now - this.lastTick) / 1000, 0, 0.1);
        this.lastTick = now;

        const rowHeight = this.hooks.rowHeight();

        // Reading scrollback: new output doesn't move the viewport, so there is
        // nothing to smooth and no reason to hold lines back.
        if (!this.smooth || rowHeight <= 0 || !this.hooks.pinnedToBottom()) {
            return this.flush();
        }

        if (this.queue.length >= SNAP_THRESHOLD_LINES) {
            return this.flush();
        }

        const rate = Math.min(MIN_ROWS_PER_SECOND + this.queue.length / CATCH_UP_SECONDS, MAX_ROWS_PER_SECOND);

        this.credit += rate * dt;

        const count = Math.min(Math.floor(this.credit), this.queue.length);
        if (count > 0) {
            this.credit -= count;

            const scrolled = this.hooks.write(this.queue.splice(0, count).join(''), count);
            this.offset = Math.min(this.offset + scrolled * rowHeight, MAX_OFFSET_ROWS * rowHeight);
        } else if (this.queue.length === 0) {
            this.credit = 0;
        }

        this.setOffset(Math.max(0, this.offset - rate * rowHeight * dt));
    }

    private flush(): void {
        if (this.queue.length > 0) {
            const count = this.queue.length;
            this.hooks.write(this.queue.splice(0, count).join(''), count);
        }

        this.credit = 0;
        this.setOffset(0);
    }

    private setOffset(pixels: number): void {
        // Sub-half-pixel offsets are invisible and keep the loop alive for no
        // reason, so treat them as home.
        const next = pixels < 0.5 ? 0 : pixels;

        if (next !== this.offset) {
            this.offset = next;
            this.hooks.setOffset(next);
        }
    }

    private schedule(): void {
        if (this.frame !== null) {
            return;
        }

        this.frame = this.scheduler.request((now) => {
            this.frame = null;
            this.tick(now);

            if (this.queue.length > 0 || this.offset > 0) {
                this.schedule();
            } else {
                // Next burst starts a fresh clock rather than inheriting however
                // long the console sat quiet.
                this.lastTick = null;
            }
        });
    }

    private cancel(): void {
        if (this.frame !== null) {
            this.scheduler.cancel(this.frame);
            this.frame = null;
        }

        this.lastTick = null;
    }
}
