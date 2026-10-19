/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"DM Sans"', 'Inter', 'system-ui', 'sans-serif'],
            },
            // Shared with the app's player-facing redesign: one court blue, its pale tints do the area work
            colors: {
                court: { DEFAULT: '#1F5FD6', soft: '#EEF4FE', track: '#D6E4FB', ink: '#123A7A', deep: '#174CB0' },
                rg: {
                    paper: '#F6F8FB',
                    raised: '#ECF0F5',
                    line: '#E3E7EE',
                    rule: '#EEF1F5',
                    control: '#CFD6E0',
                    ink: '#0F1729',
                    muted: '#586174',
                    night: '#0F1729',
                    'night-2': '#1A2438',
                    'on-night': '#E8ECF3',
                    'on-night-muted': '#A9B3C4',
                    positive: '#247B50',
                    negative: '#C4242A',
                },
            },
            fontSize: {
                // The five steps of the page
                display: ['clamp(84px, 12.5vw, 210px)', { lineHeight: '0.86', letterSpacing: '-0.045em' }],
                xl: ['clamp(36px, 4.6vw, 72px)', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
                l: ['clamp(24px, 2.2vw, 30px)', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
                m: ['18px', { lineHeight: '1.55' }],
                s: ['14px', { lineHeight: '1.45' }],
            },
        },
    },
    plugins: [],
}
