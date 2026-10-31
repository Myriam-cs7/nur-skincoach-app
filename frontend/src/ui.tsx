import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme, makeStyles, getScheme } from './theme';

const LOGO_DARK = require('../assets/images/nur-logo-header.png');
const LOGO_LIGHT = require('../assets/images/nur-logo-header-light.png');

/** A single champagne hairline. No ornament, no symbol. */
export function GoldDivider({ marginV = 0 }: { marginV?: number }) {
  return <View style={[styles.rule, { marginVertical: marginV }]} />;
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
 * The single header used across the app: the Nūr Protocol logo, centred, with
 * the screen title underneath and an optional signature line.
 */
export function BrandHeader({ title, subtitle, onBack, right, logoWidth = 116 }: BrandHeaderProps) {
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
          source={getScheme() === 'light' ? LOGO_LIGHT : LOGO_DARK}
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
        <Text style={styles.headerSubtitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
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

const styles = makeStyles(() => ({
  rule: { height: 1, alignSelf: 'stretch', backgroundColor: theme.color.borderGold },
  headerWrap: { alignItems: 'center', paddingTop: theme.spacing.sm, gap: theme.spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  headerSide: { width: 56, alignItems: 'flex-start' },
  headerSideRight: { alignItems: 'flex-end' },
  backBtn: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: {
    ...theme.type.h1,
    color: theme.color.onSurface,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  headerSubtitle: {
    ...theme.type.label,
    color: theme.color.brand,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  caption: {
    ...theme.type.label,
    color: theme.color.brand,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  section: {
    ...theme.type.label,
    color: theme.color.onSurfaceSecondary,
    textTransform: 'uppercase',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
}));
