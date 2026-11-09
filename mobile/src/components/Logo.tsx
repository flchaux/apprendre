import { Image } from 'expo-image';

/** Logo de l'appli (chapeau de diplômé sur fond indigo), repris de public/favicon.svg. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/images/logo.png')}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      accessibilityLabel="Logo Apprendre"
      accessibilityRole="image"
    />
  );
}
