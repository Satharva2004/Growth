import React from 'react';
import { ImageBackground, StyleSheet, ViewStyle } from 'react-native';

const NOISE_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAA5OTkAAABQUFBNTU1ERERKSkpPT098R617AAAACHRSTlMAMwA1MzMzM7O0s14AAABSSURBVDjLpZLBAYAgDAStrIM4gC6i/462xwcXPJ0Ff016S0tL1tPp5F5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXv/X09PT09PT09vbO6nZ7m2OAAAAAElFTkSuQmCC";

interface NoiseTextureProps {
    style?: ViewStyle;
    opacity?: number;
}

export const NoiseTexture = ({ style, opacity = 0.05 }: NoiseTextureProps) => {
    return (
        <ImageBackground
            source={{ uri: NOISE_URI }}
            resizeMode="repeat"
            style={[styles.container, { opacity }, style]}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },
});
