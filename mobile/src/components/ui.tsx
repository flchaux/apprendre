import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

/** Contenu défilant d'un écran, centré et limité en largeur sur grand écran. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  edges = ['bottom'],
  contentStyle,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ('top' | 'bottom')[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[
        styles.screenContent,
        {
          paddingTop: (edges.includes('top') ? insets.top : 0) + spacing.lg,
          paddingBottom: (edges.includes('bottom') ? insets.bottom : 0) + spacing.xl,
        },
        contentStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.brand]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, dark } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        !dark && styles.cardShadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, style]}>
      {children}
    </Text>
  );
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, style]}>
      {children}
    </Text>
  );
}

export function Body({
  children,
  muted,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { colors } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[styles.body, { color: muted ? colors.muted : colors.text }, style]}>
      {children}
    </Text>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.brand, fg: '#ffffff', border: colors.brand },
    secondary: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
    ghost: { bg: 'transparent', fg: colors.primary, border: colors.border },
    danger: { bg: colors.badSoft, fg: colors.bad, border: colors.badSoft },
  };
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: p.bg, borderColor: p.border, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={p.fg} /> : null}
          <Text style={[styles.buttonLabel, { color: p.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function ProgressBar({
  value,
  color,
  trackColor,
  height = 8,
  label,
}: {
  /** Entre 0 et 1. */
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  label?: string;
}) {
  const { colors } = useTheme();
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={{ height, borderRadius: height / 2, backgroundColor: trackColor ?? colors.surface2, overflow: 'hidden' }}
    >
      <View style={{ width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: color ?? colors.brand }} />
    </View>
  );
}

export function Loading({ label = 'Chargement…' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]} accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.bg, padding: spacing.xl }]}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.muted} />
      <Body style={{ textAlign: 'center', marginVertical: spacing.md }}>{message}</Body>
      {onRetry ? <Button label="Réessayer" icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'bad' | 'ok' | 'warn'; children: ReactNode }) {
  const { colors } = useTheme();
  const map = {
    info: [colors.primarySoft, colors.primary],
    bad: [colors.badSoft, colors.bad],
    ok: [colors.okSoft, colors.ok],
    warn: [colors.warnSoft, colors.warn],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 15, lineHeight: 21 }}>{children}</Text>
    </View>
  );
}

export function TextField({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.surface, borderColor: focused ? colors.primary : colors.border },
          props.style,
        ]}
      />
    </View>
  );
}

/** Tuile de statistique : grand chiffre et libellé. */
export function StatTile({ value, label, icon, color }: { value: string; label: string; icon: IconName; color?: string }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.tile}>
      <View accessible accessibilityLabel={`${label} : ${value}`}>
        <Ionicons name={icon} size={20} color={color ?? colors.primary} />
        <Text style={[styles.tileValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.tileLabel, { color: colors.muted }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Card>
  );
}

/** Pastille sélectionnable (filtres). */
export function Chip({ label, selected, onPress, color }: { label: string; selected: boolean; onPress: () => void; color?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={{ color: selected ? colors.primary : colors.text, fontWeight: '600' }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Réglage numérique avec boutons – et +. */
export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  format = String,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  label: string;
}) {
  const { colors } = useTheme();
  const btn = (icon: IconName, delta: number, a11y: string) => {
    const next = Math.max(min, Math.min(max, value + delta));
    const disabled = next === value;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${a11y} ${label}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onChange(next)}
        style={({ pressed }) => [
          styles.stepBtn,
          { backgroundColor: colors.primarySoft, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        ]}
      >
        <Ionicons name={icon} size={22} color={colors.primary} />
      </Pressable>
    );
  };
  return (
    <View
      style={styles.stepper}
      accessible={false}
      accessibilityLabel={label}
      accessibilityValue={{ text: format(value) }}
    >
      {btn('remove', -step, 'Diminuer')}
      <Text style={[styles.stepValue, { color: colors.text }]} accessibilityLabel={`${label} : ${format(value)}`}>
        {format(value)}
      </Text>
      {btn('add', step, 'Augmenter')}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg },
  cardShadow: {
    shadowColor: '#141832',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 23 },
  button: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notice: { borderRadius: radius.sm, padding: spacing.md },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { minHeight: MIN_TOUCH, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.md, fontSize: 16 },
  tile: { flex: 1, padding: spacing.md, minHeight: 104 },
  tileValue: { fontSize: 24, fontWeight: '800', marginTop: 6 },
  tileLabel: { fontSize: 13, marginTop: 2 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 240,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 72, textAlign: 'center', fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
