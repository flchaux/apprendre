import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, useTheme } from '@/theme';

/** Illustration d'une question ; un toucher l'ouvre en plein écran. */
export function QuestionImage({ uri }: { uri: string }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel="Illustration de la question"
        accessibilityHint="Touchez pour agrandir"
        onPress={() => setOpen(true)}
        style={[styles.frame, { backgroundColor: colors.surface2, borderColor: colors.border }]}
      >
        <Image source={{ uri }} style={styles.thumb} contentFit="contain" transition={150} cachePolicy="memory-disk" />
        <View style={styles.zoomBadge}>
          <Ionicons name="expand" size={16} color="#fff" />
        </View>
      </Pressable>
      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Fermer l’illustration"
        >
          <Image source={{ uri }} style={styles.full} contentFit="contain" cachePolicy="memory-disk" />
          <View style={[styles.close, { top: insets.top + 12 }]}>
            <Ionicons name="close" size={26} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  thumb: { width: '100%', height: 200 },
  zoomBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  full: { width: '100%', height: '100%' },
  close: {
    position: 'absolute',
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
