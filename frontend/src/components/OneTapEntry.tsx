import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme, makeStyles } from '../theme';
import { BrandHeader } from '../ui';
import { api, setStoredUser } from '../api';
import { useT } from '../i18n';

/**
 * Landing of the one-tap links: `/magic?t=…` from an e-mail, `/invite?t=…`
 * for the brand's creators. The app opens already activated.
 */
export function OneTapEntry({ kind }: { kind: 'magic' | 'invite' }) {
  const router = useRouter();
  const { t } = useT();
  const params = useLocalSearchParams<{ t?: string }>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      const token = typeof params.t === 'string' ? params.t : '';
      if (!token) { setFailed(true); return; }
      try {
        const r = kind === 'magic' ? await api.activateMagic(token) : await api.activateInvite(token);
        await setStoredUser(r.user_id, r.activation_code);
        if (r.has_diagnosis) router.replace('/(tabs)/home');
        else if (r.has_intake) router.replace('/scan');
        else router.replace('/onboarding');
      } catch {
        setFailed(true);
      }
    })();
  }, [params.t, kind, router]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <BrandHeader title={failed ? t('magic.failedTitle') : t('magic.title')} />
        {failed ? (
          <View style={styles.center}>
            <Text style={styles.failTxt} testID="magic-failed">{t('magic.failed')}</Text>
            <Pressable style={styles.cta} onPress={() => router.replace('/activate')} testID="magic-retry">
              <Text style={styles.ctaTxt}>{t('magic.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color={theme.color.brand} />
            <Text style={styles.waitTxt} testID="magic-waiting">{t('magic.wait')}</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = makeStyles(() => ({
  root: { flex: 1, backgroundColor: theme.color.surface },
  safe: { flex: 1, paddingHorizontal: theme.spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg },
  waitTxt: { ...theme.type.body, color: theme.color.onSurfaceSecondary, textAlign: 'center' },
  failTxt: { ...theme.type.body, color: theme.color.onSurfaceTertiary, textAlign: 'center' },
  cta: {
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill,
    paddingVertical: 16, paddingHorizontal: theme.spacing.xxl, ...theme.shadow.cta,
  },
  ctaTxt: { ...theme.type.button, color: theme.color.onBrand },
}));
