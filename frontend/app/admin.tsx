import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { theme } from '../src/theme';
import { Wordmark, SectionLabel, GoldDivider } from '../src/ui';
import { admin, type AdminOverview } from '../src/api';

const PIN_KEY = 'nur.admin_pin';

const STATUS_LABEL: Record<string, string> = {
  verified: 'Vérifiée',
  trial: 'Découverte',
  paused: 'En pause',
};

export default function Admin() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCodeLabel, setNewCodeLabel] = useState('');
  const [simEmail, setSimEmail] = useState('');
  const [simQty, setSimQty] = useState('1');
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (thePin: string) => {
    const overview = await admin.overview(thePin);
    setData(overview);
    return overview;
  }, []);

  const unlock = async (candidate?: string) => {
    const thePin = (candidate ?? pin).trim();
    if (!thePin) return;
    setBusy(true);
    setError(null);
    try {
      await load(thePin);
      setPin(thePin);
      setUnlocked(true);
      await SecureStore.setItemAsync(PIN_KEY, thePin).catch(() => {});
    } catch (e) {
      console.warn('[admin] unlock failed', e);
      setError('Code incorrect ou serveur indisponible.');
    } finally {
      setBusy(false);
    }
  };

  const tryStoredPin = useCallback(async () => {
    try {
      const stored = await SecureStore.getItemAsync(PIN_KEY);
      if (stored) await unlock(stored);
    } catch {
      // nothing stored
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    void tryStoredPin();
  }, [tryStoredPin]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load(pin);
    } catch (e) {
      console.warn('[admin] refresh failed', e);
    } finally {
      setRefreshing(false);
    }
  };

  const run = async (label: string, fn: () => Promise<any>) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fn();
      await load(pin);
      setNotice(res?.codes ? `${label} : ${res.codes.join(' · ')}` : `${label} ✓`);
    } catch (e: any) {
      console.warn('[admin] action failed', e);
      const msg = String(e?.message || '');
      if (msg.includes('email_unavailable')) {
        setNotice('Quota e-mail atteint — réessayez plus tard');
      } else {
        setNotice(`${label} — échec`);
      }
    } finally {
      setBusy(false);
    }
  };

  const lock = async () => {
    await SecureStore.deleteItemAsync(PIN_KEY).catch(() => {});
    setUnlocked(false);
    setData(null);
    setPin('');
  };

  if (!unlocked) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.lockSafe} edges={['top', 'bottom']}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12} testID="admin-back">
            <Feather name="chevron-left" size={22} color={theme.color.onSurface} />
          </Pressable>
          <View style={styles.lockCenter}>
            <View style={styles.lockIcon}>
              <Feather name="lock" size={24} color={theme.color.brand} />
            </View>
            <Text style={styles.lockTitle}>Espace Nūr</Text>
            <Text style={styles.lockSub}>{"Console privée — activations, périodes d'essai et codes."}</Text>
            <TextInput
              value={pin}
              onChangeText={setPin}
              placeholder="Code PIN"
              placeholderTextColor={theme.color.onSurfaceSecondary}
              style={styles.pinInput}
              secureTextEntry
              autoCapitalize="characters"
              onSubmitEditing={() => unlock()}
              testID="admin-pin"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.cta} onPress={() => unlock()} disabled={busy} testID="admin-unlock">
              {busy ? <ActivityIndicator color={theme.color.onBrand} /> : <Text style={styles.ctaTxt}>DÉVERROUILLER</Text>}
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const c = data?.counts;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.color.brand} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12} testID="admin-close">
              <Feather name="chevron-left" size={22} color={theme.color.onSurface} />
            </Pressable>
            <Wordmark label="ESPACE NŪR" />
            <Pressable onPress={lock} hitSlop={12} testID="admin-lock">
              <Feather name="log-out" size={18} color={theme.color.brand} />
            </Pressable>
          </View>

          {notice ? <Text style={styles.notice} testID="admin-notice">{notice}</Text> : null}

          <View style={styles.kpiGrid}>
            <Kpi label="Clientes" value={c?.users ?? 0} />
            <Kpi label="Vérifiées" value={c?.verified ?? 0} />
            <Kpi label="Découverte" value={c?.trial ?? 0} />
            <Kpi label="En pause" value={c?.paused ?? 0} />
            <Kpi label="Codes commande" value={`${c?.order_codes_used ?? 0}/${c?.order_codes ?? 0}`} />
            <Kpi label="Bilans" value={c?.diagnoses ?? 0} />
          </View>

          <View style={styles.shopifyRow}>
            <Feather
              name={data?.shopify.webhook ? 'check-circle' : 'alert-circle'}
              size={14}
              color={data?.shopify.webhook ? theme.color.success : theme.color.brand}
            />
            <Text style={styles.shopifyTxt}>
              Shopify : {data?.shopify.configured ? data?.shopify.store : 'non configuré'} · webhook{' '}
              {data?.shopify.webhook ? 'actif' : 'en attente de clé'}
            </Text>
          </View>

          <GoldDivider marginV={theme.spacing.lg} />
          <SectionLabel label="Commande de test" />
          <Text style={styles.help}>{"Génère et envoie de vrais codes d'accès, comme une commande payée."}</Text>
          <View style={styles.row}>
            <TextInput
              value={simEmail}
              onChangeText={setSimEmail}
              placeholder="e-mail de la cliente"
              placeholderTextColor={theme.color.onSurfaceSecondary}
              style={[styles.input, { flex: 1 }]}
              autoCapitalize="none"
              keyboardType="email-address"
              testID="admin-sim-email"
            />
            <TextInput
              value={simQty}
              onChangeText={setSimQty}
              placeholder="1"
              placeholderTextColor={theme.color.onSurfaceSecondary}
              style={[styles.input, { width: 56, textAlign: 'center' }]}
              keyboardType="number-pad"
              testID="admin-sim-qty"
            />
            <Pressable
              style={styles.smallBtn}
              disabled={busy || !simEmail.trim()}
              onPress={() => run('Codes envoyés', () => admin.simulateOrder(pin, simEmail.trim(), Number(simQty) || 1))}
              testID="admin-sim-send"
            >
              <Feather name="send" size={16} color={theme.color.onBrand} />
            </Pressable>
          </View>

          <GoldDivider marginV={theme.spacing.lg} />
          <SectionLabel label={`Codes de commande (${data?.order_codes.length ?? 0})`} />
          {(data?.order_codes || []).slice(0, 40).map((oc) => (
            <View key={oc.code} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.code}>{oc.code}</Text>
                <View style={[styles.chip, oc.used ? styles.chipOn : styles.chipOff]}>
                  <Text style={styles.chipTxt}>{oc.used ? 'Utilisé' : 'Disponible'}</Text>
                </View>
              </View>
              <Text style={styles.cardSub}>
                {oc.order_name} · {oc.email}
              </Text>
              <Pressable
                onPress={() => run(`Renvoyé à ${oc.email}`, () => admin.resendCodes(pin, oc.email))}
                testID={`admin-resend-${oc.code}`}
              >
                <Text style={styles.link}>{"Renvoyer l'e-mail"}</Text>
              </Pressable>
            </View>
          ))}
          {(data?.order_codes.length ?? 0) === 0 ? <Text style={styles.help}>{"Aucun code de commande pour l'instant."}</Text> : null}

          <GoldDivider marginV={theme.spacing.lg} />
          <SectionLabel label={`Clientes (${data?.users.length ?? 0})`} />
          {(data?.users || []).slice(0, 60).map((u) => (
            <View key={u.id} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{u.first_name || u.email || u.activation_code || u.id.slice(0, 8)}</Text>
                <View
                  style={[
                    styles.chip,
                    u.access_status === 'verified' ? styles.chipOn : u.access_status === 'paused' ? styles.chipAlert : styles.chipOff,
                  ]}
                >
                  <Text style={styles.chipTxt}>
                    {STATUS_LABEL[u.access_status]}
                    {u.access_status === 'trial' && u.trial_days_left != null ? ` · ${u.trial_days_left} j` : ''}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSub}>
                {u.email || '—'} · {u.order_ref || u.activation_code || '—'}
              </Text>
              <Text style={styles.cardMeta}>
                {(u.created_at || '').slice(0, 10)} · {u.has_diagnosis ? 'bilan fait' : u.has_intake ? 'questionnaire' : 'nouveau'}
              </Text>
            </View>
          ))}

          <GoldDivider marginV={theme.spacing.lg} />
          <SectionLabel label={`Codes partenaires (${data?.partner_codes.length ?? 0})`} />
          <View style={styles.row}>
            <TextInput
              value={newCode}
              onChangeText={setNewCode}
              placeholder="NUR-NOUVEAU"
              placeholderTextColor={theme.color.onSurfaceSecondary}
              style={[styles.input, { flex: 1 }]}
              autoCapitalize="characters"
              testID="admin-new-code"
            />
            <TextInput
              value={newCodeLabel}
              onChangeText={setNewCodeLabel}
              placeholder="libellé"
              placeholderTextColor={theme.color.onSurfaceSecondary}
              style={[styles.input, { flex: 1 }]}
              testID="admin-new-code-label"
            />
            <Pressable
              style={styles.smallBtn}
              disabled={busy || newCode.trim().length < 4}
              onPress={() => run('Code créé', () => admin.partnerCode(pin, newCode.trim(), newCodeLabel.trim() || undefined))}
              testID="admin-create-code"
            >
              <Feather name="plus" size={16} color={theme.color.onBrand} />
            </Pressable>
          </View>
          {(data?.partner_codes || []).map((pc) => (
            <View key={pc.code} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.code}>{pc.code}</Text>
                <Switch
                  value={pc.active !== false}
                  onValueChange={(v) => run(v ? 'Code réactivé' : 'Code révoqué', () => admin.codeState(pin, pc.code, v))}
                  trackColor={{ false: theme.color.border, true: theme.color.brandSoft }}
                  thumbColor={pc.active !== false ? theme.color.brand : theme.color.onSurfaceSecondary}
                  testID={`admin-toggle-${pc.code}`}
                />
              </View>
              <Text style={styles.cardSub}>
                {pc.label || (pc.kind === 'demo' ? 'Démo' : 'Partenaire')} · {pc.uses ?? 0} activation(s) ·{' '}
                {pc.multi_use ? 'multi-usage' : 'usage unique'}
              </Text>
            </View>
          ))}

          <GoldDivider marginV={theme.spacing.lg} />
          <SectionLabel label={`Accès manuels (${data?.allowed.length ?? 0})`} />
          <View style={styles.row}>
            <TextInput
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="e-mail à autoriser"
              placeholderTextColor={theme.color.onSurfaceSecondary}
              style={[styles.input, { flex: 1 }]}
              autoCapitalize="none"
              keyboardType="email-address"
              testID="admin-allow-email"
            />
            <Pressable
              style={styles.smallBtn}
              disabled={busy || !newEmail.includes('@')}
              onPress={() => run('E-mail autorisé', () => admin.allowEmail(pin, newEmail.trim()))}
              testID="admin-allow-send"
            >
              <Feather name="check" size={16} color={theme.color.onBrand} />
            </Pressable>
          </View>
          {(data?.allowed || []).slice(0, 30).map((a) => (
            <Text key={a.email} style={styles.listLine}>
              {a.email} · {a.label || 'manuel'}
            </Text>
          ))}

          {(data?.requests.length ?? 0) > 0 ? (
            <>
              <GoldDivider marginV={theme.spacing.lg} />
              <SectionLabel label={`Demandes d\u2019accès (${data?.requests.length})`} />
              {(data?.requests || []).slice(0, 30).map((r) => (
                <View key={r.email} style={styles.card}>
                  <Text style={styles.cardTitle}>{r.email}</Text>
                  <Text style={styles.cardMeta}>{(r.created_at || '').slice(0, 16).replace('T', ' ')}</Text>
                  <Pressable
                    onPress={() => run('E-mail autorisé', () => admin.allowEmail(pin, r.email))}
                    testID={`admin-allow-${r.email}`}
                  >
                    <Text style={styles.link}>Autoriser</Text>
                  </Pressable>
                </View>
              ))}
            </>
          ) : null}

          <Pressable
            style={styles.dangerBtn}
            onPress={() =>
              Alert.alert('Console Nūr', 'Les actions de cette console sont immédiates et envoient de vrais e-mails.')
            }
          >
            <Text style={styles.dangerTxt}>À propos de cette console</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  lockSafe: { flex: 1 },
  backBtn: { padding: theme.spacing.lg },
  lockCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.huge },
  lockIcon: {
    width: 72, height: 72, borderRadius: 999, backgroundColor: theme.color.brandTint,
    borderWidth: 1, borderColor: theme.color.brand, alignItems: 'center', justifyContent: 'center',
  },
  lockTitle: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 30, marginTop: theme.spacing.md },
  lockSub: { color: theme.color.onSurfaceSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  pinInput: {
    marginTop: theme.spacing.lg, width: '100%', backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1, borderColor: theme.color.borderGold, borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: 15, color: theme.color.onSurface,
    fontSize: 18, letterSpacing: 6, textAlign: 'center', fontFamily: theme.font.mono,
  },
  error: { color: theme.color.error, fontSize: 12 },
  cta: {
    marginTop: theme.spacing.sm, backgroundColor: theme.color.brand, borderRadius: theme.radius.pill,
    paddingVertical: 16, width: '100%', alignItems: 'center', ...theme.shadow.cta,
  },
  ctaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 13, letterSpacing: 2 },
  scroll: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.huge },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.md },
  notice: { color: theme.color.brand, fontSize: 12, textAlign: 'center', paddingBottom: theme.spacing.sm },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  kpi: {
    flexGrow: 1, minWidth: '30%', backgroundColor: theme.color.surfaceSecondary, borderWidth: 1,
    borderColor: theme.color.borderGold, borderRadius: theme.radius.md, paddingVertical: theme.spacing.md,
    alignItems: 'center', gap: 2,
  },
  kpiValue: { color: theme.color.brand, fontSize: 20, fontFamily: theme.font.serif },
  kpiLabel: { color: theme.color.onSurfaceSecondary, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  shopifyRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  shopifyTxt: { color: theme.color.onSurfaceSecondary, fontSize: 11, flex: 1 },
  help: { color: theme.color.onSurfaceSecondary, fontSize: 11, lineHeight: 17, paddingBottom: theme.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingBottom: theme.spacing.sm },
  input: {
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderGold,
    borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: 11,
    color: theme.color.onSurface, fontSize: 13,
  },
  smallBtn: { width: 44, height: 44, borderRadius: 999, backgroundColor: theme.color.brand, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border,
    borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, gap: 4,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  cardTitle: { color: theme.color.onSurface, fontSize: 14, flexShrink: 1 },
  cardSub: { color: theme.color.onSurfaceTertiary, fontSize: 12 },
  cardMeta: { color: theme.color.onSurfaceSecondary, fontSize: 11 },
  code: { color: theme.color.brand, fontFamily: theme.font.mono, fontSize: 14, letterSpacing: 1 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.pill, borderWidth: 1 },
  chipOn: { backgroundColor: theme.color.brandTint, borderColor: theme.color.brand },
  chipOff: { backgroundColor: theme.color.surfaceTertiary, borderColor: theme.color.border },
  chipAlert: { backgroundColor: theme.color.surfaceTertiary, borderColor: theme.color.error },
  chipTxt: { color: theme.color.onSurfaceTertiary, fontSize: 10, letterSpacing: 0.6 },
  link: { color: theme.color.brand, fontSize: 12, textDecorationLine: 'underline', paddingTop: 4 },
  listLine: { color: theme.color.onSurfaceTertiary, fontSize: 12, paddingVertical: 3 },
  dangerBtn: { marginTop: theme.spacing.xl, alignItems: 'center' },
  dangerTxt: { color: theme.color.onSurfaceSecondary, fontSize: 11, textDecorationLine: 'underline' },
});
