import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { theme } from '../../src/theme';
import { GoldDivider, BrandHeader } from '../../src/ui';
import { api, getStoredUserId } from '../../src/api';
import { useT, getLang } from '../../src/i18n';
import CoachAvatar, { type CoachState } from '../../src/components/CoachAvatar';
import TypingDots from '../../src/components/TypingDots';
import ScanOverlay from '../../src/components/ScanOverlay';
import PhotoConsentSheet from '../../src/components/PhotoConsentSheet';
import { playUiSound, speak, stopSpeaking, stopUiSound, transcribeRecording } from '../../src/voice';

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  photoUri?: string;
  blocked?: boolean;
  analyzing?: boolean;
};

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const PORTRAIT = require('../../assets/images/nur-coach-portrait.png');
const PHOTO_H = 220;
const SILENCE_MS = 1800;
const MAX_REC_MS = 60000;

export default function Coach() {
  const { t } = useT();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [turn, setTurnState] = useState<CoachState>('idle');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [askPhoto, setAskPhoto] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [micSheet, setMicSheet] = useState<'hidden' | 'ask' | 'blocked'>('hidden');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const scrollRef = useRef<ScrollView>(null);

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recState = useAudioRecorderState(recorder, 100);

  const turnRef = useRef<CoachState>('idle');
  const setTurn = (s: CoachState) => {
    turnRef.current = s;
    setTurnState(s);
  };
  const messagesRef = useRef<Msg[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const preparingRef = useRef(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const samplesRef = useRef<number[]>([]);
  const floorRef = useRef<number | null>(null);
  const silenceSinceRef = useRef<number | null>(null);
  const sttTurnRef = useRef(0);

  const scrollSoon = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);

  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(null), 4000);
    return () => clearTimeout(id);
  }, [hint]);

  // Pre-warm the audio session (never request the mic on mount)
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  }, []);

  // ---------- conversation ----------
  const sendMessage = async (text: string, photo?: { b64: string; uri: string }) => {
    const body = text.trim();
    if ((!body && !photo) || turnRef.current === 'thinking') return;

    stopSpeaking();
    setSpeakingId(null);
    const userMsg: Msg = { id: uid(), role: 'user', content: body, photoUri: photo?.uri, analyzing: !!photo };
    setMessages([...messagesRef.current, userMsg]);
    setInput('');
    setAskPhoto(false);
    setTurn('thinking');
    playUiSound('send');
    if (photo) playUiSound('analysis', { volume: 0.3, loop: true });
    scrollSoon();

    try {
      const userId = await getStoredUserId();
      if (!userId) throw new Error('no_user');
      const r = await api.chat(userId, body || t('coach.photo.msg'), getLang(), photo?.b64);
      setMessages((prev) => [
        ...prev.map((m) => (m.id === userMsg.id ? { ...m, analyzing: false } : m)),
        { id: uid(), role: 'assistant', content: r.reply, blocked: r.blocked },
      ]);
      setAskPhoto(!!r.ask_photo);
      playUiSound('receive');
    } catch (e) {
      console.warn('[coach] chat failed', e);
      setMessages((prev) => [
        ...prev.map((m) => (m.id === userMsg.id ? { ...m, analyzing: false } : m)),
        { id: uid(), role: 'assistant', content: t('coach.error') },
      ]);
    } finally {
      if (photo) stopUiSound('analysis');
      setTurn('idle');
      scrollSoon();
    }
  };

  // ---------- text to speech ----------
  const onSpeak = async (m: Msg) => {
    if (speakingId === m.id) {
      stopSpeaking();
      setSpeakingId(null);
      setTurn('idle');
      return;
    }
    setSpeakingId(m.id);
    setTurn('speaking');
    try {
      await speak(m.content, getLang());
    } catch (e) {
      console.warn('[coach] tts failed', e);
      setHint(t('coach.voiceError'));
    } finally {
      setSpeakingId((prev) => (prev === m.id ? null : prev));
      setTurn(turnRef.current === 'speaking' ? 'idle' : turnRef.current);
    }
  };

  // ---------- voice input ----------
  const armRecorder = async () => {
    stopSpeaking();
    setSpeakingId(null);
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
    recorder.record();
    startedAtRef.current = Date.now();
    samplesRef.current = [];
    floorRef.current = null;
    silenceSinceRef.current = null;
    setTurn('listening');
    watchdogRef.current = setTimeout(() => void stopListening(), MAX_REC_MS);
  };

  const startListening = async () => {
    if (preparingRef.current || turnRef.current !== 'idle') return;
    if (Platform.OS === 'web') {
      setHint(t('coach.micError'));
      return;
    }
    preparingRef.current = true;
    try {
      const current = await getRecordingPermissionsAsync();
      if (!current.granted) {
        setMicSheet(current.canAskAgain ? 'ask' : 'blocked');
        return;
      }
      await armRecorder();
    } catch (e) {
      console.warn('[coach] record failed', e);
      setHint(t('coach.micError'));
      setTurn('idle');
    } finally {
      preparingRef.current = false;
    }
  };

  const grantMicAndRecord = async () => {
    try {
      const res = await requestRecordingPermissionsAsync();
      if (!res.granted) {
        setMicSheet(res.canAskAgain ? 'hidden' : 'blocked');
        return;
      }
      setMicSheet('hidden');
      await armRecorder();
    } catch (e) {
      console.warn('[coach] mic permission failed', e);
      setMicSheet('hidden');
      setHint(t('coach.micError'));
    }
  };

  const stopListening = async () => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    if (turnRef.current !== 'listening') return;
    setTurn('transcribing');
    const myTurn = ++sttTurnRef.current;
    try {
      await recorder.stop();
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      const uri = recorder.uri;
      if (!uri) {
        setTurn('idle');
        setHint(t('coach.micEmpty'));
        return;
      }
      const text = await transcribeRecording(uri, getLang());
      if (myTurn !== sttTurnRef.current) return;
      if (!text) {
        setTurn('idle');
        setHint(t('coach.micEmpty'));
        return;
      }
      setTurn('idle');
      await sendMessage(text);
    } catch (e) {
      console.warn('[coach] transcription failed', e);
      setTurn('idle');
      setHint(t('coach.micError'));
    }
  };

  // Auto-stop on silence, calibrated on the ambient noise floor
  useEffect(() => {
    if (turn !== 'listening') return;
    const m = recState.metering;
    if (typeof m !== 'number') return;
    const elapsed = Date.now() - startedAtRef.current;
    if (elapsed < 400) return;
    if (elapsed < 900) {
      samplesRef.current.push(m);
      return;
    }
    if (floorRef.current === null) {
      const s = samplesRef.current;
      floorRef.current = s.length ? s.reduce((a, b) => a + b, 0) / s.length : -45;
    }
    if (m > floorRef.current + 12) {
      silenceSinceRef.current = null;
      return;
    }
    if (silenceSinceRef.current === null) {
      silenceSinceRef.current = Date.now();
      return;
    }
    if (Date.now() - silenceSinceRef.current > SILENCE_MS && elapsed > 2500) {
      void stopListening();
    }
  }, [recState.metering, turn]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- cleanup ----------
  useFocusEffect(
    useCallback(
      () => () => {
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        stopSpeaking();
        stopUiSound('analysis');
        try {
          if (recorder.isRecording) recorder.stop().catch(() => {});
        } catch {
          // recorder already released by useAudioRecorder
        }
      },
      [recorder]
    )
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      stopSpeaking();
      setSpeakingId(null);
      return false;
    });
    return () => sub.remove();
  }, []);

  // ---------- photo ----------
  const openCamera = async () => {
    if (Platform.OS === 'web') {
      setHint(t('coach.photo.perm.sub'));
      return;
    }
    if (!photoConsent) {
      setConsentOpen(true);
      return;
    }
    setCameraOpen(true);
  };

  const onCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: true });
      const out = await ImageManipulator.manipulateAsync(
        pic.uri,
        [{ resize: { width: 768 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      setCameraOpen(false);
      await sendMessage(t('coach.photo.msg'), { b64: out.base64!, uri: out.uri });
    } catch (e) {
      console.warn('[coach] capture failed', e);
      setHint(t('coach.error'));
    } finally {
      setCapturing(false);
    }
  };

  const statusLabel =
    turn === 'listening'
      ? t('coach.listening')
      : turn === 'transcribing'
      ? t('coach.transcribing')
      : turn === 'thinking'
      ? t('coach.thinking')
      : turn === 'speaking'
      ? t('coach.speaking')
      : null;

  const suggestions = [t('coach.suggest1'), t('coach.suggest2'), t('coach.suggest3'), t('coach.suggest4')];
  const busy = turn === 'thinking' || turn === 'transcribing';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      style={styles.root}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <BrandHeader
            title={t('coach.title')}
            right={messages.length > 0 || turn !== 'idle' ? <CoachAvatar state={turn} size={32} /> : undefined}
          />
          <Text style={styles.status} testID="coach-status" numberOfLines={1}>
            {statusLabel || t('coach.kicker')}
          </Text>
        </View>
        <GoldDivider marginV={theme.spacing.md} />

        <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.portraitCard}>
                <Image source={PORTRAIT} style={styles.portrait} resizeMode="cover" />
                <View style={styles.portraitCaption}>
                  <Text style={styles.portraitName}>Nūr Skincoach</Text>
                  <Text style={styles.portraitRole}>{t('coach.kicker')}</Text>
                </View>
              </View>
              <Text style={styles.intro}>{t('coach.intro')}</Text>
              <Pressable style={styles.startBtn} onPress={() => sendMessage(t('coach.startMsg'))} testID="coach-start">
                <Feather name="mic" size={15} color={theme.color.onBrand} />
                <Text style={styles.startTxt}>{t('coach.start')}</Text>
              </Pressable>
              <View style={styles.suggestList}>
                {suggestions.map((s, i) => (
                  <Pressable key={i} onPress={() => sendMessage(s)} style={styles.suggest} testID={`coach-suggest-${i}`}>
                    <Text style={styles.suggestTxt}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            messages.map((m) => (
              <View key={m.id} style={[styles.bubbleRow, m.role === 'user' ? styles.userRow : styles.assistantRow]}>
                <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                  {m.photoUri ? (
                    <View style={styles.photoWrap}>
                      <Image source={{ uri: m.photoUri }} style={styles.photo} resizeMode="cover" />
                      {m.analyzing ? <ScanOverlay height={PHOTO_H} label={t('coach.photo.analyzing')} /> : null}
                    </View>
                  ) : null}
                  {m.content ? (
                    <Text style={[styles.bubbleTxt, m.role === 'user' && { color: theme.color.onBrand }]}>{m.content}</Text>
                  ) : null}
                  {m.role === 'assistant' ? (
                    <Pressable
                      onPress={() => onSpeak(m)}
                      style={styles.speakBtn}
                      hitSlop={10}
                      testID={`coach-speak-${m.id}`}
                    >
                      <Feather
                        name={speakingId === m.id ? 'square' : 'volume-2'}
                        size={13}
                        color={theme.color.brand}
                      />
                      <Text style={styles.speakTxt}>{t('coach.listen')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          )}

          {busy ? (
            <View style={[styles.bubbleRow, styles.assistantRow]}>
              <View style={[styles.bubble, styles.assistantBubble]}>
                <TypingDots />
              </View>
            </View>
          ) : null}

          {askPhoto ? (
            <View style={styles.photoCard} testID="coach-photo-card">
              <View style={styles.photoCardHead}>
                <Feather name="camera" size={14} color={theme.color.brand} />
                <Text style={styles.photoCardTitle}>{t('coach.photo.title')}</Text>
              </View>
              <Text style={styles.photoCardTip}>{t('coach.photo.tip')}</Text>
              <Pressable style={styles.photoCta} onPress={openCamera} testID="coach-open-camera">
                <Text style={styles.photoCtaTxt}>{t('coach.photo.ask')}</Text>
              </Pressable>
              <Pressable onPress={() => sendMessage(t('coach.photo.declined'))} testID="coach-photo-later">
                <Text style={styles.photoLater}>{t('coach.photo.later')}</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        {hint ? (
          <Text style={styles.hint} testID="coach-hint">
            {hint}
          </Text>
        ) : null}

        <View style={styles.inputBar}>
          <Pressable
            onPress={turn === 'listening' ? stopListening : startListening}
            disabled={busy}
            style={[styles.micBtn, turn === 'listening' && styles.micBtnActive, busy && { opacity: 0.4 }]}
            testID="coach-mic"
          >
            <Feather
              name={turn === 'listening' ? 'square' : 'mic'}
              size={18}
              color={turn === 'listening' ? theme.color.onBrand : theme.color.brand}
            />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('coach.placeholder')}
            placeholderTextColor={theme.color.onSurfaceSecondary}
            style={styles.input}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage(input)}
            blurOnSubmit
            testID="coach-input"
          />
          <Pressable
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || busy}
            style={[styles.sendBtn, (!input.trim() || busy) && { opacity: 0.4 }]}
            testID="coach-send"
          >
            <Feather name="arrow-up" size={18} color={theme.color.onBrand} />
          </Pressable>
        </View>
        <Text style={styles.foot}>{t('coach.disclaimer')}</Text>
      </SafeAreaView>

      {/* Face-photo consent — explicit, before the camera opens */}
      <PhotoConsentSheet
        visible={consentOpen}
        onAccept={() => {
          setPhotoConsent(true);
          setConsentOpen(false);
          setCameraOpen(true);
        }}
        onDecline={() => {
          setConsentOpen(false);
          void sendMessage(t('coach.photo.declined'));
        }}
      />

      {/* Microphone permission — contextual, after a deliberate tap */}
      <Modal visible={micSheet !== 'hidden'} transparent animationType="fade" onRequestClose={() => setMicSheet('hidden')}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetIcon}>
              <Feather name="mic" size={22} color={theme.color.brand} />
            </View>
            <Text style={styles.sheetTitle}>{t('coach.mic.title')}</Text>
            <Text style={styles.sheetSub}>{micSheet === 'blocked' ? t('coach.mic.blocked') : t('coach.mic.sub')}</Text>
            {micSheet === 'blocked' ? (
              <Pressable style={styles.sheetCta} onPress={() => Linking.openSettings()} testID="coach-mic-settings">
                <Text style={styles.sheetCtaTxt}>{t('coach.mic.settings')}</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.sheetCta} onPress={grantMicAndRecord} testID="coach-mic-allow">
                <Text style={styles.sheetCtaTxt}>{t('coach.mic.allow')}</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setMicSheet('hidden')} testID="coach-mic-cancel">
              <Text style={styles.sheetCancel}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Camera — consultation photo (front camera only) */}
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.camRoot}>
          {camPerm?.granted ? (
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
          ) : null}
          <SafeAreaView style={styles.camSafe} edges={['top', 'bottom']}>
            <View style={styles.camHeader}>
              <Pressable onPress={() => setCameraOpen(false)} hitSlop={12} testID="coach-cam-close">
                <Feather name="x" size={22} color={theme.color.onCamera} />
              </Pressable>
              <Text style={styles.camKicker}>{t('coach.photo.title')}</Text>
              <View style={{ width: 22 }} />
            </View>

            {camPerm?.granted ? (
              <>
                <View style={styles.guideWrap} pointerEvents="none">
                  <View style={styles.guide}>
                    <View style={[styles.corner, styles.tl]} />
                    <View style={[styles.corner, styles.tr]} />
                    <View style={[styles.corner, styles.bl]} />
                    <View style={[styles.corner, styles.br]} />
                  </View>
                </View>
                <View style={styles.camBottom}>
                  <Text style={styles.camTip}>{t('coach.photo.tip')}</Text>
                  <Pressable onPress={onCapture} disabled={capturing} style={capturing && { opacity: 0.5 }} testID="coach-capture">
                    <View style={styles.shutterRing}>
                      <View style={styles.shutterCore}>
                        {capturing ? (
                          <ActivityIndicator color={theme.color.onBrand} />
                        ) : (
                          <Feather name="camera" size={22} color={theme.color.onBrand} />
                        )}
                      </View>
                    </View>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.camPerm}>
                <View style={styles.sheetIcon}>
                  <Feather name="camera" size={22} color={theme.color.brand} />
                </View>
                <Text style={styles.sheetTitle}>{t('coach.photo.perm.title')}</Text>
                <Text style={styles.sheetSub}>
                  {camPerm && !camPerm.canAskAgain ? t('coach.photo.perm.blocked') : t('coach.photo.perm.sub')}
                </Text>
                {camPerm && !camPerm.canAskAgain ? (
                  <Pressable style={styles.sheetCta} onPress={() => Linking.openSettings()} testID="coach-cam-settings">
                    <Text style={styles.sheetCtaTxt}>{t('coach.mic.settings')}</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.sheetCta} onPress={() => requestCamPerm()} testID="coach-cam-allow">
                    <Text style={styles.sheetCtaTxt}>{t('coach.photo.perm.allow')}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  header: { alignItems: 'center', paddingTop: theme.spacing.sm, paddingHorizontal: theme.spacing.xl },
  avatarRow: { marginTop: theme.spacing.sm },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 24, marginTop: theme.spacing.xs, letterSpacing: -0.3 },
  status: { color: theme.color.brand, fontSize: 12, fontFamily: theme.font.sans, letterSpacing: 1.6, marginTop: theme.spacing.sm, textTransform: 'uppercase' },
  messages: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg, paddingTop: theme.spacing.md },
  portraitCard: {
    width: 220, borderRadius: theme.radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.color.borderGold, backgroundColor: theme.color.surfaceElevated,
    ...theme.shadow.card,
  },
  portrait: { width: '100%', height: 260 },
  portraitCaption: { paddingVertical: theme.spacing.md, alignItems: 'center', gap: 2, backgroundColor: theme.color.surfaceElevated },
  portraitName: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 19 },
  portraitRole: { color: theme.color.brand, fontSize: 9, fontFamily: theme.font.sans, letterSpacing: 2 },
  intro: { color: theme.color.onSurfaceTertiary, fontSize: 14, fontFamily: theme.font.sans, textAlign: 'center', lineHeight: 22, paddingHorizontal: theme.spacing.md },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xl, paddingVertical: 14, ...theme.shadow.cta,
  },
  startTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 13, fontFamily: theme.font.sansMedium, letterSpacing: 1 },
  suggestList: { gap: theme.spacing.sm, width: '100%' },
  suggest: {
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderGold,
    borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.lg, paddingVertical: 14, ...theme.shadow.soft,
  },
  suggestTxt: { color: theme.color.onSurfaceTertiary, fontSize: 13, fontFamily: theme.font.sans },
  bubbleRow: { flexDirection: 'row' },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '86%', borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: 12, gap: theme.spacing.sm },
  userBubble: { backgroundColor: theme.color.brand, borderBottomRightRadius: 4 },
  assistantBubble: {
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderGold,
    borderBottomLeftRadius: 4, ...theme.shadow.soft,
  },
  bubbleTxt: { color: theme.color.onSurfaceTertiary, fontSize: 14, fontFamily: theme.font.sans, lineHeight: 21 },
  photoWrap: { width: 200, height: PHOTO_H, borderRadius: theme.radius.md, overflow: 'hidden', backgroundColor: theme.color.surfaceTertiary },
  photo: { width: '100%', height: '100%' },
  speakBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  speakTxt: { color: theme.color.brand, fontSize: 11, fontFamily: theme.font.sans, letterSpacing: 0.8 },
  photoCard: {
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.brand,
    borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.sm, alignItems: 'center', ...theme.shadow.soft,
  },
  photoCardHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  photoCardTitle: { color: theme.color.onSurface, fontSize: 13, fontFamily: theme.font.sans, letterSpacing: 1, textTransform: 'uppercase' },
  photoCardTip: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontFamily: theme.font.sans, textAlign: 'center', lineHeight: 18 },
  photoCta: {
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xl, paddingVertical: 13, marginTop: theme.spacing.xs, ...theme.shadow.cta,
  },
  photoCtaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 13, fontFamily: theme.font.sansMedium, letterSpacing: 1 },
  photoLater: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontFamily: theme.font.sans, textDecorationLine: 'underline', paddingTop: theme.spacing.xs },
  hint: { color: theme.color.brand, fontSize: 12, fontFamily: theme.font.sans, textAlign: 'center', paddingBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.sm,
    backgroundColor: theme.color.surface, borderTopWidth: 1, borderTopColor: theme.color.divider,
  },
  micBtn: {
    width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.brand,
  },
  micBtnActive: { backgroundColor: theme.color.brand },
  input: {
    flex: 1, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderGold,
    borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: 12,
    color: theme.color.onSurface, fontSize: 14, fontFamily: theme.font.sans, maxHeight: 100,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 999, backgroundColor: theme.color.brand, alignItems: 'center', justifyContent: 'center', ...theme.shadow.cta },
  foot: { color: theme.color.onSurfaceSecondary, fontSize: 10, fontFamily: theme.font.sans, textAlign: 'center', opacity: 0.6, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm, lineHeight: 14 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(6,6,10,0.8)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.color.surfaceSecondary, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl,
    borderTopWidth: 1, borderColor: theme.color.borderGold, padding: theme.spacing.xl,
    alignItems: 'center', gap: theme.spacing.md, paddingBottom: theme.spacing.xxl,
  },
  sheetIcon: {
    width: 56, height: 56, borderRadius: 999, backgroundColor: theme.color.brandTint,
    borderWidth: 1, borderColor: theme.color.brand, alignItems: 'center', justifyContent: 'center',
  },
  sheetTitle: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 22, textAlign: 'center' },
  sheetSub: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, textAlign: 'center', lineHeight: 20 },
  sheetCta: {
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.xl,
    paddingVertical: 15, minWidth: 220, alignItems: 'center', ...theme.shadow.cta,
  },
  sheetCtaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 13, fontFamily: theme.font.sansMedium, letterSpacing: 1 },
  sheetCancel: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, paddingTop: theme.spacing.xs },
  camRoot: { flex: 1, backgroundColor: theme.color.surface },
  camSafe: { flex: 1, justifyContent: 'space-between' },
  camHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  camKicker: { color: theme.color.brand, fontSize: 10, fontFamily: theme.font.sansMedium, letterSpacing: 3, fontWeight: '600', textTransform: 'uppercase' },
  guideWrap: { alignItems: 'center', justifyContent: 'center' },
  guide: { width: 240, height: 310, borderRadius: 240 },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: theme.color.brand },
  tl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 8 },
  camBottom: { alignItems: 'center', gap: theme.spacing.lg, paddingBottom: theme.spacing.xl, paddingHorizontal: theme.spacing.xl },
  camTip: { color: theme.color.onCamera, fontSize: 12, fontFamily: theme.font.sans, textAlign: 'center' },
  camPerm: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.xl },
  shutterRing: { width: 76, height: 76, borderRadius: 999, borderWidth: 2, borderColor: theme.color.brand, alignItems: 'center', justifyContent: 'center' },
  shutterCore: { width: 60, height: 60, borderRadius: 999, backgroundColor: theme.color.brand, alignItems: 'center', justifyContent: 'center' },
});
