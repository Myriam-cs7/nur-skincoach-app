import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { Wordmark, GoldDivider } from '../../src/ui';
import { api, getStoredUserId } from '../../src/api';
import { useT, getLang } from '../../src/i18n';

type Msg = { role: 'user' | 'assistant'; content: string; blocked?: boolean };

export default function Coach() {
  const { t } = useT();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = async (text: string) => {
    const m = text.trim();
    if (!m || busy) return;
    setInput('');
    const newMsgs: Msg[] = [...messages, { role: 'user', content: m }];
    setMessages(newMsgs);
    setBusy(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const uid = await getStoredUserId();
      if (!uid) throw new Error('no user');
      const r = await api.chat(uid, m, newMsgs.slice(-6), getLang());
      setMessages([...newMsgs, { role: 'assistant', content: r.reply, blocked: r.blocked }]);
    } catch {
      setMessages([...newMsgs, { role: 'assistant', content: t('coach.error') }]);
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const suggestions = [t('coach.suggest1'), t('coach.suggest2'), t('coach.suggest3'), t('coach.suggest4')];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Wordmark label={t('coach.kicker')} />
          <Text style={styles.title}>{t('coach.title')}</Text>
        </View>
        <GoldDivider marginV={theme.spacing.md} />

        <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.avatarCircle}>
                <Feather name="zap" size={24} color={theme.color.brand} />
              </View>
              <Text style={styles.intro}>{t('coach.intro')}</Text>
              <View style={styles.suggestList}>
                {suggestions.map((s, i) => (
                  <Pressable key={i} onPress={() => send(s)} style={styles.suggest} testID={`coach-suggest-${i}`}>
                    <Text style={styles.suggestTxt}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            messages.map((m, i) => (
              <View key={i} style={[styles.bubbleRow, m.role === 'user' ? styles.userRow : styles.assistantRow]}>
                <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                  <Text style={[styles.bubbleTxt, m.role === 'user' && { color: theme.color.onBrand }]}>{m.content}</Text>
                </View>
              </View>
            ))
          )}
          {busy ? (
            <View style={[styles.bubbleRow, styles.assistantRow]}>
              <View style={[styles.bubble, styles.assistantBubble]}>
                <ActivityIndicator color={theme.color.brand} size="small" />
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('coach.placeholder')}
            placeholderTextColor={theme.color.onSurfaceSecondary}
            style={styles.input}
            multiline
            maxLength={500}
            onSubmitEditing={() => send(input)}
            blurOnSubmit
            testID="coach-input"
          />
          <Pressable onPress={() => send(input)} disabled={!input.trim() || busy} style={[styles.sendBtn, (!input.trim() || busy) && { opacity: 0.4 }]} testID="coach-send">
            <Feather name="arrow-up" size={18} color={theme.color.onBrand} />
          </Pressable>
        </View>
        <Text style={styles.foot}>{t('coach.disclaimer')}</Text>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  header: { alignItems: 'center', paddingTop: theme.spacing.sm, paddingHorizontal: theme.spacing.xl },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 28, marginTop: theme.spacing.sm, letterSpacing: -0.3 },
  messages: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg, paddingTop: theme.spacing.xl },
  avatarCircle: { width: 70, height: 70, borderRadius: 999, backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.brand, alignItems: 'center', justifyContent: 'center', shadowColor: theme.color.brand, shadowOpacity: 0.5, shadowRadius: 28, shadowOffset: { width: 0, height: 0 } },
  intro: { color: theme.color.onSurfaceTertiary, fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: theme.spacing.md },
  suggestList: { gap: theme.spacing.sm, width: '100%' },
  suggest: { backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderGold, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.lg, paddingVertical: 14, ...theme.shadow.soft },
  suggestTxt: { color: theme.color.onSurfaceTertiary, fontSize: 13 },
  bubbleRow: { flexDirection: 'row' },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: 12 },
  userBubble: { backgroundColor: theme.color.brand, borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderGold, borderBottomLeftRadius: 4, ...theme.shadow.soft },
  bubbleTxt: { color: theme.color.onSurfaceTertiary, fontSize: 14, lineHeight: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.sm, backgroundColor: theme.color.surface, borderTopWidth: 1, borderTopColor: theme.color.divider },
  input: { flex: 1, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderGold, borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: 12, color: theme.color.onSurface, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 999, backgroundColor: theme.color.brand, alignItems: 'center', justifyContent: 'center', ...theme.shadow.cta },
  foot: { color: theme.color.onSurfaceSecondary, fontSize: 10, textAlign: 'center', opacity: 0.6, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm, lineHeight: 14 },
});
