import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { theme, makeStyles } from '../src/theme';
import { GoldDivider, BrandHeader } from '../src/ui';
import { api, setStoredUser, ActivateResponse } from '../src/api';
import { useT, getLang } from '../src/i18n';

/** Two steps only: her e-mail, then the single code she received by e-mail. */
type Step = 'email' | 'code';

const CODE_RE = /^[A-Z0-9][A-Z0-9-]{3,23}$/;
/** Only a finished code validates on its own: a half-typed one must never be sent.
 *  Access codes come in several shapes (NUR-CREATOR, NUR-DEMO-2026, NUR-9HX3-N4PJ),
 *  so typing one is validated by the button only — auto-submit is for the 6 digits. */
const looksComplete = (value: string, hasEmail: boolean) => {
  const digits = value.replace(/\D/g, '');
  return hasEmail && digits.length === 6 && digits === value;
};

export default function Activate() {
  const router = useRouter();
  const { t } = useT();
  const params = useLocalSearchParams<{ code?: string }>();
  const [step, setStep] = useState<Step>(params.code ? 'code' : 'email');
  const [email, setEmail] = useState('');
  const [masked, setMasked] = useState('');
  const [code, setCode] = useState(params.code ? String(params.code).toUpperCase() : '');
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef('');
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (autoRef.current) clearTimeout(autoRef.current);
  }, []);

  // Offer to paste a code that is already in the clipboard
  useEffect(() => {
    if (step !== 'code') return;
    (async () => {
      try {
        if (!(await Clipboard.hasStringAsync())) return;
        const raw = (await Clipboard.getStringAsync()).trim().toUpperCase();
        if (raw && raw.length <= 24 && CODE_RE.test(raw) && raw !== code) setPaste(raw);
      } catch {
        // clipboard unavailable: nothing to offer
      }
    })();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setBusy(true); setErr(null);
    try {
      const r = await api.requestCode(e, getLang());
      setMasked(r.masked_email);
      setStep('code');
      if (!resend) setCode('');
      startCooldown(r.resend_after);
    } catch (e2: any) {
      const m = String(e2?.message || '');
      if (m.includes('resend_too_soon')) { setStep('code'); startCooldown(60); setErr(t('gate.too_soon')); }
      else if (m.includes('too_many_requests')) setErr(t('gate.too_many'));
      else if (m.includes('invalid_email')) setErr(t('gate.not_found'));
      else if (m.includes('email_unavailable')) setErr(t('gate.mail_paused'));
      else setErr(t('gate.mail_error'));
      if (resend) setStep('code');
    } finally { setBusy(false); }
  };

  /** One field for both: the 6 digits from the e-mail and the purchase codes. */
  const submitCode = async (value?: string, auto = false) => {
    const raw = (value ?? code).trim().toUpperCase();
    if (!raw || busy) return;
    submittedRef.current = raw;
    const digits = raw.replace(/\D/g, '');
    const mail = email.trim().toLowerCase();
    // Keep the keyboard when she is still typing, so a wrong guess stays editable
    if (!auto) Keyboard.dismiss();
    setBusy(true); setErr(null);
    try {
      const r: ActivateResponse = digits.length === 6 && digits === raw && mail
        ? await api.verifyCode(mail, digits, getLang())
        : await api.activate(raw);
      await setStoredUser(r.user_id, r.activation_code);
      route(r);
    } catch (e2: any) {
      const m = String(e2?.message || '');
      if (m.includes('code_expired')) setErr(t('otp.expired'));
      else if (m.includes('too_many_attempts')) setErr(t('otp.too_many'));
      else if (m.includes('too_many_requests')) setErr(t('gate.too_many'));
      else if (m.includes('no_code_requested')) setErr(t('otp.not_found'));
      else if (m.includes('403') || m.includes('invalid_activation_code')) setErr(t('code.invalid'));
      else setErr(t('otp.invalid'));
    } finally { setBusy(false); }
  };

  const onChangeCode = (v: string) => {
    const next = v.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
    setCode(next);
    setErr(null);
    setPaste('');
    // Validation fires on its own once typing has settled on a complete code
    if (autoRef.current) clearTimeout(autoRef.current);
    if (next !== submittedRef.current && looksComplete(next, !!email.trim())) {
      autoRef.current = setTimeout(() => void submitCode(next, true), 700);
    }
  };

  const titles: Record<Step, string> = { email: t('gate.title'), code: t('code.title') };
  const subs: Record<Step, string> = {
    email: t('gate.sub'),
    code: masked || email ? t('code.sub', { email: masked || email }) : t('code.sub_plain'),
  };

  const goBackStep = () => {
    if (step === 'email') router.back();
    else { setStep('email'); setErr(null); }
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
            <Feather name={step === 'email' ? 'mail' : 'key'} size={23} color={theme.color.brand} />
          </View>
          <BrandHeader title={titles[step]} />
          <GoldDivider marginV={theme.spacing.md} />
          <Text style={styles.sub}>{subs[step]}</Text>

          {step === 'email' ? (
            <>
              <TextInput
                value={email}
                onChangeText={(v) => { setEmail(v); setErr(null); }}
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
              <Cta
                label={t('gate.cta')}
                busy={busy}
                disabled={!email || busy}
                onPress={() => sendCode()}
                testID="gate-verify"
              />
              <Pressable onPress={() => { setStep('code'); setErr(null); }} style={styles.linkWrap} testID="gate-have-code">
                <Text style={styles.link}>{t('code.already')}</Text>
              </Pressable>
              <View style={styles.whyRow}>
                <Feather name="lock" size={10} color={theme.color.brand} />
                <Text style={styles.whyTxt}>{t('gate.why')}</Text>
              </View>
            </>
          ) : (
            <>
              <TextInput
                value={code}
                onChangeText={onChangeCode}
                placeholder={t('code.placeholder')}
                placeholderTextColor={theme.color.borderStrong}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={24}
                returnKeyType="go"
                onSubmitEditing={() => submitCode()}
                autoFocus
                style={[styles.input, styles.inputCode, !!err && styles.inputErr]}
                testID="code-input"
              />
              {paste ? (
                <Pressable
                  style={styles.pasteChip}
                  onPress={() => { setPaste(''); setCode(paste); void submitCode(paste); }}
                  testID="code-paste"
                >
                  <Feather name="clipboard" size={13} color={theme.color.brand} />
                  <Text style={styles.pasteTxt} numberOfLines={1}>{t('code.paste', { code: paste })}</Text>
                </Pressable>
              ) : null}
              {err ? <Text style={styles.err} testID="code-error">{err}</Text> : null}
              <Cta
                label={t('code.cta')}
                busy={busy}
                disabled={!code || busy}
                onPress={() => submitCode()}
                testID="code-validate"
              />
              {email.trim() ? (
                <>
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
                  <Text style={styles.hint}>{t('code.hint')}</Text>
                </>
              ) : null}
              <Pressable onPress={() => { setStep('email'); setErr(null); }} style={styles.linkWrap} testID="code-change-email">
                <Text style={styles.link}>{t('code.by_email')}</Text>
              </Pressable>
            </>
          )}
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
  sub: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, textAlign: 'center', lineHeight: 20 },
  input: {
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderGold,
    borderRadius: theme.radius.md, padding: 18, color: theme.color.onSurface, fontSize: 18,
    marginTop: theme.spacing.xl, fontFamily: theme.font.mono, letterSpacing: 2, textAlign: 'center',
  },
  inputEmail: { fontFamily: theme.font.sans, letterSpacing: 0.3, fontSize: 16 },
  inputCode: { fontSize: 22, fontFamily: theme.font.sansMedium, letterSpacing: 4, paddingVertical: 20, color: theme.color.onSurface },
  inputErr: { borderColor: theme.color.error },
  err: { color: theme.color.error, fontSize: 12, fontFamily: theme.font.sans, textAlign: 'center', marginTop: theme.spacing.sm, lineHeight: 18 },
  pasteChip: {
    flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center', alignSelf: 'center',
    marginTop: theme.spacing.md, paddingVertical: 10, paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.color.borderGold,
    backgroundColor: theme.color.brandTint, maxWidth: '100%',
  },
  pasteTxt: { ...theme.type.bodySm, color: theme.color.brand, flexShrink: 1 },
  cta: {
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    marginTop: theme.spacing.xl, ...theme.shadow.cta,
  },
  ctaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 14, fontFamily: theme.font.sansMedium, letterSpacing: 1 },
  ghost: {
    marginTop: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: theme.spacing.sm, paddingVertical: 15, borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.color.borderGold, backgroundColor: theme.color.brandTint,
  },
  ghostTxt: { color: theme.color.brandDeep, fontSize: 13, fontFamily: theme.font.sansMedium, fontWeight: '600', letterSpacing: 0.4 },
  hint: { color: theme.color.onSurfaceSecondary, fontSize: 11, fontFamily: theme.font.sans, textAlign: 'center', marginTop: theme.spacing.md },
  linkWrap: { marginTop: theme.spacing.lg, paddingVertical: 4 },
  link: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontFamily: theme.font.sans, textAlign: 'center', textDecorationLine: 'underline' },
  whyRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.md },
  whyTxt: { color: theme.color.onSurfaceSecondary, fontSize: 10, fontFamily: theme.font.sans, opacity: 0.85, flex: 1, lineHeight: 15 },
}));
