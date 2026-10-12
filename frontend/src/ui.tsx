import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from './theme';

const LOGO = require('../assets/images/nur-logo-header.png');

export function GoldDivider({ withSymbol = true, marginV = 0 }: { withSymbol?: boolean; marginV?: number }) {
  return (
    <View style={[styles.dividerWrap, { marginVertical: marginV }]}>
      <View style={styles.dividerLine} />
      {withSymbol ? <Text style={styles.dividerSymbol}>◆</Text> : null}
      <View style={styles.dividerLine} />
    </View>
  );
}

type BrandHeaderProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  logoWidth?: number;
};

const LOGO_RATIO = 915 / 352;

/**
 * The single header used across the app: the real Nūr Protocol logo, centred,
 * with an optional screen title underneath. No stretched gold eyebrow text.
 */
export function BrandHeader({ title, subtitle, onBack, right, logoWidth = 124 }: BrandHeaderProps) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerSide}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={14} style={styles.backBtn} testID="header-back">
              <Feather name="chevron-left" size={22} color={theme.color.onSurface} />
            </Pressable>
          ) : null}
        </View>
        <Image
          source={LOGO}
          style={{ width: logoWidth, height: logoWidth / LOGO_RATIO }}
          resizeMode="contain"
          accessibilityLabel="Nūr Protocol"
        />
        <View style={[styles.headerSide, styles.headerSideRight]}>{right}</View>
      </View>
      {title ? (
        <Text style={styles.headerTitle} numberOfLines={2}>
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text style={styles.headerSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** Small gold caption. Single line, shrinks instead of breaking mid-word. */
export function Wordmark({ label }: { label: string }) {
  return (
    <Text style={styles.caption} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
      {label}
    </Text>
  );
}

export function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={styles.section} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  dividerWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.color.borderGold, maxWidth: 80 },
  dividerSymbol: { color: theme.color.brand, fontSize: 8, fontFamily: theme.font.sans, opacity: 0.7 },
  headerWrap: { alignItems: 'center', paddingTop: theme.spacing.sm, gap: theme.spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  headerSide: { width: 56, alignItems: 'flex-start' },
  headerSideRight: { alignItems: 'flex-end' },
  backBtn: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: {
    ...theme.type.h1,
    color: theme.color.onSurface,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  headerSubtitle: {
    ...theme.type.bodySm,
    color: theme.color.onSurfaceSecondary,
    textAlign: 'center',
  },
  caption: {
    ...theme.type.label,
    color: theme.color.brand,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  section: {
    ...theme.type.label,
    color: theme.color.brand,
    textTransform: 'uppercase',
  },
});
