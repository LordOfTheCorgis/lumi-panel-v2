// Lumix Solutions brand palette. 500 is the brand color (#ff4c4c); the rest of
// the ramp is derived from it so every Tailwind shade lands on-brand.
const lumi = {
    50: '#fff1f1',
    100: '#ffdfdf',
    200: '#ffc4c4',
    300: '#ffa0a0',
    400: '#ff7676',
    500: '#ff4c4c',
    600: '#ed2020',
    700: '#c81414',
    800: '#a51414',
    900: '#881818',
};

// The brand color occupies the bright-red slot, so destructive/error UI is
// pushed to a deeper crimson. Without this, a "delete" button and a "primary"
// button are indistinguishable.
const danger = {
    50: '#fdf2f4',
    100: '#fbe1e5',
    200: '#f4bcc4',
    300: '#e88e9b',
    400: '#d55c6e',
    500: '#bf2f45',
    600: '#a32138',
    700: '#851b2e',
    800: '#691725',
    900: '#52131e',
};

// Upstream's "neutral" scale sat at hue 209-216 with up to 24% saturation,
// which is not a grey — it is blue, and it tinted every surface in the panel.
// Rebuilt on hue 0 at a few percent saturation: reads as grey, but leans very
// slightly warm so it sits under the brand red rather than fighting it.
//
// Lightness values are carried over verbatim from the old scale so every
// existing contrast pairing in the UI still holds.
const gray = {
    50: 'hsl(0, 0%, 97%)',
    100: 'hsl(0, 0%, 91%)',
    200: 'hsl(0, 0%, 82%)',
    300: 'hsl(0, 2%, 65%)',
    400: 'hsl(0, 3%, 53%)',
    500: 'hsl(0, 3%, 43%)',
    600: 'hsl(0, 4%, 37%)',
    700: 'hsl(0, 5%, 30%)',
    800: 'hsl(0, 5%, 25%)',
    900: 'hsl(0, 6%, 16%)',
};

module.exports = {
    content: [
        './resources/scripts/**/*.{js,ts,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                header: ['"IBM Plex Sans"', '"Roboto"', 'system-ui', 'sans-serif'],
            },
            colors: {
                // Was #131a20 — a blue near-black. Same lightness, neutral hue.
                black: '#131111',
                // Brand color. Prefer "lumi" in new code; "primary", "blue" and "cyan"
                // are aliases kept so upstream Pterodactyl markup picks up the brand
                // without a rewrite.
                lumi: lumi,
                primary: lumi,
                blue: lumi,
                cyan: lumi,
                red: danger,
                gray: gray,
                neutral: gray,
            },
            fontSize: {
                '2xs': '0.625rem',
            },
            transitionDuration: {
                250: '250ms',
            },
            borderColor: theme => ({
                default: theme('colors.neutral.400', 'currentColor'),
            }),
        },
    },
    plugins: [
        require('@tailwindcss/line-clamp'),
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
    ]
};
