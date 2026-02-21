
// Exact neobank design palette
// #202020 black | #c9f158 lime | #f2f3f5 bg | #ffffff surface

export type CardShadow = {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
};

export type ThemeColors = {
    text: string;
    subtleText: string;
    background: string;
    surface: string;
    secondarySurface: string;
    primary: string;
    primaryText: string;
    accent: string;
    accentText: string;
    success: string;
    error: string;
    positive: string;
    negative: string;
    inputBackground: string;
    inputPlaceholder: string;
    tabIconDefault: string;
    tabIconSelected: string;
    tint: string;
    buttonBackground: string;
    buttonText: string;
    divider: string;
    cardShadow: CardShadow;
};

const SG = {
    regular: 'SpaceGrotesk_400Regular',
    medium: 'SpaceGrotesk_500Medium',
    semiBold: 'SpaceGrotesk_600SemiBold',
    bold: 'SpaceGrotesk_700Bold',
};

export const Fonts = SG;

const cardShadowLight: CardShadow = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
};

const cardShadowDark: CardShadow = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
};

const Colors: { light: ThemeColors; dark: ThemeColors } = {
    light: {
        text: '#202020',
        subtleText: '#888888',
        background: '#f2f3f5',
        surface: '#ffffff',
        secondarySurface: '#f2f3f5',
        primary: '#202020',
        primaryText: '#ffffff',
        accent: '#c9f158',
        accentText: '#202020',
        success: '#22C55E',
        error: '#EF4444',
        positive: '#22C55E',
        negative: '#202020',
        inputBackground: '#f2f3f5',
        inputPlaceholder: '#AAAAAA',
        tabIconDefault: '#888888',
        tabIconSelected: '#202020',
        tint: '#202020',
        buttonBackground: '#202020',
        buttonText: '#ffffff',
        divider: '#EBEBEB',
        cardShadow: cardShadowLight,
    },
    dark: {
        text: '#F0F4FF',
        subtleText: '#8892A4',
        background: '#0D1117',
        surface: '#161B25',
        secondarySurface: '#1E2535',
        primary: '#c9f158',
        primaryText: '#202020',
        accent: '#c9f158',
        accentText: '#202020',
        success: '#4ADE80',
        error: '#F87171',
        positive: '#c9f158',
        negative: '#F87171',
        inputBackground: '#1E2535',
        inputPlaceholder: '#4A5568',
        tabIconDefault: '#4A5568',
        tabIconSelected: '#c9f158',
        tint: '#c9f158',
        buttonBackground: '#c9f158',
        buttonText: '#202020',
        divider: '#2A3347',
        cardShadow: cardShadowDark,
    },
};

export default Colors;
