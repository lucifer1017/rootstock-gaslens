/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'rsk-green': '#00B171', // The primary Rootstock green
                'rsk-dark-1': '#1A1A1A', // Card/component backgrounds
                'rsk-dark-2': '#222222', // Main page background
            },
        },
    },
    plugins: [],
}

