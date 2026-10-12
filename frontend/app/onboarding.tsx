import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../src/theme';
import { Wordmark } from '../src/ui';
import { api, getStoredUserId, IntakePayload } from '../src/api';
import { useT, CONCERN_LABELS, getLang } from '../src/i18n';

type Step = {
  key: keyof IntakePayload;
  titleKey: string;
  subKey?: string;
  type: 'single' | 'multi' | 'text';
  options?: { value: string; labelKey?: string }[];
  optionsByLang?: Record<string, { value: string; label: string }[]>;
};

const ageOpts = { fr: [['<25','Moins de 25 ans'],['25-34','25 – 34 ans'],['35-44','35 – 44 ans'],['45-54','45 – 54 ans'],['55+','55 ans et plus']],
  en: [['<25','Under 25'],['25-34','25 – 34'],['35-44','35 – 44'],['45-54','45 – 54'],['55+','55 and over']],
  ar: [['<25','أقل من 25'],['25-34','25 – 34'],['35-44','35 – 44'],['45-54','45 – 54'],['55+','55 وأكثر']] };
const genderOpts = { fr: [['femme','Femme'],['homme','Homme'],['autre','Autre / je préfère ne pas dire']],
  en: [['femme','Woman'],['homme','Man'],['autre','Other / prefer not to say']],
  ar: [['femme','امرأة'],['homme','رجل'],['autre','آخر / أفضّل عدم القول']] };
const skinOpts = { fr: [['seche','Sèche'],['grasse','Grasse'],['mixte','Mixte'],['normale','Normale'],['sensible','Sensible']],
  en: [['seche','Dry'],['grasse','Oily'],['mixte','Combination'],['normale','Normal'],['sensible','Sensitive']],
  ar: [['seche','جافة'],['grasse','دهنية'],['mixte','مختلطة'],['normale','عادية'],['sensible','حساسة']] };
const climateOpts = { fr: [['tempere','Tempéré'],['sec','Sec'],['humide','Humide'],['froid','Froid'],['tropical','Tropical']],
  en: [['tempere','Temperate'],['sec','Dry'],['humide','Humid'],['froid','Cold'],['tropical','Tropical']],
  ar: [['tempere','معتدل'],['sec','جاف'],['humide','رطب'],['froid','بارد'],['tropical','استوائي']] };
const sunOpts = { fr: [['faible','Faible'],['moyenne','Moyenne'],['forte','Forte']],
  en: [['faible','Low'],['moyenne','Medium'],['forte','High']],
  ar: [['faible','منخفض'],['moyenne','متوسط'],['forte','مرتفع']] };
const lifeOpts = { fr: [['sedentaire','Sédentaire'],['actif','Actif'],['tres_actif','Très actif']],
  en: [['sedentaire','Sedentary'],['actif','Active'],['tres_actif','Very active']],
  ar: [['sedentaire','خامل'],['actif','نشط'],['tres_actif','نشط جداً']] };
const sleepOpts = { fr: [['<6','Moins de 6h'],['6-7','6 – 7h'],['7-8','7 – 8h'],['>8','Plus de 8h']],
  en: [['<6','Less than 6h'],['6-7','6 – 7h'],['7-8','7 – 8h'],['>8','More than 8h']],
  ar: [['<6','أقل من 6'],['6-7','6 – 7'],['7-8','7 – 8'],['>8','أكثر من 8']] };
const stressOpts = { fr: [['faible','Faible'],['moyen','Moyen'],['eleve','Élevé']],
  en: [['faible','Low'],['moyen','Medium'],['eleve','High']],
  ar: [['faible','منخفض'],['moyen','متوسط'],['eleve','مرتفع']] };
const waterOpts = { fr: [['<1L','Moins de 1L'],['1-2L','1 – 2L'],['>2L','Plus de 2L']],
  en: [['<1L','Less than 1L'],['1-2L','1 – 2L'],['>2L','More than 2L']],
  ar: [['<1L','أقل من 1 لتر'],['1-2L','1 – 2 لتر'],['>2L','أكثر من 2 لتر']] };

const concernKeys = ['acne','rides','taches','rougeurs','pores','ternissement','sensibilite','cicatrices'];

const mapOpts = (raw: Record<string, string[][]>, lang: string) =>
  (raw[lang] || raw.fr).map(([value, label]) => ({ value, label }));

const STEPS: Step[] = [
  { key: 'name', titleKey: 'onb.name.title', subKey: 'onb.name.sub', type: 'text' },
  { key: 'age_range', titleKey: 'onb.age.title', type: 'single' },
  { key: 'gender', titleKey: 'onb.gender.title', type: 'single' },
  { key: 'skin_type', titleKey: 'onb.skin.title', type: 'single' },
  { key: 'climate', titleKey: 'onb.climate.title', subKey: 'onb.climate.sub', type: 'single' },
  { key: 'sun_exposure', titleKey: 'onb.sun.title', type: 'single' },
  { key: 'lifestyle', titleKey: 'onb.lifestyle.title', type: 'single' },
  { key: 'sleep_hours', titleKey: 'onb.sleep.title', type: 'single' },
  { key: 'stress_level', titleKey: 'onb.stress.title', type: 'single' },
  { key: 'water_intake', titleKey: 'onb.water.title', type: 'single' },
  { key: 'concerns', titleKey: 'onb.concerns.title', subKey: 'onb.concerns.sub', type: 'multi' },
];

export default function Onboarding() {
  const router = useRouter();
  const { t } = useT();
  const lang = getLang();
  const [idx, setIdx] = useState(0);
  const [data, setData] = useState<Partial<IntakePayload>>({ concerns: [] });
  const [saving, setSaving] = useState(false);

  const step = STEPS[idx];
  const current = (data as any)[step.key];

  const getOptionsForStep = (): { value: string; label: string }[] => {
    switch (step.key) {
      case 'age_range': return mapOpts(ageOpts as any, lang);
      case 'gender': return mapOpts(genderOpts as any, lang);
      case 'skin_type': return mapOpts(skinOpts as any, lang);
      case 'climate': return mapOpts(climateOpts as any, lang);
      case 'sun_exposure': return mapOpts(sunOpts as any, lang);
      case 'lifestyle': return mapOpts(lifeOpts as any, lang);
      case 'sleep_hours': return mapOpts(sleepOpts as any, lang);
      case 'stress_level': return mapOpts(stressOpts as any, lang);
      case 'water_intake': return mapOpts(waterOpts as any, lang);
      case 'concerns':
        return concernKeys.map((k) => ({ value: k, label: CONCERN_LABELS[lang as 'fr']?.[k] || CONCERN_LABELS.fr[k] }));
      default: return [];
    }
  };

  const options = step.type !== 'text' ? getOptionsForStep() : [];

  const canNext =
    step.type === 'text'
      ? step.key === 'name' || (typeof current === 'string' && current.trim().length > 0)
      : step.type === 'multi'
      ? Array.isArray(current) && current.length > 0
      : !!current;

  const onSelect = (v: string) => {
    if (step.type === 'multi') {
      const arr: string[] = Array.isArray(current) ? [...current] : [];
      const i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1); else arr.push(v);
      setData({ ...data, [step.key]: arr });
    } else {
      setData({ ...data, [step.key]: v });
    }
  };

  const onNext = async () => {
    if (idx < STEPS.length - 1) { setIdx(idx + 1); return; }
    setSaving(true);
    try {
      const uid = await getStoredUserId();
      if (!uid) throw new Error('No user');
      const payload: IntakePayload = {
        name: data.name,
        age_range: data.age_range!,
        gender: data.gender,
        skin_type: data.skin_type!,
        location: undefined as any,
        climate: data.climate!,
        sun_exposure: data.sun_exposure!,
        lifestyle: data.lifestyle!,
        sleep_hours: data.sleep_hours!,
        stress_level: data.stress_level!,
        water_intake: data.water_intake!,
        concerns: data.concerns || [],
      };
      await api.saveIntake(uid, payload);
      router.replace('/scan');
    } catch (e) {
      console.warn(e);
    } finally { setSaving(false); }
  };

  const onBack = () => { if (idx === 0) router.back(); else setIdx(idx - 1); };

  const progress = (idx + 1) / STEPS.length;
  const isLast = idx === STEPS.length - 1;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={onBack} hitSlop={12} testID="onboarding-back">
            <Feather name="chevron-left" size={24} color={theme.color.onSurface} />
          </Pressable>
          <Wordmark label={`${String(idx + 1).padStart(2,'0')} · ${String(STEPS.length).padStart(2,'0')}`} />
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title} testID={`onb-title-${idx}`}>{t(step.titleKey)}</Text>
          {step.subKey ? <Text style={styles.subtitle}>{t(step.subKey)}</Text> : null}

          {step.type === 'text' && (
            <TextInput
              testID={`onb-input-${step.key}`}
              value={(current as string) || ''}
              onChangeText={(tv) => setData({ ...data, [step.key]: tv })}
              placeholder={t('onb.name.placeholder')}
              placeholderTextColor={theme.color.onSurfaceSecondary}
              style={styles.input}
              autoFocus
            />
          )}

          {(step.type === 'single' || step.type === 'multi') && (
            <View style={styles.options}>
              {options.map((o) => {
                const selected = step.type === 'multi'
                  ? Array.isArray(current) && current.includes(o.value)
                  : current === o.value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => onSelect(o.value)}
                    style={[styles.option, selected && styles.optionSelected]}
                    testID={`onb-opt-${step.key}-${o.value}`}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{o.label}</Text>
                    {selected ? <Feather name="check" size={18} color={theme.color.brand} /> : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={styles.bottom}>
          <Pressable onPress={onNext} disabled={!canNext || saving} style={[styles.cta, (!canNext || saving) && { opacity: 0.4 }]} testID="onboarding-next">
            <Text style={styles.ctaText}>{saving ? t('common.saving') : isLast ? t('onb.finalize') : t('onb.next')}</Text>
            <Feather name="arrow-right" size={16} color={theme.color.onBrand} />
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  progressBar: { height: 1, backgroundColor: theme.color.divider, marginHorizontal: theme.spacing.xl, marginTop: theme.spacing.md, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.color.brand },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.xxxl },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 32, lineHeight: 40, marginBottom: theme.spacing.sm, letterSpacing: -0.5 },
  subtitle: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, marginBottom: theme.spacing.xl, lineHeight: 20, letterSpacing: 0.2 },
  input: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 18,
    color: theme.color.onSurface,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.color.borderGold,
    marginTop: theme.spacing.lg,
    fontFamily: theme.font.serif,
  },
  options: { gap: theme.spacing.md, marginTop: theme.spacing.lg },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 18,
    borderRadius: theme.radius.md,
  },
  optionSelected: { borderColor: theme.color.brand, backgroundColor: theme.color.brandTint },
  optionText: { color: theme.color.onSurfaceTertiary, fontSize: 15, fontFamily: theme.font.sans, letterSpacing: 0.3 },
  optionTextSelected: { color: theme.color.brand, fontWeight: '600' },
  bottom: { paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.lg, paddingTop: theme.spacing.sm },
  cta: {
    backgroundColor: theme.color.brand,
    borderRadius: theme.radius.pill,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    shadowColor: theme.color.brand,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaText: { color: theme.color.onBrand, fontWeight: '700', fontSize: 14, fontFamily: theme.font.sansMedium, letterSpacing: 1 },
});
