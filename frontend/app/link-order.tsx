import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { theme } from '../src/theme';
import { GoldDivider, Wordmark } from '../src/ui';
import { api, getStoredUserId } from '../src/api';
import { useT } from '../src/i18n';

export default function LinkOrder() {
  const router = useRouter();
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    const e = email.trim().toLowerCase();
    const o = order.trim();
    if (!e && !o) return;
    Keyboard.dismiss();
    setBusy(true); setErr(null);
    try {
      const uid = await getStoredUserId();
      if (!uid) throw new Error('no user');
      await api.linkOrder(uid, e ? { email: e } : { order_number: o });
      setDone(true);
    } catch (e2: any) {
      const m = String(e2?.message || '');
      if (m.includes('shopify_not_configured') || m.includes('shopify_unavailable') || m.includes('502')) setErr(t('trial.unavailable'));
      else setErr(t('trial.not_found'));
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <LinearGradient colors={theme.gradient.page} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back} testID="link-order-back">
            <Feather name="chevron-left" size={24} color={theme.color.onSurface} />
          </Pressable>

          <View style={styles.iconCircle}>
            <Feather name={done ? 'check' : 'package'} size={23} color={theme.color.brand} />
          </View>
          <Wordmark label="NŪR PROTOCOL" />
          <Text style={styles.title}>{done ? t('trial.verified') : t('trial.title')}</Text>
          <GoldDivider marginV={theme.spacing.md} />
          <Text style={styles.sub}>{done ? t('trial.ok') : t('trial.sub')}</Text>

          {done ? (
            <Pressable style={styles.cta} onPress={() => router.back()} testID="link-order-done">
              <Text style={styles.ctaTxt}>{t('common.continue')}</Text>
              <Feather name="arrow-right" size={16} color={theme.color.onBrand} />
            </Pressable>
          ) : (
            <>
              <TextInput
                value={email}
                onChangeText={(v) => { setEmail(v); setOrder(''); setErr(null); }}
                placeholder={t('trial.email_placeholder')}
                placeholderTextColor={theme.color.onSurfaceSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                inputMode="email"
                style={[styles.input, styles.inputEmail, !!err && styles.inputErr]}
                testID="link-order-email"
              />
              <Text style={styles.or}>—</Text>
              <TextInput
                value={order}
                onChangeText={(v) => { setOrder(v); setEmail(''); setErr(null); }}
                placeholder={t('trial.order_placeholder')}
                placeholderTextColor={theme.color.onSurfaceSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, !!err && styles.inputErr]}
                testID="link-order-number"
              />
              {err ? <Text style={styles.err} testID="link-order-error">{err}</Text> : null}
              <Pressable
                style={[styles.cta, (busy || (!email && !order)) && { opacity: 0.45 }]}
                onPress={submit}
                disabled={busy || (!email && !order)}
                testID="link-order-submit"
              >
                {busy ? <ActivityIndicator color={theme.color.onBrand} /> : (
                  <>
                    <Text style={styles.ctaTxt}>{t('trial.cta')}</Text>
                    <Feather name="arrow-right" size={16} color={theme.color.onBrand} />
                  </>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  scroll: { padding: theme.spacing.xl, flexGrow: 1, justifyContent: 'center' },
  back: { position: 'absolute', top: 0, left: theme.spacing.xl },
  iconCircle: {
    alignSelf: 'center', width: 66, height: 66, borderRadius: 999,
    backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.brand,
    alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg,
    shadowColor: theme.color.brand, shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 0 },
  },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 28, textAlign: 'center', marginTop: theme.spacing.md },
  sub: { color: theme.color.onSurfaceSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  input: {
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderGold,
    borderRadius: theme.radius.md, padding: 18, color: theme.color.onSurface, fontSize: 16,
    marginTop: theme.spacing.lg, textAlign: 'center', fontFamily: theme.font.mono, letterSpacing: 1,
  },
  inputEmail: { fontFamily: theme.font.sans, letterSpacing: 0.3 },
  inputErr: { borderColor: theme.color.error },
  or: { color: theme.color.onSurfaceSecondary, textAlign: 'center', marginTop: theme.spacing.md, fontSize: 12 },
  err: { color: theme.color.error, fontSize: 12, textAlign: 'center', marginTop: theme.spacing.md, lineHeight: 18 },
  cta: {
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    marginTop: theme.spacing.xl, ...theme.shadow.cta,
  },
  ctaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 14, letterSpacing: 1 },
});
