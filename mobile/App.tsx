import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2AABEE',
    secondary: '#229ED9',
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="light" />
      </NavigationContainer>
    </PaperProvider>
  );
}
