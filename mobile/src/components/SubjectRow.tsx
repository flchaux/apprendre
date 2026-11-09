import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Subject } from '@/api';
import { masteryRatio, pluralize } from '@/lib/leitner';
import { radius, spacing, useTheme } from '@/theme';
import { ProgressBar } from './ui';

export function SubjectRow({ subject }: { subject: Subject }) {
  const { colors } = useTheme();
  const ratio = masteryRatio(subject.mastered_count, subject.question_count);
  const pct = Math.round(ratio * 100);
  const details = [pluralize(subject.question_count, 'question')];
  if (subject.due_count > 0) details.push(`${subject.due_count} à réviser`);
  if (subject.new_count > 0) details.push(pluralize(subject.new_count, 'nouvelle'));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${subject.title}. ${details.join(', ')}. Maîtrise ${pct} %.`}
      accessibilityHint="Ouvre le sujet"
      onPress={() => router.push({ pathname: '/subject/[id]', params: { id: String(subject.id) } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.swatch, { backgroundColor: subject.color || colors.primary }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {subject.title}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>
          {details.join(' · ')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <ProgressBar value={ratio} color={subject.color || colors.brand} height={6} />
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'], minWidth: 34, textAlign: 'right' }}>
            {pct} %
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 72,
  },
  swatch: { width: 8, alignSelf: 'stretch', borderRadius: 4 },
  title: { fontSize: 16, fontWeight: '700' },
});
