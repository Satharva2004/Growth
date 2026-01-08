
const pureBlack = '#000000';
const pureWhite = '#FFFFFF';
const offBlack = '#0A0A0A';
const offWhite = '#F0F0F0';
const wireframeGray = '#333333';
const accentGreen = '#00311F'; // Deep forest green accent

export default {
    light: {
        text: pureBlack,
        background: pureWhite,
        tint: accentGreen,
        tabIconDefault: '#ccc',
        tabIconSelected: accentGreen,
        // Gradients aren't really part of the wireframe look, but we'll keep a subtle one just in case
        gradientBackground: [pureWhite, offWhite, '#e5e5e5'],

        // Wireframe Specifics
        glassBackground: 'transparent',
        glassBorder: pureBlack,
        glassShadow: 'transparent',

        buttonGradient: [pureWhite, pureWhite], // Flat

        subtleText: '#666666',
        accentText: accentGreen,
        divider: pureBlack,

        surface: pureWhite,
        cardBorder: pureBlack,

        inputBackground: pureWhite,
        inputBorder: pureBlack,
        inputPlaceholder: '#666666',

        badgeBackground: accentGreen,
        badgeText: pureWhite,

        primary: accentGreen,
        primaryText: pureWhite,

        // Solana Seeker style specifics
        wireframeLine: pureBlack,
        gridDot: '#ddd',
        secondarySurface: pureWhite,
        toastSuccess: accentGreen,
        toastError: pureBlack,
    },
    dark: {
        text: pureWhite,
        background: pureBlack,
        tint: accentGreen,
        tabIconDefault: '#555',
        tabIconSelected: accentGreen,
        // Deep black gradient (essentially flat)
        gradientBackground: [pureBlack, pureBlack, offBlack],

        // Wireframe Specifics
        glassBackground: 'transparent', // or 'rgba(0,0,0,0.5)' if we need readability
        glassBorder: pureWhite,
        glassShadow: 'transparent',

        buttonGradient: [pureBlack, pureBlack], // Flat

        subtleText: '#AAAAAA',
        accentText: accentGreen,
        divider: pureWhite,

        surface: pureBlack,
        cardBorder: pureWhite,

        inputBackground: pureBlack,
        inputBorder: pureWhite,
        inputPlaceholder: '#666',

        badgeBackground: accentGreen,
        badgeText: pureWhite,

        primary: accentGreen,
        primaryText: pureWhite,

        // Solana Seeker style specifics
        wireframeLine: pureWhite,
        gridDot: '#333',
        secondarySurface: pureBlack,
        toastSuccess: accentGreen,
        toastError: pureWhite,
    },
};
