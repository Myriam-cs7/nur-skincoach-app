import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { Feather } from '@expo/vector-icons';
import { theme, LED_COLORS, LED_NAMES_BY_LANG } from '../theme';
import { SectionLabel } from '../ui';
import { ProgressData } from '../api';
import { t, getLang } from '../i18n';

const CHART_W = Math.min(Dimensions.get('window').width, 520) - theme.spacing.xl * 2 - theme.spacing.lg * 2;

export default function ProgressCharts({ data }: { data: ProgressData }) {
  const lang = getLang();
  const hasSessions = data.total_sessions > 0;

  const barData = data.weekly.map((w, i) => ({
    value: w.sessions,
    label: w.label,
    frontColor: i === data.weekly.length - 1 ? theme.color.brand : theme.color.brandSoft,
    topLabelComponent: () =>
      w.sessions ? <Text style={styles.barTop}>{w.sessions}</Text> : null,
  }));
  const maxBar = Math.max(data.target_per_week, ...data.weekly.map((w) => w.sessions), 4) + 1;

  const scorePoints = data.score_history
    .map((h) => {
      const vals = Object.values(h.scores || {});
      if (!vals.length) return null;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return {
        value: Math.round(avg),
        label: new Date(h.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
          day: 'numeric',
          month: 'short',
        }),
      };
    })
    .filter(Boolean) as { value: number; label: string }[];

  const colorRows = Object.entries(data.per_color_minutes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxColor = Math.max(1, ...colorRows.map(([, v]) => v));

  return (
    <View style={{ marginTop: theme.spacing.xl }}>
      <SectionLabel label={t('prog.title')} />

      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiValue}>{data.total_sessions}</Text>
          <Text style={styles.kpiLabel}>{t('prog.total_sessions')}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiValue}>{data.total_minutes}</Text>
          <Text style={styles.kpiLabel}>{t('prog.total_minutes')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>{t('prog.adherence')}</Text>
          {data.target_per_week ? (
            <Text style={styles.cardHint}>{t('prog.target', { n: data.target_per_week })}</Text>
          ) : null}
        </View>
        {hasSessions ? (
          <View style={{ marginTop: theme.spacing.md, marginLeft: -8 }}>
            <BarChart
              data={barData}
              width={CHART_W}
              height={140}
              barWidth={26}
              barBorderRadius={6}
              spacing={(CHART_W - 4 * 26) / 5}
              initialSpacing={16}
              maxValue={maxBar}
              noOfSections={3}
              yAxisThickness={0}
              xAxisColor={theme.color.border}
              rulesColor={theme.color.border}
              rulesType="dashed"
              yAxisTextStyle={styles.axis}
              xAxisLabelTextStyle={styles.axis}
              showReferenceLine1={!!data.target_per_week}
              referenceLine1Position={data.target_per_week}
              referenceLine1Config={{ color: theme.color.brandLight, dashWidth: 4, dashGap: 6, thickness: 1 }}
              disablePress
            />
          </View>
        ) : (
          <Empty text={t('prog.empty')} />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('prog.scores')}</Text>
        {scorePoints.length >= 2 ? (
          <View style={{ marginTop: theme.spacing.lg, marginLeft: -8 }}>
            <LineChart
              data={scorePoints}
              width={CHART_W - 20}
              height={140}
              color={theme.color.brand}
              thickness={2}
              dataPointsColor={theme.color.brandLight}
              dataPointsRadius={4}
              maxValue={100}
              noOfSections={4}
              yAxisThickness={0}
              xAxisColor={theme.color.border}
              rulesColor={theme.color.border}
              rulesType="dashed"
              yAxisTextStyle={styles.axis}
              xAxisLabelTextStyle={styles.axis}
              curved
              areaChart
              startFillColor={theme.color.brand}
              startOpacity={0.18}
              endFillColor={theme.color.surfaceSecondary}
              endOpacity={0.01}
              disableScroll
            />
          </View>
        ) : (
          <Empty text={t('prog.scores_empty')} />
        )}
      </View>

      {colorRows.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('prog.colors')}</Text>
          <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.md }}>
            {colorRows.map(([id, minutes]) => {
              const hex = LED_COLORS[id]?.hex || theme.color.brand;
              const name = LED_NAMES_BY_LANG[lang]?.[id] || LED_COLORS[id]?.name || id;
              return (
                <View key={id} style={styles.colorRow}>
                  <View style={[styles.dot, { backgroundColor: hex, shadowColor: hex }]} />
                  <Text style={styles.colorName}>{name}</Text>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${(minutes / maxColor) * 100}%`, backgroundColor: hex }]} />
                  </View>
                  <Text style={styles.colorVal}>{minutes}′</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Feather name="bar-chart-2" size={18} color={theme.color.brand} />
      <Text style={styles.emptyTxt}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md },
  kpi: {
    flex: 1, backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md,
    padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.color.borderGold, gap: 4,
  },
  kpiValue: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 28 },
  kpiLabel: { color: theme.color.onSurfaceSecondary, fontSize: 10, fontFamily: theme.font.sans, letterSpacing: 1.4, textTransform: 'uppercase' },
  card: {
    marginTop: theme.spacing.md, backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md, padding: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.color.borderGold, overflow: 'hidden',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: theme.color.onSurface, fontSize: 13, fontFamily: theme.font.sansMedium, fontWeight: '600', letterSpacing: 0.3 },
  cardHint: { color: theme.color.brand, fontSize: 10, fontFamily: theme.font.sans, letterSpacing: 0.8 },
  axis: { color: theme.color.onSurfaceSecondary, fontSize: 10, fontFamily: theme.font.sans },
  barTop: { color: theme.color.brandLight, fontSize: 10, fontFamily: theme.font.sans, marginBottom: 2 },
  empty: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center', paddingVertical: theme.spacing.lg },
  emptyTxt: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontFamily: theme.font.sans, flex: 1, lineHeight: 18 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 999, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  colorName: { color: theme.color.onSurfaceTertiary, fontSize: 11, fontFamily: theme.font.sans, width: 62 },
  track: { flex: 1, height: 6, borderRadius: 999, backgroundColor: theme.color.surfaceTertiary, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 999 },
  colorVal: { color: theme.color.onSurfaceSecondary, fontSize: 10, fontFamily: theme.font.sans, width: 36, textAlign: 'right' },
});
