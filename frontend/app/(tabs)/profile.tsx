import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@react-native-vector-icons/feather';
import { theme, makeStyles } from '../../src/theme';
import { SectionLabel, GoldDivider, BrandHeader } from '../../src/ui';
import { api, getStoredUserId, clearStoredUser } from '../../src/api';
import { useT, setLang, getLang, Lang } from '../../src/i18n';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
];

export default function Profile() {
  const router = useRouter();
  const { t } = useT();
  const [user, setUser] = useState<any>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [products, setProducts] = useState('');
  const [savingProducts, setSavingProducts] = useState(false);
  const [productsErr, setProductsErr] = useState(false);
  const [savedProducts, setSavedProducts] = useState(false);
  const currentLang = getLang();

  useEffect(() => {
    (async () => {
      const uid = await getStoredUserId();
      if (!uid) return;
      try {
        const u = await api.getUser(uid);
        setUser(u);
        setProducts(u?.own_products || '');
      } catch {}
    })();
  }, []);

  const onSaveProducts = async () => {
    const uid = await getStoredUserId();
    if (!uid) return;
    setSavingProducts(true);
    try {
      await api.saveProducts(uid, products);
      setSavedProducts(true);
      setProductsErr(false);
    } catch {
      setSavedProducts(false);
      setProductsErr(true);
    } finally {
      setSavingProducts(false);
    }
  };

  const [deleting, setDeleting] = useState(false);

  const wipeAccount = async () => {
    setDeleting(true);
    const uid = await getStoredUserId();
    if (uid) {
      try {
        await api.resetUser(uid);
      } catch (e) {
        console.warn('[profile] delete failed', e);
      }
    }
    await clearStoredUser();
    setDeleting(false);
    router.replace('/');
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const onRedoScan = () => router.push('/scan');

  if (!user) return <View style={[styles.root, styles.center]}><ActivityIndicator color={theme.color.brand} /></View>;

  const intake = user.intake || {};

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Pressable onLongPress={() => router.push('/admin')} delayLongPress={1200} testID="profile-admin-gate">
            <BrandHeader title={intake.name || t('profile.title')} />
          </Pressable>
          <Text style={styles.hiddenTitle} testID="profile-title">{intake.name || t('profile.title')}</Text>
          <Text style={styles.code}>{t('profile.code')} · {user.activation_code}</Text>
          <GoldDivider marginV={theme.spacing.xl} />

          <SectionLabel label={t('profile.language')} />
          <View style={styles.langRow}>
            {LANGS.map((l) => {
              const active = currentLang === l.code;
              return (
                <Pressable key={l.code} onPress={() => setLang(l.code)} style={[styles.langChip, active && styles.langChipActive]} testID={`lang-${l.code}`}>
                  <Text style={[styles.langTxt, active && styles.langTxtActive]}>{l.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <SectionLabel label={t('profile.profile')} />
          <Row label="Type" value={intake.skin_type} />
          <Row label="Age" value={intake.age_range} />
          <Row label="Climate" value={intake.climate} />
          <Row label="Lifestyle" value={intake.lifestyle} />
          <Row label="Sleep" value={intake.sleep_hours} />
          <Row label="Stress" value={intake.stress_level} />
          <Row label="Hydration" value={intake.water_intake} />

          <SectionLabel label={t('products.title')} />
          <View style={styles.productsCard}>
            <Text style={styles.productsSub}>{t('products.sub')}</Text>
            <TextInput
              value={products}
              onChangeText={(v) => { setProducts(v); setSavedProducts(false); }}
              placeholder={t('products.placeholder')}
              placeholderTextColor={theme.color.onSurfaceSecondary}
              multiline
              numberOfLines={4}
              maxLength={1500}
              style={styles.productsInput}
              testID="products-input"
            />
            <View style={styles.productsRow}>
              <Pressable
                style={[styles.productsSave, savingProducts && { opacity: 0.5 }]}
                onPress={onSaveProducts}
                disabled={savingProducts}
                testID="products-save"
              >
                <Text style={styles.productsSaveTxt}>
                  {savedProducts ? t('products.saved') : t('products.save')}
                </Text>
              </Pressable>
              <Text
                style={[styles.productsPrivate, productsErr && styles.productsErrTxt]}
                testID="products-error-line"
              >
                {productsErr ? t('products.error') : t('products.private')}
              </Text>
            </View>
          </View>

          <SectionLabel label={t('profile.actions')} />
          <Pressable style={styles.actionRow} onPress={() => router.push('/mask')} testID="open-mask">
            <Feather name="book-open" size={16} color={theme.color.brand} />
            <Text style={styles.actionTxt}>{t('profile.mask')}</Text>
            <Feather name="chevron-right" size={16} color={theme.color.onSurfaceSecondary} />
          </Pressable>
          <Pressable style={styles.actionRow} onPress={() => router.push('/patch-test')} testID="open-patch-test">
            <Feather name="shield" size={16} color={theme.color.brand} />
            <Text style={styles.actionTxt}>{t('profile.patch')}</Text>
            <Feather name="chevron-right" size={16} color={theme.color.onSurfaceSecondary} />
          </Pressable>
          <Pressable style={styles.actionRow} onPress={() => router.push('/onboarding')} testID="redo-assessment">
            <Feather name="refresh-cw" size={16} color={theme.color.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTxt}>{t('profile.redo_full')}</Text>
              <Text style={styles.actionHint}>{t('profile.redo_full.hint')}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.color.onSurfaceSecondary} />
          </Pressable>
          <Pressable style={styles.actionRow} onPress={onRedoScan} testID="redo-scan">
            <Feather name="camera" size={16} color={theme.color.brand} />
            <Text style={styles.actionTxt}>{t('profile.redo')}</Text>
            <Feather name="chevron-right" size={16} color={theme.color.onSurfaceSecondary} />
          </Pressable>
          <Pressable style={styles.actionRow} onPress={() => setShowPrivacy(!showPrivacy)} testID="privacy-toggle">
            <Feather name="lock" size={16} color={theme.color.brand} />
            <Text style={styles.actionTxt}>{t('profile.privacy')}</Text>
            <Feather name={showPrivacy ? 'chevron-up' : 'chevron-right'} size={16} color={theme.color.onSurfaceSecondary} />
          </Pressable>
          {showPrivacy && (
            <View style={styles.privacyBody}>
              <Text style={styles.privacyTxt}>{t('profile.privacy.body')}</Text>
            </View>
          )}
          <Pressable style={styles.actionRow} onPress={() => setConfirmOpen(true)} disabled={deleting} testID="delete-data">
            <Feather name="trash-2" size={16} color={theme.color.error} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTxt, { color: theme.color.error }]}>{t('profile.delete')}</Text>
              <Text style={styles.actionHint}>{t('profile.delete.hint')}</Text>
            </View>
            {deleting ? (
              <ActivityIndicator color={theme.color.error} />
            ) : (
              <Feather name="chevron-right" size={16} color={theme.color.onSurfaceSecondary} />
            )}
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Feather name="trash-2" size={20} color={theme.color.error} />
            </View>
            <Text style={styles.confirmTitle}>{t('profile.delete')}</Text>
            <Text style={styles.confirmBody}>{t('profile.delete.body')}</Text>
            <Pressable
              style={styles.confirmDanger}
              onPress={() => { setConfirmOpen(false); void wipeAccount(); }}
              testID="delete-data-confirm"
            >
              <Text style={styles.confirmDangerTxt}>{t('profile.delete.confirm')}</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmOpen(false)} testID="delete-data-cancel">
              <Text style={styles.confirmCancel}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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

const styles = makeStyles(() => ({
  productsCard: {
    backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.color.border, padding: theme.spacing.lg, gap: theme.spacing.md,
  },
  productsSub: { ...theme.type.bodySm, color: theme.color.onSurfaceSecondary },
  productsInput: {
    minHeight: 96, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.color.borderGold,
    backgroundColor: theme.color.surface, padding: theme.spacing.md, textAlignVertical: 'top',
    ...theme.type.body, color: theme.color.onSurface,
  },
  productsRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  productsSave: {
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill,
    minHeight: 46, justifyContent: 'center', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: theme.spacing.xl,
  },
  productsSaveTxt: { ...theme.type.button, color: theme.color.onBrand },
  productsPrivate: { ...theme.type.micro, color: theme.color.onSurfaceSecondary, flex: 1 },
  productsErrTxt: { color: theme.color.error },
  // kept for accessibility/tests, visually replaced by BrandHeader
  hiddenTitle: { height: 0, opacity: 0, fontSize: 1, fontFamily: theme.font.sans },
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  title: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 32, marginTop: theme.spacing.lg, letterSpacing: -0.5 },
  code: { color: theme.color.onSurfaceSecondary, fontSize: 11, marginTop: 4, letterSpacing: 2, fontFamily: theme.font.mono },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.md, marginBottom: theme.spacing.xl },
  langChip: { paddingHorizontal: theme.spacing.lg, paddingVertical: 10, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.color.border, backgroundColor: theme.color.surfaceSecondary },
  langChipActive: { borderColor: theme.color.brand, backgroundColor: theme.color.brandTint },
  langTxt: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans },
  langTxtActive: { color: theme.color.brand, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.color.divider },
  rowLabel: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontFamily: theme.font.sans, letterSpacing: 0.3 },
  rowValue: { color: theme.color.onSurface, fontSize: 13, fontFamily: theme.font.sans, fontWeight: '500', textTransform: 'capitalize' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.color.divider },
  actionTxt: { flex: 1, color: theme.color.onSurface, fontSize: 14, fontFamily: theme.font.sans },
  actionHint: { ...theme.type.micro, color: theme.color.onSurfaceSecondary, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(5,5,5,0.85)', justifyContent: 'flex-end' },
  confirmCard: {
    backgroundColor: theme.color.surfaceSecondary, borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl, borderTopWidth: 1, borderColor: theme.color.border,
    padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl, alignItems: 'center', gap: theme.spacing.md,
  },
  confirmIcon: {
    width: 52, height: 52, borderRadius: 999, borderWidth: 1, borderColor: theme.color.error,
    backgroundColor: 'rgba(199,93,93,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  confirmTitle: { ...theme.type.h2, color: theme.color.onSurface, textAlign: 'center' },
  confirmBody: { ...theme.type.bodySm, color: theme.color.onSurfaceSecondary, textAlign: 'center' },
  confirmDanger: {
    alignSelf: 'stretch', alignItems: 'center', backgroundColor: theme.color.error,
    borderRadius: theme.radius.pill, paddingVertical: 15, marginTop: theme.spacing.xs,
  },
  confirmDangerTxt: { ...theme.type.button, color: theme.color.onSurface },
  confirmCancel: { ...theme.type.body, color: theme.color.onSurfaceSecondary, textDecorationLine: 'underline' },
  privacyBody: { backgroundColor: theme.color.surfaceSecondary, padding: theme.spacing.lg, borderRadius: theme.radius.md, marginVertical: theme.spacing.md, borderWidth: 1, borderColor: theme.color.borderGold },
  privacyTxt: { color: theme.color.onSurfaceTertiary, fontSize: 12, fontFamily: theme.font.sans, lineHeight: 20 },
}));
