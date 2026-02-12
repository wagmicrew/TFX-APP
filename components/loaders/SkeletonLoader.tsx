/**
 * SkeletonLoader — Shimmer placeholder blocks.
 * Shows pulsing gradient shimmer blocks that mimic content loading.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { LoaderProps } from './types';

const BLOCK_CONFIGS = {
  small: { rows: 2, widths: [80, 60], height: 8, gap: 6 },
  medium: { rows: 3, widths: [160, 120, 140], height: 12, gap: 10 },
  large: { rows: 4, widths: [220, 180, 200, 160], height: 14, gap: 12 },
};

export function SkeletonLoader({ size = 'medium' }: LoaderProps) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const config = BLOCK_CONFIGS[size];

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  return (
    <View style={[styles.container, { gap: config.gap }]}>
      {config.widths.map((width, i) => (
        <Animated.View
          key={i}
          style={[
            styles.block,
            {
              width,
              height: config.height,
              borderRadius: config.height / 2,
              opacity: pulseAnim,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  block: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
