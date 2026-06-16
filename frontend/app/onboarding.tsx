import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../src/theme';
import { api, getStoredUserId, IntakePayload } from '../src/api';

type Step = {
  key: keyof IntakePayload;
  title: string;
  subtitle?: string;
  type: 'single' | 'multi' | 'text';
  options?: { value: string; label: string }[];
};

const STEPS: Step[] = [
  { key: 'name', title: 'Comment vous appelez-vous ?', subtitle: 'Optionnel — pour personnaliser votre expérience', type: 'text' },
  {
    key: 'age_range', title: 'Quel est votre âge ?', type: 'single',
    options: [
      { value: '<25', label: 'Moins de 25 ans' },
      { value: '25-34', label: '25 – 34 ans' },
      { value: '35-44', label: '35 – 44 ans' },
      { value: '45-54', label: '45 – 54 ans' },
      { value: '55+', label: '55 ans et plus' },
    ],
  },
  {
    key: 'gender', title: 'Vous êtes…', type: 'single',
    options: [
      { value: 'femme', label: 'Femme' }, { value: 'homme', label: 'Homme' }, { value: 'autre', label: 'Autre / je préfère ne pas dire' },
    ],
  },
  {
    key: 'skin_type', title: 'Quel est votre type de peau ?', type: 'single',
    options: [
      { value: 'seche', label: 'Sèche' },
      { value: 'grasse', label: 'Grasse' },
      { value: 'mixte', label: 'Mixte' },
      { value: 'normale', label: 'Normale' },
      { value: 'sensible', label: 'Sensible' },
    ],
  },
  { key: 'location', title: 'Où vivez-vous ?', subtitle: 'Ville, pays — pour adapter au climat', type: 'text' },
  {
    key: 'climate', title: 'Quel est votre climat ?', type: 'single',
    options: [
      { value: 'tempere', label: 'Tempéré' }, { value: 'sec', label: 'Sec' }, { value: 'humide', label: 'Humide' }, { value: 'froid', label: 'Froid' }, { value: 'tropical', label: 'Tropical' },
    ],
  },
  {
    key: 'sun_exposure', title: 'Exposition au soleil', type: 'single',
    options: [{ value: 'faible', label: 'Faible' }, { value: 'moyenne', label: 'Moyenne' }, { value: 'forte', label: 'Forte' }],
  },
  {
    key: 'lifestyle', title: 'Mode de vie', type: 'single',
    options: [{ value: 'sedentaire', label: 'Sédentaire' }, { value: 'actif', label: 'Actif' }, { value: 'tres_actif', label: 'Très actif' }],
  },
  {
    key: 'sleep_hours', title: 'Heures de sommeil', type: 'single',
    options: [{ value: '<6', label: 'Moins de 6h' }, { value: '6-7', label: '6 – 7h' }, { value: '7-8', label: '7 – 8h' }, { value: '>8', label: 'Plus de 8h' }],
  },
  {
    key: 'stress_level', title: 'Niveau de stress', type: 'single',
    options: [{ value: 'faible', label: 'Faible' }, { value: 'moyen', label: 'Moyen' }, { value: 'eleve', label: 'Élevé' }],
  },
  {
    key: 'water_intake', title: 'Hydratation quotidienne', type: 'single',
    options: [{ value: '<1L', label: 'Moins de 1L' }, { value: '1-2L', label: '1 – 2L' }, { value: '>2L', label: 'Plus de 2L' }],
  },
  {
    key: 'concerns', title: 'Vos préoccupations', subtitle: 'Sélectionnez tout ce qui s\'applique', type: 'multi',
    options: [
      { value: 'acne', label: 'Acné' }, { value: 'rides', label: 'Rides' }, { value: 'taches', label: 'Taches' },
      { value: 'rougeurs', label: 'Rougeurs' }, { value: 'pores', label: 'Pores dilatés' },
      { value: 'ternissement', label: 'Teint terne' }, { value: 'sensibilite', label: 'Sensibilité' }, { value: 'cicatrices', label: 'Cicatrices' },
    ],
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [data, setData] = useState<Partial<IntakePayload>>({ concerns: [] });
  const [saving, setSaving] = useState(false);

  const step = STEPS[idx];
  const current = (data as any)[step.key];
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
    if (idx < STEPS.length - 1) {
      setIdx(idx + 1);
      return;
    }
    setSaving(true);
    try {
      const uid = await getStoredUserId();
      if (!uid) throw new Error('No user');
      const payload: IntakePayload = {
        name: data.name,
        age_range: data.age_range!,
        gender: data.gender,
        skin_type: data.skin_type!,
        location: data.location!,
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
    } finally {
      setSaving(false);
    }
  };

  const onBack = () => {
    if (idx === 0) router.back();
    else setIdx(idx - 1);
  };

  const progress = (idx + 1) / STEPS.length;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={onBack} hitSlop={12} testID="onboarding-back">
            <Feather name="chevron-left" size={26} color={theme.color.onSurface} />
          </Pressable>
          <Text style={styles.progressTxt}>{idx + 1} / {STEPS.length}</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title} testID={`onb-title-${idx}`}>{step.title}</Text>
          {step.subtitle ? <Text style={styles.subtitle}>{step.subtitle}</Text> : null}

          {step.type === 'text' && (
            <TextInput
              testID={`onb-input-${step.key}`}
              value={(current as string) || ''}
              onChangeText={(t) => setData({ ...data, [step.key]: t })}
              placeholder={step.key === 'name' ? 'Votre prénom' : 'Ex : Paris, France'}
              placeholderTextColor={theme.color.onSurfaceSecondary}
              style={styles.input}
              autoFocus
            />
          )}

          {(step.type === 'single' || step.type === 'multi') && (
            <View style={styles.options}>
              {step.options!.map((o) => {
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
          <Pressable
            onPress={onNext}
            disabled={!canNext || saving}
            style={[styles.cta, (!canNext || saving) && { opacity: 0.4 }]}
            testID="onboarding-next"
          >
            <Text style={styles.ctaText}>
              {saving ? 'Enregistrement…' : idx === STEPS.length - 1 ? 'Lancer le diagnostic' : 'Continuer'}
            </Text>
            <Feather name="arrow-right" size={18} color={theme.color.onBrand} />
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
  progressTxt: { color: theme.color.onSurfaceSecondary, fontSize: 12, letterSpacing: 1.5 },
  progressBar: { height: 2, backgroundColor: theme.color.divider, marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.color.brand },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.xxxl },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 30, lineHeight: 38, marginBottom: theme.spacing.sm },
  subtitle: { color: theme.color.onSurfaceSecondary, fontSize: 14, marginBottom: theme.spacing.xl, lineHeight: 20 },
  input: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 16,
    color: theme.color.onSurface,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
    marginTop: theme.spacing.lg,
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
    paddingVertical: 16,
    borderRadius: theme.radius.md,
  },
  optionSelected: { borderColor: theme.color.brand, backgroundColor: theme.color.brandTint },
  optionText: { color: theme.color.onSurfaceTertiary, fontSize: 15 },
  optionTextSelected: { color: theme.color.brand, fontWeight: '600' },
  bottom: { paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.lg, paddingTop: theme.spacing.sm },
  cta: {
    backgroundColor: theme.color.brand,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  ctaText: { color: theme.color.onBrand, fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
});
