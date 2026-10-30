import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { theme, makeStyles } from '../theme';

export type CoachState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

type Props = { state: CoachState; size?: number };

const AVATAR = require('../../assets/images/nur-avatar.png');

export default function CoachAvatar({ state, size = 96 }: Props) {
  const halo = useRef(new Animated.Value(0)).current;
  const active = state !== 'idle';

  useEffect(() => {
    halo.stopAnimation();
    if (!active) {
      Animated.timing(halo, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      return;
    }
    const duration = state === 'speaking' ? 700 : state === 'listening' ? 1000 : 1400;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0, duration, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state, active, halo]);

  const ringScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.26] });
  const ringOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });
  const coreScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, state === 'speaking' ? 1.05 : 1.02] });

  const ring = size * 1.1;

  return (
    <View style={[styles.wrap, { width: ring + 24, height: ring + 24 }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.ring,
          { width: ring, height: ring, borderRadius: ring, transform: [{ scale: ringScale }], opacity: ringOpacity },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: coreScale }] }}>
        <View style={[styles.frame, { width: size, height: size, borderRadius: size }]}>
          <Image source={AVATAR} style={{ width: size, height: size, borderRadius: size }} resizeMode="cover" />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = makeStyles(() => ({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1, borderColor: theme.color.brand, backgroundColor: theme.color.brandTint },
  frame: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.brand,
    backgroundColor: theme.color.surfaceSecondary,
    shadowColor: theme.color.brand,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
}));
