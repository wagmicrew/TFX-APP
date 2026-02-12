/**
 * CarLoader — Animated car driving right with bounce and headlight glow.
 *
 * The 🚗 emoji faces left on most platforms, so we apply scaleX: -1
 * to flip it so it visually drives in the correct direction (left → right).
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { TFX } from '@/constants/colors';
import type { LoaderProps } from './types';

const ROAD_WIDTHS = { small: 140, medium: 220, large: 280 };

export function CarLoader({
  color = TFX.blue,
  size = 'medium',
  progress,
}: LoaderProps) {
  const roadWidth = ROAD_WIDTHS[size];
  const carBounce = useRef(new Animated.Value(0)).current;
  const headlightPulse = useRef(new Animated.Value(0.4)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const roadDashOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Car suspension bounce
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(carBounce, { toValue: -1.5, duration: 300, useNativeDriver: false }),
        Animated.timing(carBounce, { toValue: 0.5, duration: 200, useNativeDriver: false }),
        Animated.timing(carBounce, { toValue: -0.8, duration: 250, useNativeDriver: false }),
        Animated.timing(carBounce, { toValue: 0, duration: 250, useNativeDriver: false }),
      ]),
    );

    // Headlight glow
    const headlight = Animated.loop(
      Animated.sequence([
        Animated.timing(headlightPulse, { toValue: 0.8, duration: 600, useNativeDriver: false }),
        Animated.timing(headlightPulse, { toValue: 0.3, duration: 600, useNativeDriver: false }),
      ]),
    );

    // Road dashes scrolling
    const dashes = Animated.loop(
      Animated.timing(roadDashOffset, { toValue: 1, duration: 800, useNativeDriver: false }),
    );

    // Auto-progress if no external progress prop
    let autoProgress: Animated.CompositeAnimation | undefined;
    if (progress === undefined) {
      autoProgress = Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, { toValue: 1, duration: 3000, useNativeDriver: false }),
          Animated.timing(progressAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
        ]),
      );
      autoProgress.start();
    }

    bounce.start();
    headlight.start();
    dashes.start();

    return () => {
      bounce.stop();
      headlight.stop();
      dashes.stop();
      autoProgress?.stop();
    };
  }, [carBounce, headlightPulse, roadDashOffset, progressAnim, progress]);

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
        {/* Road edge lines */}
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
        />

        {/* Car at progress front — flipped to face right */}
        <Animated.View
          style={[
            styles.carContainer,
            {
              left: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-2, roadWidth - 22],
              }),
              transform: [{ translateY: carBounce }],
            },
          ]}
        >
          <Animated.View style={[styles.headlightGlow, { opacity: headlightPulse }]} />
          <Text style={styles.carEmoji}>🚗</Text>
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
  carContainer: {
    position: 'absolute',
    top: -4,
    zIndex: 10,
  },
  headlightGlow: {
    position: 'absolute',
    // Glow on the RIGHT side (front of car after flip)
    right: -10,
    top: 2,
    width: 20,
    height: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 220, 100, 0.5)',
  },
  carEmoji: {
    fontSize: 20,
    // Flip the car emoji so it faces right (driving direction)
    transform: [{ scaleX: -1 }],
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
