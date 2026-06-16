import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { theme } from '../src/theme';
import { GoldDivider, Wordmark } from '../src/ui';
import { api, setStoredUser } from '../src/api';
import { useT } from '../src/i18n';

export default function Activate() {
  const router = useRouter();
  const { t } = useT();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onValidate = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true); setErr(null);
    try {
      const r = await api.activate(c);
      await setStoredUser(r.user_id, r.activation_code);
      if (r.has_diagnosis) router.replace('/(tabs)/home');
      else if (r.has_intake) router.replace('/scan');
      else router.replace('/onboarding');
    } catch (e: any) {
      if (String(e?.message || '').includes('403')) setErr(t('welcome.code_invalid'));
      else setErr(String(e?.message || 'Erreur'));
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <LinearGradient colors={['#0e0a04', '#06060A', '#04040A']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1, padding: theme.spacing.xl }} edges={['top','bottom']}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: theme.spacing.lg }} testID="activate-back">
          <Feather name="chevron-left" size={24} color={theme.color.onSurface} />
        </Pressable>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={styles.iconCircle}>
            <Feather name="lock" size={26} color={theme.color.brand} />
          </View>
          <Wordmark label="NŪR PROTOCOL" />
          <Text style={styles.title}>{t('welcome.code_title')}</Text>
          <GoldDivider marginV={theme.spacing.md} />
          <Text style={styles.sub}>{t('welcome.code_sub')}</Text>

          <TextInput
            value={code}
            onChangeText={(v) => { setCode(v.toUpperCase()); setErr(null); }}
            placeholder={t('welcome.code_placeholder')}
            placeholderTextColor={theme.color.onSurfaceSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[styles.input, err && { borderColor: theme.color.error }]}
            testID="activate-code-input"
          />
          {err ? <Text style={styles.err}>{err}</Text> : null}

          <Pressable style={[styles.cta, (!code || busy) && { opacity: 0.4 }]} onPress={onValidate} disabled={!code || busy} testID="activate-validate">
            {busy ? <ActivityIndicator color={theme.color.onBrand} /> : (
              <>
                <Text style={styles.ctaTxt}>{t('welcome.code_validate')}</Text>
                <Feather name="arrow-right" size={16} color={theme.color.onBrand} />
              </>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace('/discover')} style={{ marginTop: theme.spacing.lg }} testID="no-code-link">
            <Text style={styles.noCode}>{t('welcome.code_required')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  iconCircle: { alignSelf: 'center', width: 70, height: 70, borderRadius: 999, backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.brand, alignItems: 'center', justifyContent: 'center', shadowColor: theme.color.brand, shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 0 }, marginBottom: theme.spacing.lg },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 30, textAlign: 'center', marginTop: theme.spacing.md, letterSpacing: -0.5 },
  sub: { color: theme.color.onSurfaceSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  input: { backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderGold, borderRadius: theme.radius.md, padding: 18, color: theme.color.onSurface, fontSize: 18, marginTop: theme.spacing.xl, fontFamily: theme.font.mono, letterSpacing: 2, textAlign: 'center' },
  err: { color: theme.color.error, fontSize: 12, textAlign: 'center', marginTop: theme.spacing.sm },
  cta: { backgroundColor: theme.color.brand, borderRadius: theme.radius.pill, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xl, shadowColor: theme.color.brand, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 6 } },
  ctaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 14, letterSpacing: 1 },
  noCode: { color: theme.color.onSurfaceSecondary, fontSize: 12, textAlign: 'center', textDecorationLine: 'underline' },
});
