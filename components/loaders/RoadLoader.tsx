/**
 * RoadLoader — Moving dashed road with progress fill and shimmer.
 * A road-themed progress bar without the car.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { TFX } from '@/constants/colors';
import type { LoaderProps } from './types';

const ROAD_WIDTHS = { small: 140, medium: 220, large: 280 };

export function RoadLoader({
  color = TFX.blue,
  size = 'medium',
  progress,
}: LoaderProps) {
  const roadWidth = ROAD_WIDTHS[size];
  const progressAnim = useRef(new Animated.Value(0)).current;
  const roadDashOffset = useRef(new Animated.Value(0)).current;
  const shimmerPos = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    // Road dashes scrolling
    const dashes = Animated.loop(
      Animated.timing(roadDashOffset, { toValue: 1, duration: 800, useNativeDriver: false }),
    );

    // Shimmer sweep
    const shimmer = Animated.loop(
      Animated.timing(shimmerPos, { toValue: 2, duration: 1500, useNativeDriver: false }),
    );

    // Auto-progress if no external progress prop
    let autoProgress: Animated.CompositeAnimation | undefined;
    if (progress === undefined) {
      autoProgress = Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, { toValue: 1, duration: 3500, useNativeDriver: false }),
          Animated.timing(progressAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
        ]),
      );
      autoProgress.start();
    }

    dashes.start();
    shimmer.start();

    return () => {
      dashes.stop();
      shimmer.stop();
      autoProgress?.stop();
    };
  }, [roadDashOffset, shimmerPos, progressAnim, progress]);

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
    <View style={[styles.roadContainer, { width: roadWidth }]}>
      <View style={styles.roadSurface}>
        <View style={styles.roadEdgeTop} />
        <View style={styles.roadEdgeBottom} />

        {/* Animated dashed center line */}
        <Animated.View
          style={[
            styles.roadDashTrack,
            {
              transform: [
                {
                  translateX: roadDashOffset.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -24],
                  }),
                },
              ],
            },
          ]}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={styles.roadDash} />
          ))}
        </Animated.View>

        {/* Progress fill */}
        <Animated.View
          style={[
            styles.roadFill,
            {
              backgroundColor: `${color}80`,
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
              styles.roadShimmer,
              {
                transform: [
                  {
                    translateX: shimmerPos.interpolate({
                      inputRange: [-1, 0, 1, 2],
                      outputRange: [-roadWidth, -roadWidth * 0.5, roadWidth * 0.5, roadWidth],
                    }),
                  },
                ],
              },
            ]}
          />
        </Animated.View>
      </View>

      {/* Distance markers */}
      <View style={styles.distanceMarkers}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.distanceMarker} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  roadContainer: {
    alignItems: 'center',
  },
  roadSurface: {
    width: '100%',
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
  },
  roadEdgeTop: {
    position: 'absolute',
    top: 2,
    left: 4,
    right: 4,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 1,
  },
  roadEdgeBottom: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    right: 4,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 1,
  },
  roadDashTrack: {
    position: 'absolute',
    flexDirection: 'row',
    top: 9.5,
    left: 0,
    right: -48,
    gap: 12,
  },
  roadDash: {
    width: 12,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 1,
  },
  roadFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 11,
    overflow: 'hidden',
  },
  roadShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 11,
  },
  distanceMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  distanceMarker: {
    width: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
  },
});
