import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { GoldDivider, BrandHeader } from '../../src/ui';
import { LED_ORDER, LED_META, ledText } from '../../src/led';
import { useT } from '../../src/i18n';

export default function Library() {
  const { t, lang } = useT();

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <BrandHeader title={t('library.title')} subtitle={t('tab.library')} />
          <Text style={styles.hiddenTitle} testID="library-title">{t('library.title')}</Text>
          <GoldDivider marginV={theme.spacing.md} />
          <Text style={styles.subtle}>{t('library.sub')}</Text>

          {LED_ORDER.map((id) => {
            const info = ledText(id, lang);
            const hex = LED_META[id].hex;
            return (
              <View key={id} style={styles.card} testID={`led-card-${id}`}>
                <View style={[styles.cardGlow, { backgroundColor: hex }]} />
                <View style={styles.cardHeader}>
                  <View style={[styles.colorChip, { backgroundColor: hex }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.colorName, { color: hex }]}>{info.name}</Text>
                    <Text style={styles.wavelength}>{info.wavelength}</Text>
                  </View>
                  <View style={[styles.taglinePill, { borderColor: `${hex}55` }]}>
                    <Text style={[styles.taglineTxt, { color: hex }]}>{info.tagline}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Feather name="zap" size={12} color={theme.color.brand} />
                  <Text style={styles.actionTxt}>{info.action}</Text>
                </View>

                <Text style={styles.miniLabel}>{t('library.indications')}</Text>
                <View style={styles.chipsRow}>
                  {info.best_for.map((b) => (
                    <View key={b} style={[styles.chip, { borderColor: `${hex}44`, backgroundColor: `${hex}1A` }]}>
                      <Text style={[styles.chipTxt, { color: hex }]}>{b}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.footerRow}>
                  <Feather name="clock" size={12} color={theme.color.onSurfaceSecondary} />
                  <Text style={styles.footerTxt}>{t('library.session', { n: LED_META[id].minutes })}</Text>
                </View>
              </View>
            );
          })}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // kept for accessibility/tests, visually replaced by BrandHeader
  hiddenTitle: { height: 0, opacity: 0, fontSize: 1, fontFamily: theme.font.sans },
  root: { flex: 1, backgroundColor: theme.color.surface },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 30, marginTop: theme.spacing.md },
  subtle: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, lineHeight: 20 },
  card: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.color.borderGold,
    overflow: 'hidden',
    gap: theme.spacing.sm,
  },
  cardGlow: { position: 'absolute', width: 140, height: 140, borderRadius: 999, right: -56, top: -56, opacity: 0.18, shadowOpacity: 0.8, shadowRadius: 50, shadowOffset: { width: 0, height: 0 } },
  cardHeader: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' },
  colorChip: { width: 34, height: 34, borderRadius: 999 },
  colorName: { fontFamily: theme.font.serif, fontSize: 21 },
  wavelength: { color: theme.color.onSurfaceSecondary, fontSize: 11, fontFamily: theme.font.sans, letterSpacing: 0.8 },
  taglinePill: { borderWidth: 1, borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  taglineTxt: { fontSize: 10, fontFamily: theme.font.sansMedium, fontWeight: '700', letterSpacing: 0.4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: 2 },
  actionTxt: { color: theme.color.onSurfaceTertiary, fontSize: 13, fontFamily: theme.font.sans, fontStyle: 'italic', flex: 1 },
  miniLabel: { color: theme.color.brand, fontSize: 10, fontFamily: theme.font.sansMedium, letterSpacing: 2, fontWeight: '700', marginTop: theme.spacing.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip: { borderWidth: 1, borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  chipTxt: { fontSize: 11, fontFamily: theme.font.sansMedium, fontWeight: '600' },
  footerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.color.divider,
  },
  footerTxt: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontFamily: theme.font.sans },
});
