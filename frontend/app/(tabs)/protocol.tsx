import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme, LED_COLORS, DAYS_FR } from '../../src/theme';
import { api, getStoredUserId, DiagnosisRecord } from '../../src/api';

const DAY_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function Protocol() {
  const [diag, setDiag] = useState<DiagnosisRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const uid = await getStoredUserId();
        if (!uid) return;
        const d = await api.getDiagnosis(uid);
        setDiag(d);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return <View style={[styles.root, styles.center]}><ActivityIndicator color={theme.color.brand} /></View>;
  }

  if (!diag) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={['top']}>
        <Text style={styles.subtle}>Aucun protocole disponible.</Text>
      </SafeAreaView>
    );
  }

  const { protocol } = diag.data;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>VOTRE RITUEL</Text>
          <Text style={styles.title} testID="protocol-title">Rituel hebdomadaire</Text>
          <Text style={styles.subtle}>Programme beauté sur {protocol.total_weeks} semaines, adapté à votre profil.</Text>

          <View style={styles.timeline}>
            {protocol.weekly_schedule.map((d, idx) => {
              const c = d.led_color_id ? LED_COLORS[d.led_color_id] : null;
              const isLast = idx === protocol.weekly_schedule.length - 1;
              return (
                <View key={d.day} style={styles.row}>
                  <View style={styles.lineCol}>
                    <View style={[styles.dot, c ? { backgroundColor: c.hex, shadowColor: c.hex, shadowOpacity: 0.8 } : styles.dotRest]} />
                    {!isLast && <View style={styles.line} />}
                  </View>
                  <View style={styles.dayBlock}>
                    <Text style={styles.dayName}>{DAY_FULL[d.day - 1]}</Text>
                    {c ? (
                      <>
                        <Text style={[styles.colorName, { color: c.hex }]}>Lumière {c.name}</Text>
                        <Text style={styles.metaTxt}>{d.session_minutes} min · {d.notes}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.colorName, { color: theme.color.onSurfaceSecondary }]}>Pause</Text>
                        <Text style={styles.metaTxt}>Journée sans séance</Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.expectedCard}>
            <Feather name="target" size={16} color={theme.color.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.expectedTitle}>Résultats attendus</Text>
              <Text style={styles.expectedTxt}>{protocol.expected_results}</Text>
              <Text style={styles.metaTxt}>Sur {protocol.total_weeks} semaines</Text>
            </View>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xxl },
  kicker: { color: theme.color.brand, letterSpacing: 3, fontSize: 11, fontWeight: '600' },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 30, marginTop: theme.spacing.sm },
  subtle: { color: theme.color.onSurfaceSecondary, fontSize: 13, marginTop: 4, lineHeight: 20 },
  timeline: { marginTop: theme.spacing.xl },
  row: { flexDirection: 'row', gap: theme.spacing.lg },
  lineCol: { width: 16, alignItems: 'center' },
  dot: { width: 16, height: 16, borderRadius: 999, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  dotRest: { backgroundColor: theme.color.surfaceTertiary, borderWidth: 1, borderColor: theme.color.border },
  line: { width: 1, flex: 1, backgroundColor: theme.color.border, marginTop: 4 },
  dayBlock: { flex: 1, paddingBottom: theme.spacing.xl, gap: 2 },
  dayName: { color: theme.color.onSurface, fontSize: 15, fontWeight: '600' },
  colorName: { fontFamily: theme.font.serif, fontSize: 20, marginTop: 2 },
  metaTxt: { color: theme.color.onSurfaceSecondary, fontSize: 12 },
  expectedCard: { flexDirection: 'row', gap: theme.spacing.md, backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.lg, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.color.border },
  expectedTitle: { color: theme.color.onSurface, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  expectedTxt: { color: theme.color.onSurfaceTertiary, fontSize: 13, lineHeight: 20, marginBottom: 4 },
});
