/**
 * DotsLoader — Three pulsing dots that animate in sequence.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { TFX } from '@/constants/colors';
import type { LoaderProps } from './types';

const DOT_SIZES = { small: 6, medium: 10, large: 14 };
const GAP = { small: 6, medium: 10, large: 14 };

export function DotsLoader({ color = TFX.blue, size = 'medium' }: LoaderProps) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;
  const scale1 = useRef(new Animated.Value(0.8)).current;
  const scale2 = useRef(new Animated.Value(0.8)).current;
  const scale3 = useRef(new Animated.Value(0.8)).current;

  const dotSize = DOT_SIZES[size];
  const gap = GAP[size];

  useEffect(() => {
    const createPulse = (opacity: Animated.Value, scale: Animated.Value) =>
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.2, duration: 350, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.8, duration: 350, useNativeDriver: true }),
        ]),
      ]);

    const anim = Animated.loop(
      Animated.stagger(200, [
        createPulse(dot1, scale1),
        createPulse(dot2, scale2),
        createPulse(dot3, scale3),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [dot1, dot2, dot3, scale1, scale2, scale3]);

  const dotStyle = (opacity: Animated.Value, scale: Animated.Value) => [
    styles.dot,
    {
      width: dotSize,
      height: dotSize,
      borderRadius: dotSize / 2,
      backgroundColor: color,
      opacity,
      transform: [{ scale }],
    },
  ];

  return (
    <View style={[styles.container, { gap }]}>
      <Animated.View style={dotStyle(dot1, scale1)} />
      <Animated.View style={dotStyle(dot2, scale2)} />
      <Animated.View style={dotStyle(dot3, scale3)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    // Dynamic styles applied inline
  },
});
