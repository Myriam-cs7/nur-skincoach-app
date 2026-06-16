import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from './theme';

export function GoldDivider({ withSymbol = true, marginV = 0 }: { withSymbol?: boolean; marginV?: number }) {
  return (
    <View style={[styles.dividerWrap, { marginVertical: marginV }]}>
      <View style={styles.dividerLine} />
      {withSymbol ? <Text style={styles.dividerSymbol}>◆</Text> : null}
      <View style={styles.dividerLine} />
    </View>
  );
}

export function Wordmark({ label }: { label: string }) {
  return (
    <View style={styles.wordmarkRow}>
      <View style={styles.wordmarkLine} />
      <Text style={styles.wordmarkText}>{label}</Text>
      <View style={styles.wordmarkLine} />
    </View>
  );
}

export function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.section}>{label}</Text>;
}

const styles = StyleSheet.create({
  dividerWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.color.borderGold, maxWidth: 80 },
  dividerSymbol: { color: theme.color.brand, fontSize: 8, opacity: 0.7 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  wordmarkLine: { width: 28, height: 1, backgroundColor: theme.color.brandSoft, opacity: 0.5 },
  wordmarkText: { color: theme.color.brand, letterSpacing: 6, fontSize: 11, fontWeight: '600', fontFamily: theme.font.sans },
  section: {
    color: theme.color.brand,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '700',
    fontFamily: theme.font.sans,
    textTransform: 'uppercase',
  },
});
