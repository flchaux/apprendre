import { StyleSheet, Text, View } from 'react-native';
import type { Box, Stats, Subject } from '@/api';
import { fillActivity } from '@/lib/activity';
import { formatDayShort } from '@/lib/dates';
import { BOX_INTERVALS, BOX_LABELS, BOXES, pluralize } from '@/lib/leitner';
import { radius, spacing, useTheme, type Colors } from '@/theme';
import { Body, Card, Heading } from './ui';

function boxColor(box: Box, colors: Colors): string {
  // Du gris (nouvelles) au vert (maîtrisées), en passant par l'indigo.
  const scale = [colors.muted, '#f59e0b', '#a78bfa', '#818cf8', colors.brand, colors.ok];
  return scale[box];
}

export function BoxesChart({ stats }: { stats: Stats }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...BOXES.map((b) => stats.boxes[`${b}`] ?? 0));
  return (
    <Card style={{ gap: spacing.md }}>
      <Heading>Répartition par boîte</Heading>
      {BOXES.map((b) => {
        const n = stats.boxes[`${b}`] ?? 0;
        const interval = BOX_INTERVALS[b];
        return (
          <View
            key={b}
            accessible
            accessibilityLabel={`${BOX_LABELS[b]} : ${pluralize(n, 'question')}`}
            style={styles.boxRow}
          >
            <View style={{ width: 92 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{BOX_LABELS[b]}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {b === 0 ? 'jamais vues' : `tous les ${interval} j`}
              </Text>
            </View>
            <View style={[styles.boxTrack, { backgroundColor: colors.surface2 }]}>
              <View
                style={{
                  width: `${(n / max) * 100}%`,
                  minWidth: n > 0 ? 6 : 0,
                  height: '100%',
                  borderRadius: 6,
                  backgroundColor: boxColor(b, colors),
                }}
              />
            </View>
            <Text style={[styles.count, { color: colors.text }]}>{n}</Text>
          </View>
        );
      })}
    </Card>
  );
}

export function ActivityChart({ stats, days = 14 }: { stats: Stats; days?: number }) {
  const { colors } = useTheme();
  const data = fillActivity(stats.activity, stats.day, days);
  const max = Math.max(1, ...data.map((d) => d.answers));
  const total = data.reduce((acc, d) => acc + d.answers, 0);
  const correct = data.reduce((acc, d) => acc + d.correct, 0);
  return (
    <Card style={{ gap: spacing.md }}>
      <Heading>Activité des {days} derniers jours</Heading>
      <Body muted>
        {total === 0
          ? 'Aucune réponse sur la période.'
          : `${pluralize(total, 'réponse')}, dont ${correct} juste${correct > 1 ? 's' : ''} (${Math.round((correct / total) * 100)} %).`}
      </Body>
      <View style={styles.bars}>
        {data.map((d) => {
          const { weekday, date } = formatDayShort(d.day);
          const h = (d.answers / max) * 100;
          const okShare = d.answers ? d.correct / d.answers : 0;
          const isToday = d.day === stats.day;
          return (
            <View
              key={d.day}
              style={styles.barCol}
              accessible
              accessibilityLabel={`${weekday} ${date} : ${pluralize(d.answers, 'réponse')}, ${d.correct} juste${d.correct > 1 ? 's' : ''}`}
            >
              <View style={styles.barArea}>
                <View style={{ height: `${h}%`, minHeight: d.answers ? 4 : 0, width: '100%', borderRadius: 4, overflow: 'hidden', backgroundColor: colors.bad }}>
                  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${okShare * 100}%`, backgroundColor: colors.ok }} />
                </View>
                {d.answers === 0 ? <View style={[styles.zero, { backgroundColor: colors.border }]} /> : null}
              </View>
              <Text style={[styles.axis, { color: isToday ? colors.primary : colors.muted, fontWeight: isToday ? '800' : '500' }]}>
                {weekday}
              </Text>
              <Text style={[styles.axis, { color: isToday ? colors.primary : colors.muted }]}>{date}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <LegendDot color={colors.ok} label="Justes" />
        <LegendDot color={colors.bad} label="Fausses" />
      </View>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

export function HardestList({ stats, subjects }: { stats: Stats; subjects?: Subject[] }) {
  const { colors } = useTheme();
  const byId = new Map((subjects ?? []).map((s) => [s.id, s]));
  return (
    <Card style={{ gap: spacing.md }}>
      <Heading>Questions les plus difficiles</Heading>
      {stats.hardest_questions.length === 0 ? (
        <Body muted>Aucune erreur pour l’instant. Bravo !</Body>
      ) : (
        stats.hardest_questions.map((q, i) => {
          const subject = byId.get(q.subject_id);
          return (
            <View
              key={q.id}
              accessible
              accessibilityLabel={`${q.question}. ${pluralize(q.wrong_count, 'erreur')}, ${pluralize(q.correct_count, 'réussite')}, boîte ${q.box}.`}
              style={[styles.hardRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            >
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15, lineHeight: 21 }}>{q.question}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' }}>
                {subject ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: subject.color }} />
                    <Text style={{ color: colors.muted, fontSize: 13 }}>{subject.title}</Text>
                  </View>
                ) : null}
                <Text style={[styles.pill, { backgroundColor: colors.badSoft, color: colors.bad }]}>
                  {pluralize(q.wrong_count, 'erreur')}
                </Text>
                <Text style={[styles.pill, { backgroundColor: colors.okSoft, color: colors.ok }]}>
                  {pluralize(q.correct_count, 'réussite')}
                </Text>
                <Text style={[styles.pill, { backgroundColor: colors.surface2, color: colors.muted }]}>Boîte {q.box}</Text>
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  boxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  boxTrack: { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden' },
  count: { width: 36, textAlign: 'right', fontWeight: '700', fontVariant: ['tabular-nums'] },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barCol: { flex: 1, alignItems: 'center' },
  barArea: { height: 110, width: '100%', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 1 },
  zero: { height: 2, width: '100%', borderRadius: 1 },
  axis: { fontSize: 10, marginTop: 2 },
  legend: { flexDirection: 'row', gap: spacing.lg },
  hardRow: { gap: 6, paddingTop: spacing.sm },
  pill: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
});
