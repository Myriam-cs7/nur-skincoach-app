import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Dimensions, Image as RNImage } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../src/theme';

const { width } = Dimensions.get('window');

export default function Scan() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission]);

  const onCapture = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.7, skipProcessing: true });
      const manipulated = await ImageManipulator.manipulateAsync(
        pic.uri,
        [{ resize: { width: 768 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const b64 = manipulated.base64!;
      router.replace({ pathname: '/analyzing', params: { b64 } });
    } catch (e) {
      console.warn(e);
      setBusy(false);
    }
  };

  const onPickGallery = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setBusy(false); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (result.canceled) { setBusy(false); return; }
      const asset = result.assets[0];
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 768 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      router.replace({ pathname: '/analyzing', params: { b64: manipulated.base64! } });
    } catch (e) {
      console.warn(e);
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.color.brand} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={['top', 'bottom']}>
        <Feather name="camera-off" size={48} color={theme.color.brand} />
        <Text style={styles.title}>Caméra requise</Text>
        <Text style={styles.subtle}>Nous avons besoin de votre caméra pour votre bilan beauté.</Text>
        <Pressable style={styles.cta} onPress={requestPermission} testID="grant-camera">
          <Text style={styles.ctaText}>Autoriser la caméra</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
      <LinearGradient
        colors={['rgba(9,9,12,0.9)', 'transparent', 'transparent', 'rgba(9,9,12,0.95)']}
        locations={[0, 0.2, 0.65, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} testID="scan-back">
            <Feather name="x" size={24} color={theme.color.onSurface} />
          </Pressable>
          <Text style={styles.kicker}>BILAN BEAUTÉ</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.guideContainer} pointerEvents="none">
          <View style={styles.faceGuide}>
            {/* Corner ticks */}
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
        </View>

        <View style={styles.bottomPanel}>
          <View style={styles.tipRow}>
            <Feather name="sun" size={14} color={theme.color.brand} />
            <Text style={styles.tip}>Lumière naturelle de face</Text>
          </View>
          <View style={styles.tipRow}>
            <Feather name="smile" size={14} color={theme.color.brand} />
            <Text style={styles.tip}>Sans maquillage, visage propre</Text>
          </View>

          <Pressable onPress={onCapture} disabled={busy} style={[styles.shutter, busy && { opacity: 0.5 }]} testID="capture-button">
            <View style={styles.shutterRing}>
              <View style={styles.shutterCore}>
                {busy ? <ActivityIndicator color={theme.color.onBrand} /> : <Feather name="camera" size={22} color={theme.color.onBrand} />}
              </View>
            </View>
          </Pressable>
          <Pressable onPress={onPickGallery} disabled={busy} testID="gallery-button">
            <Text style={styles.galleryLink}>Choisir depuis la galerie</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const GUIDE = width * 0.7;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  safe: { flex: 1, justifyContent: 'space-between' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  kicker: { color: theme.color.brand, fontSize: 11, letterSpacing: 3, fontWeight: '600' },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 26, marginTop: theme.spacing.lg },
  subtle: { color: theme.color.onSurfaceSecondary, fontSize: 14, textAlign: 'center', marginTop: theme.spacing.sm },
  cta: { backgroundColor: theme.color.brand, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.xl, paddingVertical: 14, marginTop: theme.spacing.xl },
  ctaText: { color: theme.color.onBrand, fontWeight: '700' },
  guideContainer: { alignItems: 'center', justifyContent: 'center' },
  faceGuide: { width: GUIDE, height: GUIDE * 1.3, borderRadius: GUIDE },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: theme.color.brand },
  tl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 8 },
  bottomPanel: { paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.lg, gap: theme.spacing.sm, alignItems: 'center' },
  tipRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' },
  tip: { color: theme.color.onSurfaceTertiary, fontSize: 13 },
  shutter: { marginTop: theme.spacing.lg },
  shutterRing: { width: 78, height: 78, borderRadius: 999, borderWidth: 2, borderColor: theme.color.brand, alignItems: 'center', justifyContent: 'center' },
  shutterCore: { width: 62, height: 62, borderRadius: 999, backgroundColor: theme.color.brand, alignItems: 'center', justifyContent: 'center' },
  galleryLink: { color: theme.color.onSurfaceSecondary, fontSize: 13, textDecorationLine: 'underline', marginTop: theme.spacing.md },
});
