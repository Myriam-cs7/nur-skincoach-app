import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import { useT } from '../i18n';

type Props = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

/** Explicit consent before any face photo is analysed (analysed in memory, never stored). */
export default function PhotoConsentSheet({ visible, onAccept, onDecline }: Props) {
  const { t } = useT();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.icon}>
            <Feather name="lock" size={20} color={theme.color.brand} />
          </View>
          <Text style={styles.title}>{t('photoConsent.title')}</Text>
          <Text style={styles.body}>{t('photoConsent.body')}</Text>
          <View style={styles.bullets}>
            <Bullet text={t('photoConsent.p1')} />
            <Bullet text={t('photoConsent.p2')} />
            <Bullet text={t('photoConsent.p3')} />
          </View>
          <Pressable style={styles.cta} onPress={onAccept} testID="photo-consent-accept">
            <Text style={styles.ctaTxt}>{t('photoConsent.accept')}</Text>
          </Pressable>
          <Pressable onPress={onDecline} testID="photo-consent-decline">
            <Text style={styles.decline}>{t('photoConsent.decline')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Feather name="check" size={13} color={theme.color.brand} />
      <Text style={styles.bulletTxt}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,6,10,0.82)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.color.surfaceSecondary,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderTopWidth: 1,
    borderColor: theme.color.borderGold,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  icon: {
    width: 52, height: 52, borderRadius: 999, backgroundColor: theme.color.brandTint,
    borderWidth: 1, borderColor: theme.color.brand, alignItems: 'center', justifyContent: 'center',
  },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 22, textAlign: 'center' },
  body: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, lineHeight: 20, textAlign: 'center' },
  bullets: { gap: theme.spacing.sm, alignSelf: 'stretch', paddingVertical: theme.spacing.xs },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  bulletTxt: { color: theme.color.onSurfaceTertiary, fontSize: 12, fontFamily: theme.font.sans, lineHeight: 18, flex: 1 },
  cta: {
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill,
    paddingVertical: 15, paddingHorizontal: theme.spacing.xl, alignSelf: 'stretch',
    alignItems: 'center', ...theme.shadow.cta,
  },
  ctaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 13, fontFamily: theme.font.sansMedium, letterSpacing: 1 },
  decline: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, textDecorationLine: 'underline' },
});
