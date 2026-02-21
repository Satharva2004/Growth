import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as _useColorScheme } from 'react-native';
// If AsyncStorage is not installed, I'll skip persistence for now or use SecureStore (installed) or just memory.
// package.json has 'expo-secure-store'. Using that for persistence is okay for settings too, or I can just use memory state for this session.
// Let's stick to memory state for simplicity unless user asked for persistence across restarts explicitly (implied by "switch between").
// I will just use memory state for now to avoid introducing new deps or misusing secure store.

type Theme = 'light' | 'dark';

interface ThemeContextType {
    colorScheme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    colorScheme: 'light',
    toggleTheme: () => { },
});

export const CustomThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemScheme = _useColorScheme();
    const [theme, setTheme] = useState<Theme>('light');

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ colorScheme: theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
