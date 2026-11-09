import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type Colors } from './colors';

export * from './colors';

export interface Theme {
  dark: boolean;
  colors: Colors;
}

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return { dark, colors: dark ? darkColors : lightColors };
}
