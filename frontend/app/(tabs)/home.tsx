import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { theme, LED_COLORS, DAYS_FR } from '../../src/theme';
import { api, getStoredUserId, DiagnosisRecord } from '../../src/api';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [diag, setDiag] = useState<DiagnosisRecord | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [remindersOn, setRemindersOn] = useState(false);

  const load = useCallback(async () => {
    try {
      const uid = await getStoredUserId();
      if (!uid) return;
      const [u, d, s] = await Promise.all([
        api.getUser(uid),
        api.getDiagnosis(uid).catch(() => null),
        api.listSessions(uid).catch(() => ({ sessions: [] })),
      ]);
      setUser(u);
      setDiag(d as DiagnosisRecord | null);
      setSessions(s?.sessions || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const todayIdx = new Date().getDay(); // 0 Sun .. 6 Sat
  const todayDay = todayIdx === 0 ? 7 : todayIdx; // 1 Mon .. 7 Sun
  const todayPlan = diag?.data?.protocol?.weekly_schedule?.find((d) => d.day === todayDay);
  const todayColor = todayPlan?.led_color_id ? LED_COLORS[todayPlan.led_color_id] : null;

  const completedToday = sessions.some(
    (s) => new Date(s.date || s.created_at).toDateString() === new Date().toDateString()
  );
  const streak = computeStreak(sessions);

  const onComplete = async () => {
    if (!todayPlan?.led_color_id) return;
    const uid = await getStoredUserId();
    if (!uid) return;
    await api.logSession(uid, {
      led_color_id: todayPlan.led_color_id,
      duration_minutes: todayPlan.session_minutes || 12,
    });
    await load();
  };

  const toggleReminders = async (v: boolean) => {
    setRemindersOn(v);
    if (v) {
      const perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted) {
        setRemindersOn(false);
        return;
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Nūr Protocol', body: 'Votre séance LED quotidienne vous attend.' },
        trigger: Platform.OS === 'web' ? null : ({ hour: 20, minute: 0, repeats: true } as any),
      });
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.color.brand} />
      </View>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();
  const name = user?.intake?.name ? `, ${user.intake.name}` : '';

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl tintColor={theme.color.brand} refreshing={false} onRefresh={load} />}
        >
          <Text style={styles.kicker}>NŪR PROTOCOL</Text>
          <Text style={styles.title} testID="home-greet">{greeting}{name}</Text>
          <Text style={styles.dateTxt}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>

          {/* Today hero */}
          <View style={styles.heroWrap}>
            {todayColor ? (
              <>
                <LinearGradient
                  colors={[`${todayColor.hex}55`, 'transparent']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={[styles.heroOrb, { backgroundColor: todayColor.hex, shadowColor: todayColor.hex }]} />
                <Text style={styles.heroKicker}>SÉANCE DU JOUR</Text>
                <Text style={styles.heroTitle}>Lumière {todayColor.name}</Text>
                <Text style={styles.heroSub}>{todayPlan?.session_minutes} minutes · {todayPlan?.notes}</Text>
                {completedToday ? (
                  <View style={styles.doneRow}>
                    <Feather name="check-circle" size={16} color={theme.color.success} />
                    <Text style={styles.doneTxt}>Séance complétée</Text>
                  </View>
                ) : (
                  <Pressable style={styles.heroCta} onPress={onComplete} testID="complete-session">
                    <Feather name="play" size={14} color={theme.color.onBrand} />
                    <Text style={styles.heroCtaTxt}>Démarrer la séance</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <>
                <Feather name="moon" size={28} color={theme.color.brand} />
                <Text style={styles.heroTitle}>Journée de pause</Text>
                <Text style={styles.heroSub}>Profitez d&apos;une pause beauté aujourd&apos;hui.</Text>
              </>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <Stat label="Streak" value={`${streak}j`} icon="trending-up" />
            <Stat label="Séances" value={`${sessions.length}`} icon="check" />
            <Stat label="Semaine" value={`${weekCount(sessions)}/${weeklyTarget(diag)}`} icon="calendar" />
          </View>

          {/* Reminders */}
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Rappels quotidiens</Text>
              <Text style={styles.cardSub}>Notification à 20h00 chaque jour</Text>
            </View>
            <Switch
              value={remindersOn}
              onValueChange={toggleReminders}
              trackColor={{ true: theme.color.brand, false: theme.color.borderStrong }}
              thumbColor={theme.color.onBrand}
              testID="reminders-toggle"
            />
          </View>

          {/* Quick summary */}
          {diag?.data?.summary ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Votre bilan</Text>
              <Text style={styles.cardSub}>{diag.data.summary}</Text>
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: any }) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={14} color={theme.color.brand} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function computeStreak(sessions: any[]): number {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map((s) => new Date(s.date || s.created_at).toDateString()));
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function weekCount(sessions: any[]): number {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return sessions.filter((s) => new Date(s.date || s.created_at) >= start).length;
}

function weeklyTarget(diag: DiagnosisRecord | null): number {
  if (!diag) return 0;
  return diag.data.protocol.weekly_schedule.filter((d) => d.led_color_id).length;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xxl },
  kicker: { color: theme.color.brand, letterSpacing: 3, fontSize: 11, fontWeight: '600' },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 32, marginTop: theme.spacing.sm },
  dateTxt: { color: theme.color.onSurfaceSecondary, fontSize: 13, marginTop: 4, textTransform: 'capitalize' },
  heroWrap: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.border,
    overflow: 'hidden',
    gap: theme.spacing.sm,
    minHeight: 200,
    justifyContent: 'center',
  },
  heroOrb: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 999,
    right: -40,
    top: -30,
    opacity: 0.6,
    shadowOpacity: 0.9,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
  },
  heroKicker: { color: theme.color.brand, letterSpacing: 2, fontSize: 10, fontWeight: '600' },
  heroTitle: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 28 },
  heroSub: { color: theme.color.onSurfaceSecondary, fontSize: 13 },
  heroCta: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: theme.color.brand,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    gap: 8,
    alignItems: 'center',
  },
  heroCtaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 13 },
  doneRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: theme.spacing.md },
  doneTxt: { color: theme.color.success, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  stat: { flex: 1, backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.color.border, gap: 4 },
  statValue: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 22 },
  statLabel: { color: theme.color.onSurfaceSecondary, fontSize: 11, letterSpacing: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.color.border,
    gap: theme.spacing.md,
  },
  cardTitle: { color: theme.color.onSurface, fontSize: 14, fontWeight: '600' },
  cardSub: { color: theme.color.onSurfaceSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
});
