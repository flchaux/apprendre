import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function feedbackHaptic(correct: boolean): void {
  if (Platform.OS === 'web') return;
  void Haptics.notificationAsync(
    correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
  ).catch(() => undefined);
}
