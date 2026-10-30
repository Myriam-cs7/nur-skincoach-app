import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@react-native-vector-icons/feather';
import { theme, makeStyles } from '../src/theme';
import { GoldDivider, BrandHeader } from '../src/ui';
import { api, setStoredUser, AccessResponse } from '../src/api';
import { useT, getLang } from '../src/i18n';

type Step = 'email' | 'otp' | 'partner';

export default function Activate() {
  const router = useRouter();
  const { t } = useT();
  const params = useLocalSearchParams<{ code?: string; scanned?: string }>();
  const [step, setStep] = useState<Step>(params.code ? 'partner' : 'email');
  const [email, setEmail] = useState('');
  const [masked, setMasked] = useState('');
  const [otp, setOtp] = useState('');
  const [code, setCode] = useState(params.code ? String(params.code).toUpperCase() : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(params.scanned ? t('gate.card_ok') : null);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1 && timer.current) { clearInterval(timer.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const route = (r: { has_intake: boolean; has_diagnosis: boolean }) => {
    if (r.has_diagnosis) router.replace('/(tabs)/home');
    else if (r.has_intake) router.replace('/scan');
    else router.replace('/onboarding');
  };

  const sendCode = async (resend = false) => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    Keyboard.dismiss();
    setBusy(true); setErr(null); setInfo(null);
    try {
      const r = await api.requestCode(e, getLang());
      setMasked(r.masked_email);
      setStep('otp');
      setOtp('');
      startCooldown(r.resend_after);
    } catch (e2: any) {
      const m = String(e2?.message || '');
      if (m.includes('resend_too_soon')) { setStep('otp'); startCooldown(60); setErr(t('gate.too_soon')); }
      else if (m.includes('too_many_requests')) setErr(t('gate.too_many'));
      else if (m.includes('invalid_email')) setErr(t('gate.not_found'));
      else if (m.includes('email_unavailable')) setErr(t('gate.mail_paused'));
      else setErr(t('gate.mail_error'));
      if (resend) setStep('otp');
    } finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    const digits = otp.replace(/\D/g, '');
    if (digits.length !== 6) return;
    Keyboard.dismiss();
    setBusy(true); setErr(null);
    try {
      const r: AccessResponse = await api.verifyCode(email.trim().toLowerCase(), digits, getLang());
      await setStoredUser(r.user_id, r.activation_code);
      route(r);
    } catch (e2: any) {
      const m = String(e2?.message || '');
      if (m.includes('code_expired')) setErr(t('otp.expired'));
      else if (m.includes('too_many_attempts')) setErr(t('otp.too_many'));
      else if (m.includes('no_code_requested')) setErr(t('otp.not_found'));
      else setErr(t('otp.invalid'));
    } finally { setBusy(false); }
  };

  const validatePartnerCode = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    Keyboard.dismiss();
    setBusy(true); setErr(null); setInfo(null);
    try {
      const r = await api.activate(c);
      await setStoredUser(r.user_id, r.activation_code);
      route(r);
    } catch (e2: any) {
      if (String(e2?.message || '').includes('403')) setErr(t('welcome.code_invalid'));
      else setErr(t('common.error'));
    } finally { setBusy(false); }
  };

  const titles: Record<Step, string> = {
    email: t('gate.title'),
    otp: t('otp.title'),
    partner: t('welcome.code_title'),
  };
  const subs: Record<Step, string> = {
    email: t('gate.sub'),
    otp: t('otp.sub', { email: masked || email }),
    partner: t('welcome.code_sub'),
  };
  const icons: Record<Step, any> = { email: 'mail', otp: 'key', partner: 'award' };

  const goBackStep = () => {
    if (step === 'email') router.back();
    else { setStep('email'); setErr(null); setInfo(null); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <LinearGradient colors={theme.gradient.page} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={goBackStep} hitSlop={12} style={styles.back} testID="activate-back">
            <Feather name="chevron-left" size={24} color={theme.color.onSurface} />
          </Pressable>

          <View style={styles.iconCircle}>
            <Feather name={icons[step]} size={23} color={theme.color.brand} />
          </View>
          <BrandHeader title={titles[step]} />
          <GoldDivider marginV={theme.spacing.md} />
          <Text style={styles.sub}>{subs[step]}</Text>

          {step === 'email' ? (
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
                textContentType="emailAddress"
                returnKeyType="go"
                onSubmitEditing={() => sendCode()}
                style={[styles.input, styles.inputEmail, !!err && styles.inputErr]}
                testID="gate-email-input"
              />
              {err ? <Text style={styles.err} testID="gate-error">{err}</Text> : null}
              {info ? (
                <View style={styles.infoBox} testID="gate-info">
                  <Feather name="check-circle" size={13} color={theme.color.brand} />
                  <Text style={styles.infoTxt}>{info}</Text>
                </View>
              ) : null}
              <Cta
                label={t('gate.cta')}
                busy={busy}
                disabled={!email || busy}
                onPress={() => sendCode()}
                testID="gate-verify"
              />
              <Pressable onPress={() => { setStep('partner'); setErr(null); }} style={styles.linkWrap} testID="gate-switch-mode">
                <Text style={styles.link}>{t('gate.have_code')}</Text>
              </Pressable>
              <View style={styles.whyRow}>
                <Feather name="lock" size={10} color={theme.color.brand} />
                <Text style={styles.whyTxt}>{t('gate.why')}</Text>
              </View>
            </>
          ) : null}

          {step === 'otp' ? (
            <>
              <TextInput
                value={otp}
                onChangeText={(v) => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setErr(null); }}
                placeholder={t('otp.placeholder')}
                placeholderTextColor={theme.color.borderStrong}
                keyboardType="number-pad"
                inputMode="numeric"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                returnKeyType="go"
                onSubmitEditing={verifyOtp}
                autoFocus
                style={[styles.input, styles.inputOtp, !!err && styles.inputErr]}
                testID="otp-input"
              />
              {err ? <Text style={styles.err} testID="otp-error">{err}</Text> : null}
              <Cta
                label={t('otp.cta')}
                busy={busy}
                disabled={otp.length !== 6 || busy}
                onPress={verifyOtp}
                testID="otp-verify"
              />
              <Pressable
                style={styles.ghost}
                disabled={cooldown > 0 || busy}
                onPress={() => sendCode(true)}
                testID="otp-resend"
              >
                <Feather name="refresh-cw" size={13} color={cooldown > 0 ? theme.color.onSurfaceSecondary : theme.color.brandDeep} />
                <Text style={[styles.ghostTxt, cooldown > 0 && { color: theme.color.onSurfaceSecondary }]}>
                  {cooldown > 0 ? t('otp.resend_in', { s: cooldown }) : t('otp.resend')}
                </Text>
              </Pressable>
              <Text style={styles.hint}>{t('otp.spam_hint')}</Text>
              <Pressable onPress={() => { setStep('email'); setErr(null); setOtp(''); }} style={styles.linkWrap} testID="otp-change-email">
                <Text style={styles.link}>{t('otp.change_email')}</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'partner' ? (
            <>
              <TextInput
                value={code}
                onChangeText={(v) => { setCode(v.toUpperCase()); setErr(null); }}
                placeholder={t('welcome.code_placeholder')}
                placeholderTextColor={theme.color.onSurfaceSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={validatePartnerCode}
                style={[styles.input, !!err && styles.inputErr]}
                testID="activate-code-input"
              />
              {err ? <Text style={styles.err}>{err}</Text> : null}
              <Cta
                label={t('welcome.code_validate')}
                busy={busy}
                disabled={!code || busy}
                onPress={validatePartnerCode}
                testID="activate-validate"
              />
              <Pressable onPress={() => { setStep('email'); setErr(null); }} style={styles.linkWrap} testID="gate-use-email">
                <Text style={styles.link}>{t('gate.use_email')}</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function Cta({ label, busy, disabled, onPress, testID }: {
  label: string; busy: boolean; disabled: boolean; onPress: () => void; testID: string;
}) {
  return (
    <Pressable style={[styles.cta, disabled && { opacity: 0.45 }]} onPress={onPress} disabled={disabled} testID={testID}>
      {busy ? <ActivityIndicator color={theme.color.onBrand} /> : (
        <>
          <Text style={styles.ctaTxt}>{label}</Text>
          <Feather name="arrow-right" size={16} color={theme.color.onBrand} />
        </>
      )}
    </Pressable>
  );
}

const styles = makeStyles(() => ({
  root: { flex: 1, backgroundColor: theme.color.surface },
  scroll: { padding: theme.spacing.xl, flexGrow: 1, justifyContent: 'center' },
  back: { position: 'absolute', top: 0, left: theme.spacing.xl },
  iconCircle: {
    alignSelf: 'center', width: 66, height: 66, borderRadius: 999,
    backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.brand,
    alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg,
    shadowColor: theme.color.brand, shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 0 },
  },
  title: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 29, textAlign: 'center', marginTop: theme.spacing.md, letterSpacing: -0.5 },
  sub: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, textAlign: 'center', lineHeight: 20 },
  input: {
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderGold,
    borderRadius: theme.radius.md, padding: 18, color: theme.color.onSurface, fontSize: 18,
    marginTop: theme.spacing.xl, fontFamily: theme.font.mono, letterSpacing: 2, textAlign: 'center',
  },
  inputEmail: { fontFamily: theme.font.sans, letterSpacing: 0.3, fontSize: 16 },
  inputOtp: { fontSize: 30, fontFamily: theme.font.sans, letterSpacing: 12, paddingVertical: 20, color: theme.color.onSurface },
  inputErr: { borderColor: theme.color.error },
  err: { color: theme.color.error, fontSize: 12, fontFamily: theme.font.sans, textAlign: 'center', marginTop: theme.spacing.sm, lineHeight: 18 },
  infoBox: {
    flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center', marginTop: theme.spacing.md,
    backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.borderGold,
    borderRadius: theme.radius.md, padding: theme.spacing.md,
  },
  infoTxt: { color: theme.color.onSurfaceTertiary, fontSize: 12, fontFamily: theme.font.sans, flex: 1, lineHeight: 18 },
  cta: {
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    marginTop: theme.spacing.xl, ...theme.shadow.cta,
  },
  ctaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 14, fontFamily: theme.font.sansMedium, letterSpacing: 1 },
  ghost: {
    marginTop: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: theme.spacing.sm, paddingVertical: 15, borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.color.borderGold, backgroundColor: 'rgba(201,169,97,0.06)',
  },
  ghostTxt: { color: theme.color.brandDeep, fontSize: 13, fontFamily: theme.font.sansMedium, fontWeight: '600', letterSpacing: 0.4 },
  hint: { color: theme.color.onSurfaceSecondary, fontSize: 11, fontFamily: theme.font.sans, textAlign: 'center', marginTop: theme.spacing.md },
  linkWrap: { marginTop: theme.spacing.lg, paddingVertical: 4 },
  link: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontFamily: theme.font.sans, textAlign: 'center', textDecorationLine: 'underline' },
  whyRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.md },
  whyTxt: { color: theme.color.onSurfaceSecondary, fontSize: 10, fontFamily: theme.font.sans, opacity: 0.85, flex: 1, lineHeight: 15 },
}));
