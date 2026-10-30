import React, { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { theme, makeStyles } from '../theme';

export default function TypingDots() {
  const [dots] = useState(() => [new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]);

  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 340, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 340, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(320 - i * 160),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [dots]);

  return (
    <View style={styles.row}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: d, transform: [{ scale: d }] }]} />
      ))}
    </View>
  );
}

const styles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: theme.color.brand },
}));
