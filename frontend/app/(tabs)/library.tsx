import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { api, LedColor } from '../../src/api';

export default function Library() {
  const [colors, setColors] = useState<LedColor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.ledLibrary();
        setColors(r.colors);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <View style={[styles.root, styles.center]}><ActivityIndicator color={theme.color.brand} /></View>;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>BIBLIOTHÈQUE</Text>
          <Text style={styles.title} testID="library-title">6 Lumières LED</Text>
          <Text style={styles.subtle}>Chaque couleur cible un besoin spécifique de votre peau.</Text>

          {colors.map((c) => (
            <View key={c.id} style={styles.card} testID={`led-card-${c.id}`}>
              <View style={[styles.cardGlow, { backgroundColor: c.color_hex, shadowColor: c.color_hex }]} />
              <View style={styles.cardHeader}>
                <View style={[styles.colorChip, { backgroundColor: c.color_hex, shadowColor: c.color_hex }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.colorName, { color: c.color_hex }]}>{c.name}</Text>
                  <Text style={styles.wavelength}>{c.wavelength}</Text>
                </View>
              </View>
              <Text style={styles.tagline}>{c.tagline}</Text>

              <Text style={styles.miniLabel}>Bénéfices</Text>
              {c.benefits.map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Feather name="check" size={12} color={c.color_hex} />
                  <Text style={styles.benefitTxt}>{b}</Text>
                </View>
              ))}

              <Text style={styles.miniLabel}>Indications</Text>
              <View style={styles.chipsRow}>
                {c.best_for.map((b) => (
                  <View key={b} style={[styles.chip, { borderColor: `${c.color_hex}66` }]}>
                    <Text style={[styles.chipTxt, { color: c.color_hex }]}>{b}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.footerRow}>
                <Feather name="clock" size={12} color={theme.color.onSurfaceSecondary} />
                <Text style={styles.footerTxt}>{c.session_minutes} min par séance</Text>
              </View>
            </View>
          ))}

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
  subtle: { color: theme.color.onSurfaceSecondary, fontSize: 13, marginTop: 4, marginBottom: theme.spacing.lg, lineHeight: 20 },
  card: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.color.border,
    overflow: 'hidden',
    gap: theme.spacing.sm,
  },
  cardGlow: { position: 'absolute', width: 140, height: 140, borderRadius: 999, right: -50, top: -50, opacity: 0.15, shadowOpacity: 0.5, shadowRadius: 40, shadowOffset: { width: 0, height: 0 } },
  cardHeader: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' },
  colorChip: { width: 36, height: 36, borderRadius: 999, shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  colorName: { fontFamily: theme.font.serif, fontSize: 22 },
  wavelength: { color: theme.color.onSurfaceSecondary, fontSize: 11, letterSpacing: 1 },
  tagline: { color: theme.color.onSurfaceTertiary, fontSize: 13, fontStyle: 'italic' },
  miniLabel: { color: theme.color.brand, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginTop: theme.spacing.md },
  benefitRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 3 },
  benefitTxt: { color: theme.color.onSurfaceTertiary, fontSize: 13 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { borderWidth: 1, borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  chipTxt: { fontSize: 11, fontWeight: '600' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.color.divider },
  footerTxt: { color: theme.color.onSurfaceSecondary, fontSize: 12 },
});
