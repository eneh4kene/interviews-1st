/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
        '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                bg: 'var(--bg)',
                surface: 'var(--surface)',
                border: 'var(--border)',
                text: 'var(--text)',
                muted: 'var(--muted)',
                primary: {
                    DEFAULT: 'var(--primary)',
                    600: 'var(--primary-600)',
                    700: 'var(--primary-700)'
                },
                success: {
                    DEFAULT: 'var(--success)',
                    2: 'var(--success-2)'
                }
            },
            borderRadius: {
                DEFAULT: 'var(--radius)',
                lg: 'var(--radius-lg)'
            },
            boxShadow: {
                brand: 'var(--shadow)'
            },
            transitionDuration: {
                'fast': 'var(--dur-fast)',
                'normal': 'var(--dur)'
            },
            transitionTimingFunction: {
                'brand': 'var(--ease)'
            }
        },
    },
    plugins: [require("tailwindcss-animate")],
} 