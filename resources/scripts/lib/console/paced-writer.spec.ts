import {
    MAX_OFFSET_ROWS,
    MAX_QUEUED_LINES,
    MIN_ROWS_PER_SECOND,
    PacedWriter,
    SNAP_THRESHOLD_LINES,
} from '@/lib/console/paced-writer';

const ROW_HEIGHT = 16;
const FRAME = 1000 / 60;

/**
 * Drives the writer by hand instead of by animation frame, so a test can say
 * "three frames later" and mean it.
 */
const harness = (options: { smooth?: boolean; pinned?: boolean } = {}) => {
    const state = {
        written: [] as string[],
        lines: 0,
        offsets: [] as number[],
        pinned: options.pinned ?? true,
        // Assume a console that already filled its screen, so every line scrolls.
        scrollsPerWrite: (lines: number) => lines,
    };

    let pending: ((now: number) => void) | null = null;
    let clock = 0;

    const writer = new PacedWriter(
        {
            write: (chunk, lines) => {
                state.written.push(chunk);
                state.lines += lines;

                return state.scrollsPerWrite(lines);
            },
            setOffset: (px) => state.offsets.push(px),
            rowHeight: () => ROW_HEIGHT,
            pinnedToBottom: () => state.pinned,
        },
        {
            smooth: options.smooth ?? true,
            scheduler: {
                request: (cb) => {
                    pending = cb;

                    return 1;
                },
                cancel: () => {
                    pending = null;
                },
            },
        }
    );

    return {
        writer,
        state,
        frames: (count: number) => {
            for (let i = 0; i < count; i++) {
                const cb = pending;
                pending = null;

                if (!cb) break;

                clock += FRAME;
                cb(clock);
            }
        },
        get scheduled() {
            return pending !== null;
        },
    };
};

const push = (writer: PacedWriter, count: number) => {
    for (let i = 0; i < count; i++) {
        writer.push(`line ${i}\r\n`);
    }
};

describe('PacedWriter', () => {
    it('holds a burst back instead of writing it in one frame', () => {
        const h = harness();

        push(h.writer, 300);
        h.frames(1);

        expect(h.state.lines).toBeGreaterThan(0);
        expect(h.state.lines).toBeLessThan(300);
        expect(h.writer.pending).toBeGreaterThan(0);
    });

    it('gets through a burst rather than stalling on it', () => {
        const h = harness();

        push(h.writer, 300);
        // Two and a bit seconds of frames; the burst should be long gone.
        h.frames(180);

        expect(h.state.lines).toBe(300);
        expect(h.writer.pending).toBe(0);
    });

    it('dumps the queue outright once it stops being a scroll', () => {
        const h = harness();

        push(h.writer, SNAP_THRESHOLD_LINES);
        h.frames(1);

        expect(h.state.lines).toBe(SNAP_THRESHOLD_LINES);
        // Snapping is the one path that doesn't offset at all - there's nothing
        // to smooth when you're jumping.
        expect(h.state.offsets).toEqual([]);
    });

    it('never pushes the screen further down than the cap', () => {
        const h = harness();

        push(h.writer, 1500);
        h.frames(120);

        expect(Math.max(...h.state.offsets)).toBeLessThanOrEqual(MAX_OFFSET_ROWS * ROW_HEIGHT);
    });

    it('settles back flush against the bottom when the output stops', () => {
        const h = harness();

        push(h.writer, 40);
        h.frames(200);

        expect(h.state.lines).toBe(40);
        expect(h.state.offsets[h.state.offsets.length - 1]).toBe(0);
        expect(h.scheduled).toBe(false);
    });

    it('writes straight through while someone is reading scrollback', () => {
        const h = harness({ pinned: false });

        push(h.writer, 200);
        h.frames(1);

        expect(h.state.lines).toBe(200);
    });

    it('writes straight through when smoothing is off', () => {
        const h = harness({ smooth: false });

        push(h.writer, 200);
        h.frames(1);

        expect(h.state.lines).toBe(200);
        expect(h.state.offsets).toEqual([]);
    });

    it('does not offset for lines that only filled empty rows', () => {
        const h = harness();
        // A console that has not filled its screen grows downward; nothing moves,
        // so there is nothing to compensate for.
        h.state.scrollsPerWrite = () => 0;

        push(h.writer, 20);
        h.frames(5);

        expect(h.state.offsets.every((px) => px === 0)).toBe(true);
    });

    it('drops the oldest lines rather than growing without bound', () => {
        const h = harness();

        // A backgrounded tab never gets a frame, so nothing drains.
        push(h.writer, MAX_QUEUED_LINES + 500);

        expect(h.writer.pending).toBe(MAX_QUEUED_LINES);
    });

    it('moves an isolated line at the floor rate rather than teleporting it', () => {
        const h = harness();

        push(h.writer, 1);
        // The floor rate is half a row per frame, so the line lands on the second
        // frame and is still mid-flight when it does.
        h.frames(2);

        const offset = h.state.offsets[h.state.offsets.length - 1];

        expect(offset).toBeGreaterThan(0);
        expect(offset).toBeLessThan(ROW_HEIGHT);
        expect(MIN_ROWS_PER_SECOND * (FRAME / 1000)).toBeLessThan(1);
    });

    it('stops scheduling frames once cleared', () => {
        const h = harness();

        push(h.writer, 100);
        h.writer.clear();

        expect(h.writer.pending).toBe(0);
        expect(h.scheduled).toBe(false);
    });
});
