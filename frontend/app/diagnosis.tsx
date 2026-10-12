import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { theme, LED_COLORS } from '../src/theme';
import { api, getStoredUserId, DiagnosisRecord } from '../src/api';

const SCORE_LABELS: Record<string, string> = {
  hydration: 'Hydratation',
  oil: 'Sébum',
  pores: 'Pores',
  redness: 'Rougeurs',
  sensitivity: 'Sensibilité',
  pigmentation: 'Pigmentation',
  wrinkles: 'Rides',
  glow: 'Éclat',
};

export default function Diagnosis() {
  const router = useRouter();
  const [record, setRecord] = useState<DiagnosisRecord | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const uid = await getStoredUserId();
        if (!uid) throw new Error('No user');
        const r = await api.getDiagnosis(uid);
        setRecord(r);
      } catch (e: any) {
        setErr(e?.message || 'Erreur');
      }
    })();
  }, []);

  if (err) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={['top', 'bottom']}>
        <Text style={styles.errorTxt}>{err}</Text>
      </SafeAreaView>
    );
  }
  if (!record) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.color.brand} />
      </View>
    );
  }

  const { scores, primary_concerns, summary, routine_advice, lifestyle_advice, protocol } = record.data;

  return (
    <View style={styles.root}>
      <LinearGradient colors={[theme.color.brandTint, theme.color.surface]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.headerRow}>
          <Text style={styles.kicker}>VOTRE BILAN BEAUTÉ</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title} testID="diagnosis-title">Votre profil beauté</Text>
          <Text style={styles.summary}>{summary}</Text>

          <Text style={styles.section}>Axes prioritaires</Text>
          <View style={styles.chips}>
            {primary_concerns?.map((c) => (
              <View key={c} style={styles.chip}>
                <View style={styles.chipDot} />
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>Indicateurs beauté</Text>
          <View style={styles.grid}>
            {Object.entries(scores).map(([k, v]) => (
              <ScoreCard key={k} label={SCORE_LABELS[k] || k} value={v} />
            ))}
          </View>

          <Text style={styles.section}>Rituel LED hebdomadaire</Text>
          <View style={styles.weekRow}>
            {protocol.weekly_schedule.map((d) => {
              const c = d.led_color_id ? LED_COLORS[d.led_color_id] : null;
              return (
                <View key={d.day} style={styles.dayCol}>
                  <Text style={styles.dayLabel}>{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'][d.day - 1]}</Text>
                  <View
                    style={[
                      styles.dayOrb,
                      c
                        ? { backgroundColor: c.hex, shadowColor: c.hex, shadowOpacity: 0.7 }
                        : { backgroundColor: theme.color.surfaceTertiary, borderWidth: 1, borderColor: theme.color.border },
                    ]}
                  />
                  <Text style={styles.dayMin}>{d.session_minutes ? `${d.session_minutes}m` : '—'}</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.expected}>
            Résultats attendus en {protocol.total_weeks || 8} semaines : {protocol.expected_results}
          </Text>

          <Text style={styles.section}>Conseils rituel</Text>
          {routine_advice?.map((a, i) => (
            <View key={i} style={styles.adviceRow}>
              <Feather name="droplet" size={14} color={theme.color.brand} />
              <Text style={styles.adviceTxt}>{a}</Text>
            </View>
          ))}

          <Text style={styles.section}>Bien-être au quotidien</Text>
          {lifestyle_advice?.map((a, i) => (
            <View key={i} style={styles.adviceRow}>
              <Feather name="heart" size={14} color={theme.color.brand} />
              <Text style={styles.adviceTxt}>{a}</Text>
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.ctaWrap}>
          <Pressable style={styles.cta} onPress={() => router.replace('/(tabs)/home')} testID="goto-home">
            <Text style={styles.ctaText}>Démarrer mon rituel</Text>
            <Feather name="arrow-right" size={18} color={theme.color.onBrand} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const tone = value >= 75 ? theme.color.success : value >= 50 ? theme.color.brand : theme.color.error;
  return (
    <View style={styles.scoreCard}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={[styles.scoreValue, { color: tone }]}>{value}</Text>
      <View style={styles.scoreBar}>
        <View style={[styles.scoreFill, { width: `${value}%`, backgroundColor: tone }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerRow: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.sm, alignItems: 'center' },
  kicker: { color: theme.color.brand, letterSpacing: 3, fontSize: 11, fontWeight: '600' },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 32, marginBottom: theme.spacing.sm },
  summary: { color: theme.color.onSurfaceTertiary, fontSize: 14, lineHeight: 22 },
  section: { color: theme.color.onSurface, fontSize: 12, letterSpacing: 2, fontWeight: '700', marginTop: theme.spacing.xl, marginBottom: theme.spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.pill, backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.brand },
  chipDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: theme.color.brand },
  chipText: { color: theme.color.brand, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, justifyContent: 'space-between' },
  scoreCard: { width: '48%', backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.lg, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.color.border, gap: theme.spacing.sm },
  scoreLabel: { color: theme.color.onSurfaceSecondary, fontSize: 12, letterSpacing: 1 },
  scoreValue: { fontSize: 28, fontFamily: theme.font.serif },
  scoreBar: { height: 4, backgroundColor: theme.color.divider, borderRadius: 4, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 4 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.color.surfaceSecondary, padding: theme.spacing.lg, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.color.border },
  dayCol: { alignItems: 'center', gap: 6, flex: 1 },
  dayLabel: { color: theme.color.onSurfaceSecondary, fontSize: 11 },
  dayOrb: { width: 22, height: 22, borderRadius: 999, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  dayMin: { color: theme.color.onSurfaceTertiary, fontSize: 10 },
  expected: { color: theme.color.onSurfaceSecondary, fontSize: 13, marginTop: theme.spacing.md, lineHeight: 20, fontStyle: 'italic' },
  adviceRow: { flexDirection: 'row', gap: theme.spacing.sm, paddingVertical: 8, alignItems: 'flex-start' },
  adviceTxt: { color: theme.color.onSurfaceTertiary, fontSize: 13, lineHeight: 20, flex: 1 },
  ctaWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xl, backgroundColor: 'rgba(9,9,12,0.92)' },
  cta: { backgroundColor: theme.color.brand, borderRadius: theme.radius.pill, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing.sm },
  ctaText: { color: theme.color.onBrand, fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  errorTxt: { color: theme.color.error },
});
