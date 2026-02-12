/**
 * SteeringWheelLoader — Spinning steering wheel animation.
 * Uses a simple circle with spokes to represent a steering wheel,
 * rotating continuously.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { TFX } from '@/constants/colors';
import type { LoaderProps } from './types';

const WHEEL_SIZES = { small: 28, medium: 44, large: 60 };
const SPOKE_WIDTH = { small: 1.5, medium: 2, large: 3 };
const RIM_WIDTH = { small: 2, medium: 3, large: 4 };

export function SteeringWheelLoader({ color = TFX.blue, size = 'medium' }: LoaderProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const wheelSize = WHEEL_SIZES[size];
  const spokeW = SPOKE_WIDTH[size];
  const rimW = RIM_WIDTH[size];
  const hubSize = wheelSize * 0.22;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(rotation, {
          toValue: 0.25,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: -0.15,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 0.1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-360deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.wheel,
          {
            width: wheelSize,
            height: wheelSize,
            borderRadius: wheelSize / 2,
            borderWidth: rimW,
            borderColor: color,
            transform: [{ rotate: spin }],
          },
        ]}
      >
        {/* Three spokes at 0°, 120°, 240° */}
        {[0, 120, 240].map((deg) => (
          <View
            key={deg}
            style={[
              styles.spoke,
              {
                width: spokeW,
                height: wheelSize / 2 - rimW,
                backgroundColor: color,
                top: rimW,
                left: wheelSize / 2 - rimW - spokeW / 2,
                transformOrigin: `${spokeW / 2}px ${wheelSize / 2 - rimW}px`,
                transform: [{ rotate: `${deg}deg` }],
              },
            ]}
          />
        ))}
        {/* Center hub */}
        <View
          style={[
            styles.hub,
            {
              width: hubSize,
              height: hubSize,
              borderRadius: hubSize / 2,
              backgroundColor: color,
              top: wheelSize / 2 - rimW - hubSize / 2,
              left: wheelSize / 2 - rimW - hubSize / 2,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheel: {
    position: 'relative',
  },
  spoke: {
    position: 'absolute',
    borderRadius: 1,
  },
  hub: {
    position: 'absolute',
  },
});
