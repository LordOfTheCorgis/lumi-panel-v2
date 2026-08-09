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

const gray = {
    50: 'hsl(216, 33%, 97%)',
    100: 'hsl(214, 15%, 91%)',
    200: 'hsl(210, 16%, 82%)',
    300: 'hsl(211, 13%, 65%)',
    400: 'hsl(211, 10%, 53%)',
    500: 'hsl(211, 12%, 43%)',
    600: 'hsl(209, 14%, 37%)',
    700: 'hsl(209, 18%, 30%)',
    800: 'hsl(209, 20%, 25%)',
    900: 'hsl(210, 24%, 16%)',
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
                black: '#131a20',
                // Brand color. Prefer "lumi" in new code; "primary", "blue" and "cyan"
                // are aliases kept so upstream Pterodactyl markup picks up the brand
                // without a rewrite.
                lumi: lumi,
                primary: lumi,
                blue: lumi,
                cyan: lumi,
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
