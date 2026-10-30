import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Feather from '@react-native-vector-icons/feather';
import { theme, LED_COLORS, LED_NAMES_BY_LANG, makeStyles } from '../../src/theme';
import { GoldDivider, BrandHeader } from '../../src/ui';
import { api, getStoredUserId, DiagnosisRecord, ProgressData, AccessResponse } from '../../src/api';
import { useT, getLang } from '../../src/i18n';
import ProgressCharts from '../../src/components/ProgressCharts';
import { getPatchState, patchReminderVisible, setPatchState } from '../../src/patchTest';
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
  const [showPatch, setShowPatch] = useState(false);

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
  useFocusEffect(useCallback(() => {
    (async () => setShowPatch(patchReminderVisible(await getPatchState())))();
  }, []));

  const todayIdx = new Date().getDay();
  const todayDay = todayIdx === 0 ? 7 : todayIdx;
  const todayPlan = diag?.data?.protocol?.weekly_schedule?.find((d) => d.day === todayDay);
  const todayColorId = todayPlan?.led_color_id || null;
  const todayLedName = todayColorId ? (LED_NAMES_BY_LANG[lang]?.[todayColorId] || LED_COLORS[todayColorId]?.name) : null;
  const todayHex = todayColorId ? LED_COLORS[todayColorId]?.hex : null;
  const sensitiveCare = !!diag?.data?.protocol?.sensitive_care;

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
                <View style={[styles.heroAccent, { backgroundColor: todayHex }]} />
                <Text style={styles.heroKicker}>{t('home.today.kicker')}</Text>
                <View style={styles.heroTitleRow}>
                  <View style={[styles.heroDot, { backgroundColor: todayHex, shadowColor: todayHex }]} />
                  <Text style={styles.heroTitle}>{todayLedName}</Text>
                </View>
                {/* The exact settings to dial on the remote */}
                <View style={styles.settingsBox} testID="today-device-settings">
                  <SettingRow label={t('device.mode')} value={todayPlan?.device_mode || '—'} />
                  <SettingRow label={t('device.brightness')} value={`${todayPlan?.brightness ?? 1} / 3`} />
                  <SettingRow label={t('device.timer')} value={`${todayPlan?.session_minutes ?? 15} ${t('common.minutes')}`} />
                </View>
                {sensitiveCare ? <Text style={styles.caution}>{t('device.caution')}</Text> : null}
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

          {showPatch ? (
            <View style={styles.patchCard} testID="patch-reminder">
              <View style={styles.card2Row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{t('home.patch.title')}</Text>
                  <Text style={styles.cardSub}>{t('home.patch.sub')}</Text>
                </View>
                <Feather name="shield" size={18} color={theme.color.brand} />
              </View>
              <View style={styles.patchRow}>
                <Pressable style={styles.patchCta} onPress={() => router.push('/patch-test')} testID="patch-open">
                  <Text style={styles.patchCtaTxt}>{t('home.patch.cta')}</Text>
                </Pressable>
                <Pressable
                  onPress={async () => { await setPatchState('later'); setShowPatch(false); }}
                  testID="patch-dismiss"
                >
                  <Text style={styles.patchLater}>{t('home.patch.later')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Pressable style={styles.maskCard} onPress={() => router.push('/mask')} testID="open-mask">
            <Feather name="book-open" size={16} color={theme.color.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('home.mask.title')}</Text>
              <Text style={styles.cardSub}>{t('home.mask.sub')}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.color.onSurfaceSecondary} />
          </Pressable>

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

/** One line of the "prescription": label on the left, setting on the right. */
function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.settingValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
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

const styles = makeStyles(() => ({
  // kept for accessibility/tests, visually replaced by BrandHeader
  hiddenTitle: { height: 0, opacity: 0, fontSize: 1, fontFamily: theme.font.sans },
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  title: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 34, marginTop: theme.spacing.md, letterSpacing: -0.5 },
  dateTxt: { ...theme.type.bodySm, color: theme.color.onSurfaceSecondary, marginTop: 2, textTransform: 'capitalize', textAlign: 'center' },
  heroWrap: {
    padding: theme.spacing.xl, borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1, borderColor: theme.color.borderGold,
    overflow: 'hidden', gap: theme.spacing.sm, minHeight: 210, justifyContent: 'center',
    ...theme.shadow.card,
  },
  heroAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  heroDot: { width: 10, height: 10, borderRadius: 999, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  heroKicker: { color: theme.color.brand, letterSpacing: 2.5, fontSize: 10, fontFamily: theme.font.sansMedium, fontWeight: '700' },
  heroTitle: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 30, letterSpacing: -0.3 },
  heroSub: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, lineHeight: 18 },
  heroCta: {
    marginTop: theme.spacing.md, flexDirection: 'row', alignSelf: 'flex-start',
    backgroundColor: theme.color.brand, paddingHorizontal: theme.spacing.lg, paddingVertical: 10,
    borderRadius: theme.radius.pill, gap: 8, alignItems: 'center',
    shadowColor: theme.color.brand, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  heroCtaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 13, fontFamily: theme.font.sansMedium, letterSpacing: 0.5 },
  doneRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: theme.spacing.md },
  doneTxt: { color: theme.color.success, fontSize: 13, fontFamily: theme.font.sansMedium, fontWeight: '600' },
  settingsBox: { marginTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.color.border },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.color.border, gap: theme.spacing.md,
  },
  settingLabel: { ...theme.type.cardLabel, color: theme.color.onSurfaceSecondary, textTransform: 'uppercase' },
  settingValue: { ...theme.type.h2, color: theme.color.onSurface, flexShrink: 1, textAlign: 'right' },
  caution: { ...theme.type.micro, color: theme.color.brand, marginTop: theme.spacing.sm },
  patchCard: {
    marginTop: theme.spacing.lg, backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md, padding: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.color.borderGold, gap: theme.spacing.md,
  },
  patchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
  patchCta: {
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill,
    paddingVertical: 11, paddingHorizontal: theme.spacing.xl,
  },
  patchCtaTxt: { ...theme.type.button, color: theme.color.onBrand },
  patchLater: { ...theme.type.bodySm, color: theme.color.onSurfaceSecondary, textDecorationLine: 'underline' },
  maskCard: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    marginTop: theme.spacing.lg, backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md, padding: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.color.border,
  },
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
  pausedTitle: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 24, textAlign: 'center' },
  pausedSub: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, textAlign: 'center', lineHeight: 20 },
  pausedCta: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, backgroundColor: theme.color.brand,
    paddingVertical: 15, paddingHorizontal: theme.spacing.xl, borderRadius: theme.radius.pill,
    marginTop: theme.spacing.sm, ...theme.shadow.cta,
  },
  pausedCtaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 13, fontFamily: theme.font.sansMedium, letterSpacing: 0.5 },
  pausedMail: { color: theme.color.onSurfaceSecondary, fontSize: 11, fontFamily: theme.font.sans },
}));
