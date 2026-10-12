import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme, LED_COLORS, LED_NAMES_BY_LANG } from '../../src/theme';
import { GoldDivider, BrandHeader } from '../../src/ui';
import { api, getStoredUserId, DiagnosisRecord, ProgressData, AccessResponse } from '../../src/api';
import { useT, getLang } from '../../src/i18n';
import ProgressCharts from '../../src/components/ProgressCharts';
import {
  loadPref, savePref, requestPerm, getPermState, scheduleDailyReminder,
  cancelReminders, openSettings, remindersSupported, ReminderPref, DEFAULT_PREF,
} from '../../src/notifications';

const HOURS = [8, 12, 18, 20, 22];

export default function Home() {
  const { t } = useT();
  const lang = getLang();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [diag, setDiag] = useState<DiagnosisRecord | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pref, setPref] = useState<ReminderPref>(DEFAULT_PREF);
  const [permBlocked, setPermBlocked] = useState(false);

  const load = useCallback(async () => {
    try {
      const uid = await getStoredUserId();
      if (!uid) return;
      const [u, d, s, p] = await Promise.all([
        api.getUser(uid),
        api.getDiagnosis(uid).catch(() => null),
        api.listSessions(uid).catch(() => ({ sessions: [] })),
        api.progress(uid).catch(() => null),
      ]);
      setUser(u);
      setDiag(d as DiagnosisRecord | null);
      setSessions(s?.sessions || []);
      setProgress(p as ProgressData | null);
    } finally { setLoading(false); }
  }, []);

  const loadAccess = useCallback(async () => {
    const uid = await getStoredUserId();
    if (!uid) return;
    const a = await api.getAccess(uid).catch(() => null);
    setAccess(a as AccessResponse | null);
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { loadAccess(); }, [loadAccess]));
  useEffect(() => {
    (async () => {
      const p = await loadPref();
      setPref(p);
      setPermBlocked((await getPermState()) === 'blocked' && p.enabled);
    })();
  }, []);

  const todayIdx = new Date().getDay();
  const todayDay = todayIdx === 0 ? 7 : todayIdx;
  const todayPlan = diag?.data?.protocol?.weekly_schedule?.find((d) => d.day === todayDay);
  const todayColorId = todayPlan?.led_color_id || null;
  const todayLedName = todayColorId ? (LED_NAMES_BY_LANG[lang]?.[todayColorId] || LED_COLORS[todayColorId]?.name) : null;
  const todayHex = todayColorId ? LED_COLORS[todayColorId]?.hex : null;

  const completedToday = sessions.some((s) => new Date(s.date || s.created_at).toDateString() === new Date().toDateString());
  const streak = computeStreak(sessions);

  const onComplete = async () => {
    if (!todayPlan?.led_color_id) return;
    const uid = await getStoredUserId();
    if (!uid) return;
    await api.logSession(uid, { led_color_id: todayPlan.led_color_id, duration_minutes: todayPlan.session_minutes || 12 });
    await load();
  };

  const reminderContent = () => ({
    title: t('notif.push_title'),
    body: todayLedName && todayPlan?.session_minutes
      ? t('notif.push_body', { color: todayLedName, minutes: todayPlan.session_minutes })
      : t('notif.push_body_generic'),
  });

  const applyPref = async (next: ReminderPref) => {
    setPref(next);
    await savePref(next);
    if (next.enabled) await scheduleDailyReminder(next.hour, next.minute, reminderContent());
    else await cancelReminders();
  };

  const toggleReminders = async (v: boolean) => {
    if (!v) { setPermBlocked(false); await applyPref({ ...pref, enabled: false }); return; }
    const state = await requestPerm();
    if (state === 'granted') { setPermBlocked(false); await applyPref({ ...pref, enabled: true }); }
    else if (state === 'blocked') { setPermBlocked(true); setPref({ ...pref, enabled: false }); }
    else setPref({ ...pref, enabled: false });
  };

  const pickHour = async (h: number) => {
    if (!pref.enabled) return;
    await applyPref({ ...pref, hour: h, minute: 0 });
  };

  if (loading) return <View style={[styles.root, styles.center]}><ActivityIndicator color={theme.color.brand} /></View>;

  if (access?.access_status === 'paused') {
    return (
      <View style={[styles.root, styles.center, { padding: theme.spacing.xl }]}>
        <View style={styles.pausedCard}>
          <View style={styles.pausedIcon}>
            <Feather name="pause" size={22} color={theme.color.brand} />
          </View>
          <Text style={styles.pausedTitle}>{t('trial.paused_title')}</Text>
          <Text style={styles.pausedSub}>{t('trial.paused_sub')}</Text>
          <Pressable style={styles.pausedCta} onPress={() => router.push('/link-order')} testID="paused-link-order">
            <Feather name="package" size={14} color={theme.color.onBrand} />
            <Text style={styles.pausedCtaTxt}>{t('trial.link_cta')}</Text>
          </Pressable>
          <Text style={styles.pausedMail}>contact@nurprotocol.com</Text>
        </View>
      </View>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('home.greet.morning');
    if (h < 18) return t('home.greet.afternoon');
    return t('home.greet.evening');
  })();
  const name = user?.intake?.name ? `, ${user.intake.name}` : '';

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl tintColor={theme.color.brand} refreshing={false} onRefresh={load} />}>
          {access?.access_status === 'trial' ? (
            <Pressable style={styles.trialBanner} onPress={() => router.push('/link-order')} testID="trial-banner">
              <Feather name="gift" size={13} color={theme.color.brandDeep} />
              <Text style={styles.trialTxt}>{t('trial.banner', { n: access.trial_days_left ?? 14 })}</Text>
              <Text style={styles.trialLink}>{t('trial.link_cta')}</Text>
              <Feather name="chevron-right" size={14} color={theme.color.brandDeep} />
            </Pressable>
          ) : null}
          <BrandHeader title={`${greeting}${name}`} subtitle={t('home.kicker')} />
          <Text style={styles.hiddenTitle} testID="home-greet">{greeting}{name}</Text>
          <Text style={styles.dateTxt}>{new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'ar' ? 'ar' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <GoldDivider marginV={theme.spacing.lg} />

          <View style={styles.heroWrap}>
            {todayColorId && todayHex ? (
              <>
                <LinearGradient colors={[`${todayHex}55`, 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
                <View style={[styles.heroOrb, { backgroundColor: todayHex, shadowColor: todayHex }]} />
                <Text style={styles.heroKicker}>{t('home.today.kicker')}</Text>
                <Text style={styles.heroTitle}>{todayLedName}</Text>
                <View style={styles.heroMetaRow}>
                  <View style={styles.heroPill}>
                    <Feather name="clock" size={11} color={theme.color.brand} />
                    <Text style={styles.heroPillTxt}>{todayPlan?.session_minutes} {t('common.minutes')}</Text>
                  </View>
                  {todayPlan?.intensity ? (
                    <View style={styles.heroPill}>
                      <Feather name="activity" size={11} color={theme.color.brand} />
                      <Text style={styles.heroPillTxt}>{t('common.intensity')} {todayPlan.intensity}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.heroSub}>{todayPlan?.notes}</Text>
                {completedToday ? (
                  <View style={styles.doneRow}>
                    <Feather name="check-circle" size={14} color={theme.color.success} />
                    <Text style={styles.doneTxt}>{t('home.done')}</Text>
                  </View>
                ) : (
                  <Pressable style={styles.heroCta} onPress={onComplete} testID="complete-session">
                    <Feather name="play" size={12} color={theme.color.onBrand} />
                    <Text style={styles.heroCtaTxt}>{t('home.start')}</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <>
                <Feather name="moon" size={28} color={theme.color.brand} />
                <Text style={styles.heroTitle}>{t('home.rest.title')}</Text>
                <Text style={styles.heroSub}>{t('home.rest.sub')}</Text>
              </>
            )}
          </View>

          <View style={styles.statsRow}>
            <Stat label={t('home.stat.streak')} value={`${streak}`} icon="trending-up" />
            <Stat label={t('home.stat.sessions')} value={`${sessions.length}`} icon="check" />
            <Stat label={t('home.stat.week')} value={`${weekCount(sessions)}/${weeklyTarget(diag)}`} icon="calendar" />
          </View>

          <View style={styles.reminderCard}>
            <View style={styles.card2Row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('home.reminders.title')}</Text>
                <Text style={styles.cardSub}>
                  {remindersSupported ? t('notif.pre_sub') : t('notif.web_unsupported')}
                </Text>
              </View>
              <Switch
                value={pref.enabled}
                onValueChange={toggleReminders}
                disabled={!remindersSupported}
                trackColor={{ true: theme.color.brand, false: theme.color.borderStrong }}
                thumbColor={theme.color.onBrand}
                testID="reminders-toggle"
              />
            </View>

            {pref.enabled ? (
              <View style={styles.hoursWrap}>
                <Text style={styles.hoursLabel}>{t('notif.hour')}</Text>
                <View style={styles.hoursRow}>
                  {HOURS.map((h) => {
                    const on = pref.hour === h;
                    return (
                      <Pressable
                        key={h}
                        onPress={() => pickHour(h)}
                        style={[styles.hourChip, on && styles.hourChipOn]}
                        testID={`reminder-hour-${h}`}
                      >
                        <Text style={[styles.hourTxt, on && styles.hourTxtOn]}>{`${h}h`}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {permBlocked ? (
              <View style={styles.blockedWrap}>
                <Text style={styles.blockedTxt}>{t('notif.blocked')}</Text>
                <Pressable style={styles.settingsBtn} onPress={openSettings} testID="open-notif-settings">
                  <Feather name="settings" size={12} color={theme.color.brand} />
                  <Text style={styles.settingsTxt}>{t('notif.open_settings')}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {progress ? <ProgressCharts data={progress} /> : null}

          {diag?.data?.summary ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('home.profile.title')}</Text>
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
      <Feather name={icon} size={13} color={theme.color.brand} />
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {label}
      </Text>
    </View>
  );
}

function computeStreak(sessions: any[]): number {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map((s) => new Date(s.date || s.created_at).toDateString()));
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function weekCount(sessions: any[]): number {
  const start = new Date(); start.setDate(start.getDate() - 6);
  return sessions.filter((s) => new Date(s.date || s.created_at) >= start).length;
}
function weeklyTarget(diag: DiagnosisRecord | null): number {
  if (!diag) return 0;
  return diag.data.protocol.weekly_schedule.filter((d) => d.led_color_id).length;
}

const styles = StyleSheet.create({
  // kept for accessibility/tests, visually replaced by BrandHeader
  hiddenTitle: { height: 0, opacity: 0, fontSize: 1, fontFamily: theme.font.sans },
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 34, marginTop: theme.spacing.md, letterSpacing: -0.5 },
  dateTxt: { ...theme.type.bodySm, color: theme.color.onSurfaceSecondary, marginTop: 2, textTransform: 'capitalize', textAlign: 'center' },
  heroWrap: {
    padding: theme.spacing.xl, borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1, borderColor: theme.color.borderGold,
    overflow: 'hidden', gap: theme.spacing.sm, minHeight: 210, justifyContent: 'center',
    ...theme.shadow.card,
  },
  heroOrb: { position: 'absolute', width: 160, height: 160, borderRadius: 999, right: -50, top: -40, opacity: 0.55, shadowOpacity: 0.9, shadowRadius: 70, shadowOffset: { width: 0, height: 0 } },
  heroKicker: { color: theme.color.brand, letterSpacing: 2.5, fontSize: 10, fontFamily: theme.font.sansMedium, fontWeight: '700' },
  heroTitle: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 30, letterSpacing: -0.3 },
  heroSub: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, lineHeight: 18 },
  heroMetaRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.radius.pill, backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.brand },
  heroPillTxt: { color: theme.color.brand, fontSize: 11, fontFamily: theme.font.sansMedium, fontWeight: '600', textTransform: 'capitalize' },
  heroCta: {
    marginTop: theme.spacing.md, flexDirection: 'row', alignSelf: 'flex-start',
    backgroundColor: theme.color.brand, paddingHorizontal: theme.spacing.lg, paddingVertical: 10,
    borderRadius: theme.radius.pill, gap: 8, alignItems: 'center',
    shadowColor: theme.color.brand, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  heroCtaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 13, fontFamily: theme.font.sansMedium, letterSpacing: 0.5 },
  doneRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: theme.spacing.md },
  doneTxt: { color: theme.color.success, fontSize: 13, fontFamily: theme.font.sansMedium, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  stat: { flex: 1, minWidth: 0, backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md, paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.color.borderGold, gap: 6, ...theme.shadow.soft },
  statValue: { ...theme.type.stat, color: theme.color.onSurface },
  // No letterSpacing inside narrow cards — this is what used to break "STREAK" into "STREA / K"
  statLabel: { ...theme.type.cardLabel, color: theme.color.onSurfaceSecondary, textTransform: 'uppercase' },
  card: {
    flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.lg,
    backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md,
    padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.color.borderGold,
    gap: theme.spacing.md, ...theme.shadow.soft,
  },
  cardTitle: { color: theme.color.onSurface, fontSize: 13, fontFamily: theme.font.sansMedium, fontWeight: '600', letterSpacing: 0.3 },
  cardSub: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontFamily: theme.font.sans, marginTop: 4, lineHeight: 18 },
  reminderCard: {
    marginTop: theme.spacing.lg, backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md, padding: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.color.borderGold, ...theme.shadow.soft,
  },
  card2Row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  hoursWrap: { marginTop: theme.spacing.lg, gap: theme.spacing.sm },
  hoursLabel: { color: theme.color.brand, fontSize: 10, fontFamily: theme.font.sans, letterSpacing: 1.6, textTransform: 'uppercase' },
  hoursRow: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
  hourChip: {
    paddingHorizontal: theme.spacing.lg, paddingVertical: 10, borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.color.borderStrong, backgroundColor: theme.color.surfaceTertiary,
    minWidth: 54, alignItems: 'center',
  },
  hourChipOn: { borderColor: theme.color.brand, backgroundColor: theme.color.brandTint },
  hourTxt: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontFamily: theme.font.sansMedium, fontWeight: '600' },
  hourTxtOn: { color: theme.color.brand },
  blockedWrap: { marginTop: theme.spacing.md, gap: theme.spacing.sm },
  blockedTxt: { color: theme.color.error, fontSize: 11, fontFamily: theme.font.sans, lineHeight: 16 },
  settingsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.lg, paddingVertical: 12, borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.color.borderGold, backgroundColor: 'rgba(201,169,97,0.06)',
  },
  settingsTxt: { color: theme.color.brand, fontSize: 12, fontFamily: theme.font.sansMedium, fontWeight: '600' },
  trialBanner: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.borderGold,
    borderRadius: theme.radius.pill, paddingVertical: 10, paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  trialTxt: { color: theme.color.brandDeep, fontSize: 11, fontFamily: theme.font.sansMedium, fontWeight: '600', flex: 1 },
  trialLink: { color: theme.color.brandDeep, fontSize: 11, fontFamily: theme.font.sans, textDecorationLine: 'underline' },
  pausedCard: {
    backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.lg,
    padding: theme.spacing.xl, borderWidth: 1, borderColor: theme.color.borderGold,
    alignItems: 'center', gap: theme.spacing.md, ...theme.shadow.card,
  },
  pausedIcon: {
    width: 58, height: 58, borderRadius: 999, backgroundColor: theme.color.brandTint,
    borderWidth: 1, borderColor: theme.color.borderGold, alignItems: 'center', justifyContent: 'center',
  },
  pausedTitle: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 24, textAlign: 'center' },
  pausedSub: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, textAlign: 'center', lineHeight: 20 },
  pausedCta: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, backgroundColor: theme.color.brand,
    paddingVertical: 15, paddingHorizontal: theme.spacing.xl, borderRadius: theme.radius.pill,
    marginTop: theme.spacing.sm, ...theme.shadow.cta,
  },
  pausedCtaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 13, fontFamily: theme.font.sansMedium, letterSpacing: 0.5 },
  pausedMail: { color: theme.color.onSurfaceSecondary, fontSize: 11, fontFamily: theme.font.sans },
});
