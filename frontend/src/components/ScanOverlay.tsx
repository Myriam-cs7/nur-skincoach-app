import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { theme, makeStyles } from '../theme';

type Props = { height: number; label: string };

/** Clinical scan sweep displayed over the consultation photo while the AI analyses it. */
export default function ScanOverlay({ height, label }: Props) {
  const [y] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [y]);

  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [8, height - 16] });

  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap]} pointerEvents="none">
      <Animated.View style={[styles.line, { transform: [{ translateY }] }]} />
      <View style={styles.labelBox}>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = makeStyles(() => ({
  wrap: { backgroundColor: 'rgba(6,6,10,0.35)', borderRadius: theme.radius.md, overflow: 'hidden', justifyContent: 'flex-end' },
  line: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: theme.color.brandLight, shadowColor: theme.color.brand, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  labelBox: { backgroundColor: 'rgba(6,6,10,0.75)', paddingVertical: 6, paddingHorizontal: theme.spacing.md },
  label: { color: theme.color.brandLight, fontSize: 11, fontFamily: theme.font.sans, letterSpacing: 1.5, textAlign: 'center' },
}));
