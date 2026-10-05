import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { theme } from '../src/theme';
import { GoldDivider, Wordmark } from '../src/ui';
import { api, setStoredUser } from '../src/api';
import { useT, getLang } from '../src/i18n';

type Mode = 'email' | 'code';

export default function Activate() {
  const router = useRouter();
  const { t } = useT();
  const params = useLocalSearchParams<{ code?: string; scanned?: string }>();
  const [mode, setMode] = useState<Mode>(params.code ? 'code' : 'email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(params.code ? String(params.code).toUpperCase() : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(params.scanned ? t('gate.card_ok') : null);

  useEffect(() => {
    if (params.code) { setMode('code'); setCode(String(params.code).toUpperCase()); }
  }, [params.code]);

  const route = (r: { user_id: string; activation_code: string; has_intake: boolean; has_diagnosis: boolean }) => {
    if (r.has_diagnosis) router.replace('/(tabs)/home');
    else if (r.has_intake) router.replace('/scan');
    else router.replace('/onboarding');
  };

  const onVerifyEmail = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    Keyboard.dismiss();
    setBusy(true); setErr(null); setInfo(null);
    try {
      const r = await api.verifyPurchase(e, getLang());
      await setStoredUser(r.user_id, r.activation_code);
      route(r);
    } catch (e: any) {
      const m = String(e?.message || '');
      if (m.includes('503')) setInfo(t('gate.pending'));
      else if (m.includes('403')) setErr(t('gate.not_found'));
      else if (m.includes('400')) setErr(t('gate.not_found'));
      else setErr(t('common.error'));
    } finally { setBusy(false); }
  };

  const onValidateCode = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    Keyboard.dismiss();
    setBusy(true); setErr(null); setInfo(null);
    try {
      const r = await api.activate(c);
      await setStoredUser(r.user_id, r.activation_code);
      route(r);
    } catch (e: any) {
      if (String(e?.message || '').includes('403')) setErr(t('welcome.code_invalid'));
      else setErr(t('common.error'));
    } finally { setBusy(false); }
  };

  const isEmail = mode === 'email';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <LinearGradient colors={['#0e0a04', '#06060A', '#04040A']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back} testID="activate-back">
            <Feather name="chevron-left" size={24} color={theme.color.onSurface} />
          </Pressable>

          <View style={styles.iconCircle}>
            <Feather name={isEmail ? 'shield' : 'lock'} size={24} color={theme.color.brand} />
          </View>
          <Wordmark label="NŪR PROTOCOL" />
          <Text style={styles.title}>{isEmail ? t('gate.title') : t('welcome.code_title')}</Text>
          <GoldDivider marginV={theme.spacing.md} />
          <Text style={styles.sub}>{isEmail ? t('gate.sub') : t('welcome.code_sub')}</Text>

          {isEmail ? (
            <>
              <TextInput
                value={email}
                onChangeText={(v) => { setEmail(v); setErr(null); setInfo(null); }}
                placeholder={t('gate.email_placeholder')}
                placeholderTextColor={theme.color.onSurfaceSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                inputMode="email"
                returnKeyType="go"
                onSubmitEditing={onVerifyEmail}
                style={[styles.input, styles.inputEmail, err && { borderColor: theme.color.error }]}
                testID="gate-email-input"
              />
              {err ? <Text style={styles.err} testID="gate-error">{err}</Text> : null}
              {info ? (
                <View style={styles.infoBox} testID="gate-info">
                  <Feather name="clock" size={13} color={theme.color.brand} />
                  <Text style={styles.infoTxt}>{info}</Text>
                </View>
              ) : null}
              <Pressable
                style={[styles.cta, (!email || busy) && { opacity: 0.4 }]}
                onPress={onVerifyEmail}
                disabled={!email || busy}
                testID="gate-verify"
              >
                {busy ? <ActivityIndicator color={theme.color.onBrand} /> : (
                  <>
                    <Text style={styles.ctaTxt}>{t('gate.cta')}</Text>
                    <Feather name="arrow-right" size={16} color={theme.color.onBrand} />
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                value={code}
                onChangeText={(v) => { setCode(v.toUpperCase()); setErr(null); }}
                placeholder={t('welcome.code_placeholder')}
                placeholderTextColor={theme.color.onSurfaceSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={onValidateCode}
                style={[styles.input, err && { borderColor: theme.color.error }]}
                testID="activate-code-input"
              />
              {err ? <Text style={styles.err}>{err}</Text> : null}
              <Pressable
                style={[styles.cta, (!code || busy) && { opacity: 0.4 }]}
                onPress={onValidateCode}
                disabled={!code || busy}
                testID="activate-validate"
              >
                {busy ? <ActivityIndicator color={theme.color.onBrand} /> : (
                  <>
                    <Text style={styles.ctaTxt}>{t('welcome.code_validate')}</Text>
                    <Feather name="arrow-right" size={16} color={theme.color.onBrand} />
                  </>
                )}
              </Pressable>
            </>
          )}

          <Pressable style={styles.ghost} onPress={() => router.push('/scan-qr')} testID="gate-scan-card">
            <Feather name="maximize" size={14} color={theme.color.brand} />
            <Text style={styles.ghostTxt}>{t('gate.scan_card')}</Text>
          </Pressable>

          <Pressable
            onPress={() => { setMode(isEmail ? 'code' : 'email'); setErr(null); setInfo(null); }}
            style={{ marginTop: theme.spacing.lg }}
            testID="gate-switch-mode"
          >
            <Text style={styles.link}>{isEmail ? t('gate.have_code') : t('gate.use_email')}</Text>
          </Pressable>

          <View style={styles.whyRow}>
            <Feather name="lock" size={10} color={theme.color.brand} />
            <Text style={styles.whyTxt}>{t('gate.why')}</Text>
          </View>

          <Pressable onPress={() => router.replace('/discover')} style={{ marginTop: theme.spacing.md }} testID="no-code-link">
            <Text style={styles.link}>{t('gate.no_order')}</Text>
          </Pressable>
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
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.color.brand, shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 0 },
    marginBottom: theme.spacing.lg,
  },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 29, textAlign: 'center', marginTop: theme.spacing.md, letterSpacing: -0.5 },
  sub: { color: theme.color.onSurfaceSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  input: {
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderGold,
    borderRadius: theme.radius.md, padding: 18, color: theme.color.onSurface, fontSize: 18,
    marginTop: theme.spacing.xl, fontFamily: theme.font.mono, letterSpacing: 2, textAlign: 'center',
  },
  inputEmail: { fontFamily: theme.font.sans, letterSpacing: 0.3, fontSize: 16 },
  err: { color: theme.color.error, fontSize: 12, textAlign: 'center', marginTop: theme.spacing.sm, lineHeight: 18 },
  infoBox: {
    flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center', marginTop: theme.spacing.md,
    backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.borderGold,
    borderRadius: theme.radius.md, padding: theme.spacing.md,
  },
  infoTxt: { color: theme.color.onSurfaceTertiary, fontSize: 12, flex: 1, lineHeight: 18 },
  cta: {
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    shadowColor: theme.color.brand, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 6 },
  },
  ctaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 14, letterSpacing: 1 },
  ghost: {
    marginTop: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: theme.spacing.sm, paddingVertical: 15, borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.color.borderGold, backgroundColor: 'rgba(201,169,97,0.06)',
  },
  ghostTxt: { color: theme.color.brand, fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
  link: { color: theme.color.onSurfaceSecondary, fontSize: 12, textAlign: 'center', textDecorationLine: 'underline' },
  whyRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.md },
  whyTxt: { color: theme.color.onSurfaceSecondary, fontSize: 10, opacity: 0.75, flex: 1, lineHeight: 15 },
});
