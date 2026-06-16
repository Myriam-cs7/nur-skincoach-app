import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { api, getStoredUserId, clearStoredUser } from '../../src/api';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const uid = await getStoredUserId();
      if (!uid) return;
      try {
        const u = await api.getUser(uid);
        setUser(u);
      } catch {}
    })();
  }, []);

  const onReset = async () => {
    const uid = await getStoredUserId();
    if (uid) {
      try { await api.resetUser(uid); } catch {}
    }
    await clearStoredUser();
    router.replace('/');
  };

  const onRedoScan = () => router.push('/scan');

  if (!user) return <View style={[styles.root, styles.center]}><ActivityIndicator color={theme.color.brand} /></View>;

  const intake = user.intake || {};

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>PROFIL</Text>
          <Text style={styles.title} testID="profile-title">{intake.name || 'Mon Skincoach'}</Text>
          <Text style={styles.code}>Code · {user.activation_code}</Text>

          <Text style={styles.section}>Votre profil</Text>
          <Row label="Type de peau" value={intake.skin_type} />
          <Row label="Âge" value={intake.age_range} />
          <Row label="Localisation" value={intake.location} />
          <Row label="Climat" value={intake.climate} />
          <Row label="Mode de vie" value={intake.lifestyle} />
          <Row label="Sommeil" value={intake.sleep_hours} />
          <Row label="Stress" value={intake.stress_level} />
          <Row label="Hydratation" value={intake.water_intake} />

          <Text style={styles.section}>Préoccupations</Text>
          <View style={styles.chips}>
            {(intake.concerns || []).map((c: string) => (
              <View key={c} style={styles.chip}><Text style={styles.chipTxt}>{c}</Text></View>
            ))}
          </View>

          <Text style={styles.section}>Actions</Text>
          <Pressable style={styles.actionRow} onPress={onRedoScan} testID="redo-scan">
            <Feather name="camera" size={18} color={theme.color.brand} />
            <Text style={styles.actionTxt}>Refaire mon bilan beauté</Text>
            <Feather name="chevron-right" size={18} color={theme.color.onSurfaceSecondary} />
          </Pressable>
          <Pressable style={styles.actionRow} onPress={onReset} testID="reset-account">
            <Feather name="log-out" size={18} color={theme.color.error} />
            <Text style={[styles.actionTxt, { color: theme.color.error }]}>Réinitialiser mon compte</Text>
            <Feather name="chevron-right" size={18} color={theme.color.onSurfaceSecondary} />
          </Pressable>

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xxl },
  kicker: { color: theme.color.brand, letterSpacing: 3, fontSize: 11, fontWeight: '600' },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 30, marginTop: theme.spacing.sm },
  code: { color: theme.color.onSurfaceSecondary, fontSize: 12, marginTop: 4, letterSpacing: 1 },
  section: { color: theme.color.onSurface, fontSize: 11, letterSpacing: 2, fontWeight: '700', marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.color.divider },
  rowLabel: { color: theme.color.onSurfaceSecondary, fontSize: 13 },
  rowValue: { color: theme.color.onSurface, fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.radius.pill, backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.brand },
  chipTxt: { color: theme.color.brand, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.color.divider },
  actionTxt: { flex: 1, color: theme.color.onSurface, fontSize: 14 },
});
