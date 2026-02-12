/**
 * ProgressBarLoader — Simple horizontal fill bar with shimmer effect.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { TFX } from '@/constants/colors';
import type { LoaderProps } from './types';

const BAR_WIDTHS = { small: 140, medium: 220, large: 280 };
const BAR_HEIGHTS = { small: 4, medium: 6, large: 8 };

export function ProgressBarLoader({
  color = TFX.blue,
  size = 'medium',
  progress,
}: LoaderProps) {
  const barWidth = BAR_WIDTHS[size];
  const barHeight = BAR_HEIGHTS[size];
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerPos = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    // Shimmer sweep
    const shimmer = Animated.loop(
      Animated.timing(shimmerPos, { toValue: 2, duration: 1500, useNativeDriver: false }),
    );

    // Auto-progress if no external progress prop
    let autoProgress: Animated.CompositeAnimation | undefined;
    if (progress === undefined) {
      autoProgress = Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, { toValue: 1, duration: 2500, useNativeDriver: false }),
          Animated.timing(progressAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
        ]),
      );
      autoProgress.start();
    }

    shimmer.start();

    return () => {
      shimmer.stop();
      autoProgress?.stop();
    };
  }, [shimmerPos, progressAnim, progress]);

  // Sync external progress
  useEffect(() => {
    if (progress !== undefined) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [progress, progressAnim]);

  return (
    <View style={[styles.track, { width: barWidth, height: barHeight, borderRadius: barHeight / 2 }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            borderRadius: barHeight / 2,
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      >
        {/* Shimmer overlay */}
        <Animated.View
          style={[
            styles.shimmer,
            {
              borderRadius: barHeight / 2,
              transform: [
                {
                  translateX: shimmerPos.interpolate({
                    inputRange: [-1, 0, 1, 2],
                    outputRange: [-barWidth, -barWidth * 0.5, barWidth * 0.5, barWidth],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
