// Lumix Solutions brand palette. 500 is the brand color (#ff4c4c); the rest of
// the ramp is derived from it so every Tailwind shade lands on-brand.
// Pulled back from 100% saturation to ~80%. #ff4c4c is the logo's red and it's
// gorgeous on a 1024px mark, but spread across every button, border and focus
// ring in the panel it was shouting. Same hue, same lightness ramp, just less
// of it. The logo itself still uses the original.
const lumi = {
    50: '#fdf1f1',
    100: '#fce3e3',
    200: '#f9c8c8',
    300: '#f5a8a8',
    400: '#f18383',
    500: '#ed5e5e',
    600: '#e72727',
    700: '#c51616',
    800: '#a51212',
    900: '#8e1010',
};

// A normal red for Stop / Delete / errors, rather than the pink-leaning crimson
// this used to be. It still has to stay apart from the brand red or "Archive"
// and "Delete" sitting next to each other become the same button — so danger is
// darker and more saturated, brand is lighter and softer. Separated by
// lightness, not hue.
const danger = {
    50: '#fdf3f3',
    100: '#fbe0e0',
    200: '#f5bcbc',
    300: '#e88d8d',
    400: '#d95c5c',
    500: '#c92a2a',
    600: '#b02020',
    700: '#8f1a1a',
    800: '#731717',
    900: '#5c1414',
};

// Upstream's "neutral" scale sat at hue 209-216 with up to 24% saturation,
// which is not a grey — it is blue, and it tinted every surface in the panel.
// Rebuilt on hue 0 at a few percent saturation: reads as grey, but leans very
// slightly warm so it sits under the brand red rather than fighting it.
//
// Lightness values are carried over verbatim from the old scale so every
// existing contrast pairing in the UI still holds.
// 50-500 are text tones; 600-900 are surfaces and borders. The dark end is
// pitched to match the login stage (#0a0a0a page, near-black cards) so the
// panel and the auth screens read as one product.
const gray = {
    50: '#f7f7f7',
    100: '#e8e8e8',
    200: '#d1d1d1',
    300: '#a6a6a6',
    400: '#8a8a8a',
    500: '#6e6e6e',
    600: '#262626',
    700: '#171717',
    800: '#101010',
    900: '#0a0a0a',
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
                // Was #131a20 — a blue near-black. Same lightness, no hue.
                black: '#171717',
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
