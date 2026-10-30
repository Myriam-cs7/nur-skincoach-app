import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Linking, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@react-native-vector-icons/feather';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { theme, makeStyles } from '../src/theme';
import { Wordmark, GoldDivider, SectionLabel } from '../src/ui';
import { api } from '../src/api';
import { useT, getLang } from '../src/i18n';

const { width } = Dimensions.get('window');

type StepName = 'intro' | 'q1' | 'q2' | 'q3' | 'email' | 'analyzing' | 'prescription';

export default function Discover() {
  const router = useRouter();
  const { t } = useT();
  const [step, setStep] = useState<StepName>('intro');
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [prescription, setPrescription] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const rotate = useSharedValue(0);
  React.useEffect(() => {
    rotate.value = withRepeat(withTiming(1, { duration: 4500, easing: Easing.linear }), -1);
  }, []);
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value * 360}deg` }] }));

  const submitLead = async () => {
    setStep('analyzing');
    setError(null);
    try {
      const r = await api.leadPrescription({
        email: email.trim().toLowerCase(),
        name: name.trim() || undefined,
        answers: { q1, q2, q3 },
        lang: getLang(),
      });
      setPrescription(r.prescription);
      setShop(r.shop);
      setStep('prescription');
    } catch (e: any) {
      setError(e?.message || 'Error');
      setStep('email');
    }
  };

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const renderStep = () => {
    if (step === 'intro') return <IntroStep onStart={() => setStep('q1')} />;
    if (step === 'q1')
      return (
        <QuestionStep
          stepNum={1} totalSteps={3}
          title={t('discover.q1.title')}
          question={t('discover.q1.question')}
          options={[
            { value: 'A', label: t('discover.q1.a') },
            { value: 'B', label: t('discover.q1.b') },
            { value: 'C', label: t('discover.q1.c') },
          ]}
          selected={q1}
          onSelect={(v: string) => { setQ1(v); setTimeout(() => setStep('q2'), 220); }}
        />
      );
    if (step === 'q2')
      return (
        <QuestionStep
          stepNum={2} totalSteps={3}
          title={t('discover.q2.title')}
          question={t('discover.q2.question')}
          options={[
            { value: 'A', label: t('discover.q2.a') },
            { value: 'B', label: t('discover.q2.b') },
            { value: 'C', label: t('discover.q2.c') },
          ]}
          selected={q2}
          onSelect={(v: string) => { setQ2(v); setTimeout(() => setStep('q3'), 220); }}
        />
      );
    if (step === 'q3')
      return (
        <QuestionStep
          stepNum={3} totalSteps={3}
          title={t('discover.q3.title')}
          question={t('discover.q3.question')}
          options={[
            { value: 'A', label: t('discover.q3.a') },
            { value: 'B', label: t('discover.q3.b') },
            { value: 'C', label: t('discover.q3.c') },
          ]}
          selected={q3}
          onSelect={(v: string) => { setQ3(v); setTimeout(() => setStep('email'), 220); }}
        />
      );
    if (step === 'email')
      return (
        <EmailStep
          email={email} setEmail={setEmail}
          name={name} setName={setName}
          emailValid={emailValid}
          error={error}
          onSubmit={submitLead}
        />
      );
    if (step === 'analyzing')
      return (
        <View style={[styles.fullCenter]}>
          <Animated.View style={[styles.orbsBox, orbStyle]}>
            <View style={[styles.orb, { backgroundColor: theme.color.ledRed, top: 0, left: '40%' }]} />
            <View style={[styles.orb, { backgroundColor: theme.color.ledYellow, top: '20%', right: 0 }]} />
            <View style={[styles.orb, { backgroundColor: theme.color.ledGreen, bottom: 0, left: '40%' }]} />
            <View style={[styles.orb, { backgroundColor: theme.color.ledViolet, top: '20%', left: 0 }]} />
          </Animated.View>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Wordmark label={t('analyzing.kicker')} />
            <Text style={styles.title}>{t('analyzing.title')}</Text>
          </View>
        </View>
      );
    if (step === 'prescription' && prescription)
      return <PrescriptionStep p={prescription} shop={shop} t={t} />;
    return null;
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <LinearGradient colors={theme.gradient.page} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} testID="discover-back">
            <Feather name="chevron-left" size={24} color={theme.color.onSurface} />
          </Pressable>
          <Text style={styles.kicker}>{t('discover.intro.kicker')}</Text>
          <View style={{ width: 24 }} />
        </View>
        {renderStep()}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function IntroStep({ onStart }: { onStart: () => void }) {
  const { t } = useT();
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.introIconCircle}>
        <Feather name="zap" size={28} color={theme.color.brand} />
      </View>
      <Text style={styles.titleLg} testID="discover-intro-title">{t('discover.intro.title')}</Text>
      <GoldDivider marginV={theme.spacing.md} />
      <Text style={styles.body}>{t('discover.intro.sub')}</Text>

      <View style={styles.bulletList}>
        <Bullet text={t('discover.intro.b1')} />
        <Bullet text={t('discover.intro.b2')} />
        <Bullet text={t('discover.intro.b3')} />
      </View>

      <Pressable style={styles.cta} onPress={onStart} testID="discover-start">
        <Text style={styles.ctaText}>{t('discover.intro.start')}</Text>
        <Feather name="arrow-right" size={16} color={theme.color.onBrand} />
      </Pressable>
    </ScrollView>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletTxt}>{text}</Text>
    </View>
  );
}

function QuestionStep({ stepNum, totalSteps, title, question, options, selected, onSelect }: any) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.progressMeta}>
        <Text style={styles.progressNum}>{String(stepNum).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(stepNum / totalSteps) * 100}%` }]} />
        </View>
      </View>
      <SectionLabel label={title} />
      <Text style={styles.qTitle}>{question}</Text>
      <View style={styles.optList}>
        {options.map((o: any) => {
          const sel = selected === o.value;
          return (
            <Pressable key={o.value} onPress={() => onSelect(o.value)} style={[styles.opt, sel && styles.optSelected]} testID={`discover-opt-${o.value}`}>
              <Text style={[styles.optTxt, sel && styles.optTxtSelected]}>{o.label}</Text>
              {sel ? <Feather name="check" size={18} color={theme.color.brand} /> : null}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function EmailStep({ email, setEmail, name, setName, emailValid, error, onSubmit }: any) {
  const { t } = useT();
  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.introIconCircle}>
        <Feather name="mail" size={24} color={theme.color.brand} />
      </View>
      <Text style={styles.titleLg}>{t('discover.email.title')}</Text>
      <Text style={styles.body}>{t('discover.email.sub')}</Text>

      <TextInput
        placeholder={t('discover.email.name_placeholder')}
        placeholderTextColor={theme.color.onSurfaceSecondary}
        value={name} onChangeText={setName}
        style={styles.input}
        testID="discover-name"
      />
      <TextInput
        placeholder={t('discover.email.placeholder')}
        placeholderTextColor={theme.color.onSurfaceSecondary}
        value={email} onChangeText={setEmail}
        autoCapitalize="none" keyboardType="email-address" autoCorrect={false}
        style={[styles.input, { marginTop: theme.spacing.md }]}
        testID="discover-email"
      />

      <View style={styles.consentBox}>
        <Feather name="lock" size={11} color={theme.color.brand} />
        <Text style={styles.consentTxt}>{t('discover.email.consent')}</Text>
      </View>

      {error ? <Text style={styles.errorTxt}>{error}</Text> : null}

      <Pressable
        style={[styles.cta, !emailValid && { opacity: 0.4 }]}
        disabled={!emailValid}
        onPress={onSubmit}
        testID="discover-submit"
      >
        <Text style={styles.ctaText}>{t('discover.email.cta')}</Text>
        <Feather name="arrow-right" size={16} color={theme.color.onBrand} />
      </Pressable>
    </ScrollView>
  );
}

function PrescriptionStep({ p, shop, t }: any) {
  const goShop = () => Linking.openURL(`${shop.url}?promo=${shop.promo_code}`);
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Wordmark label={t('discover.prescription.kicker')} />
      <Text style={styles.titleLg} testID="discover-headline">{p.headline}</Text>
      <GoldDivider marginV={theme.spacing.md} />

      <SectionLabel label={t('discover.prescription.diagnosis')} />
      <Text style={styles.body}>{p.diagnosis}</Text>

      <View style={{ height: theme.spacing.xl }} />
      <SectionLabel label={t('discover.prescription.axes')} />
      <View style={styles.axes}>
        {p.axes?.map((a: string, i: number) => (
          <View key={i} style={styles.axeRow}>
            <Text style={styles.axeNum}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={styles.axeTxt}>{a}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: theme.spacing.xl }} />
      <SectionLabel label={t('discover.prescription.protocol')} />
      <View style={styles.protocolBox}>
        <View style={styles.wavelengthRow}>
          <View style={[styles.wlPill, { borderColor: theme.color.ledRed }]}>
            <View style={[styles.wlDot, { backgroundColor: theme.color.ledRed, shadowColor: theme.color.ledRed }]} />
            <Text style={[styles.wlTxt, { color: theme.color.ledRed }]}>633 nm</Text>
          </View>
          <View style={[styles.wlPill, { borderColor: theme.color.brand }]}>
            <View style={[styles.wlDot, { backgroundColor: theme.color.brand, shadowColor: theme.color.brand }]} />
            <Text style={[styles.wlTxt, { color: theme.color.brandDeep }]}>{t('library.title')}</Text>
          </View>
        </View>
        <Text style={styles.protocolTxt}>{p.protocol_summary}</Text>
      </View>

      <View style={{ height: theme.spacing.xl }} />
      <Text style={styles.ctaTextLead}>{p.cta_text}</Text>

      <Pressable style={styles.shopCta} onPress={goShop} testID="discover-shop">
        <View style={{ flex: 1 }}>
          <Text style={styles.shopCtaTitle}>{t('discover.prescription.cta', { discount: shop.discount })}</Text>
          <Text style={styles.shopCtaSub}>{t('discover.prescription.promo', { code: shop.promo_code })}</Text>
        </View>
        <Feather name="external-link" size={18} color={theme.color.onBrand} />
      </Pressable>
      <Text style={styles.footnote}>{t('discover.prescription.foot')}</Text>
    </ScrollView>
  );
}

const styles = makeStyles(() => ({
  root: { flex: 1, backgroundColor: theme.color.surface },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  kicker: { color: theme.color.brand, fontSize: 10, fontFamily: theme.font.sansMedium, letterSpacing: 3, fontWeight: '700' },
  scroll: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  introIconCircle: {
    alignSelf: 'center', width: 70, height: 70, borderRadius: 999,
    backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.brand,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.color.brand, shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 0 },
    marginTop: theme.spacing.xl, marginBottom: theme.spacing.md,
  },
  title: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 28, letterSpacing: -0.3, textAlign: 'center' },
  titleLg: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 32, letterSpacing: -0.5, textAlign: 'center', marginTop: theme.spacing.sm },
  body: { color: theme.color.onSurfaceTertiary, fontSize: 14, fontFamily: theme.font.sans, lineHeight: 22, textAlign: 'center', letterSpacing: 0.2 },
  bulletList: { gap: theme.spacing.sm, marginTop: theme.spacing.lg, marginBottom: theme.spacing.xl, paddingHorizontal: theme.spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, paddingVertical: 6 },
  bulletDot: { width: 4, height: 4, borderRadius: 999, backgroundColor: theme.color.brand, marginTop: 8 },
  bulletTxt: { color: theme.color.onSurfaceTertiary, fontSize: 13, fontFamily: theme.font.sans, lineHeight: 20, flex: 1 },
  cta: {
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    shadowColor: theme.color.brand, shadowOpacity: 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 6 },
    marginTop: theme.spacing.md,
  },
  ctaText: { color: theme.color.onBrand, fontWeight: '700', fontSize: 14, fontFamily: theme.font.sansMedium, letterSpacing: 1 },
  ctaTextLead: { color: theme.color.onSurfaceTertiary, fontSize: 13, fontFamily: theme.font.sans, lineHeight: 20, fontStyle: 'italic', paddingHorizontal: theme.spacing.sm, textAlign: 'center' },
  progressMeta: { gap: theme.spacing.sm, marginBottom: theme.spacing.xl },
  progressNum: { color: theme.color.brand, fontSize: 10, fontFamily: theme.font.sansMedium, letterSpacing: 2, fontWeight: '700' },
  progressBar: { height: 1, backgroundColor: theme.color.divider, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.color.brand },
  qTitle: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 22, lineHeight: 30, marginTop: theme.spacing.md, marginBottom: theme.spacing.xl, letterSpacing: -0.2 },
  optList: { gap: theme.spacing.md },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border, padding: theme.spacing.lg, borderRadius: theme.radius.md },
  optSelected: { borderColor: theme.color.brand, backgroundColor: theme.color.brandTint },
  optTxt: { color: theme.color.onSurfaceTertiary, fontSize: 14, fontFamily: theme.font.sans, flex: 1, lineHeight: 20 },
  optTxtSelected: { color: theme.color.brand, fontWeight: '600' },
  input: {
    backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: 18, color: theme.color.onSurface,
    fontSize: 16, borderWidth: 1, borderColor: theme.color.borderGold,
    fontFamily: theme.font.display, marginTop: theme.spacing.lg,
  },
  consentBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm,
    marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.md, paddingVertical: 12,
    borderRadius: theme.radius.md, backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1, borderColor: theme.color.borderGold,
  },
  consentTxt: { color: theme.color.onSurfaceSecondary, fontSize: 11, fontFamily: theme.font.sans, flex: 1, lineHeight: 16, letterSpacing: 0.2 },
  errorTxt: { color: theme.color.error, fontSize: 12, fontFamily: theme.font.sans, textAlign: 'center', marginTop: theme.spacing.sm },
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xl },
  orbsBox: { width: width * 0.7, height: width * 0.7, position: 'absolute' },
  orb: { position: 'absolute', width: 20, height: 20, borderRadius: 999, opacity: 0.85, shadowOpacity: 0.9, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } },
  axes: { gap: theme.spacing.md, marginTop: theme.spacing.md },
  axeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, paddingVertical: 6 },
  axeNum: { color: theme.color.brand, fontSize: 12, fontFamily: theme.font.mono, fontWeight: '700', minWidth: 24 },
  axeTxt: { color: theme.color.onSurfaceTertiary, fontSize: 14, fontFamily: theme.font.sans, lineHeight: 20, flex: 1 },
  protocolBox: { backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.lg, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.color.borderGold, marginTop: theme.spacing.md, gap: theme.spacing.md },
  wavelengthRow: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
  wlPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: theme.spacing.md, paddingVertical: 8, borderRadius: theme.radius.pill, borderWidth: 1 },
  wlDot: { width: 8, height: 8, borderRadius: 999, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  wlTxt: { fontSize: 11, fontFamily: theme.font.sansMedium, fontWeight: '700', letterSpacing: 0.5 },
  protocolTxt: { color: theme.color.onSurfaceTertiary, fontSize: 13, fontFamily: theme.font.sans, lineHeight: 20, letterSpacing: 0.2 },
  shopCta: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    backgroundColor: theme.color.brand, borderRadius: theme.radius.lg,
    padding: theme.spacing.lg, marginTop: theme.spacing.lg,
    shadowColor: theme.color.brand, shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
  },
  shopCtaTitle: { color: theme.color.onBrand, fontWeight: '700', fontSize: 15, fontFamily: theme.font.sansMedium, letterSpacing: 0.5 },
  shopCtaSub: { color: theme.color.onBrand, opacity: 0.7, fontSize: 11, marginTop: 4, letterSpacing: 1, fontFamily: theme.font.mono },
  footnote: { color: theme.color.onSurfaceSecondary, fontSize: 11, fontFamily: theme.font.sans, textAlign: 'center', marginTop: theme.spacing.md, opacity: 0.6, lineHeight: 16 },
}));
