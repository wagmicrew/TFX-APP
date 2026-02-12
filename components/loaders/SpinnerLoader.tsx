/**
 * SpinnerLoader — Classic spinning circle loader.
 * Default fallback when no server-configured loader type is available.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { TFX } from '@/constants/colors';
import type { LoaderProps } from './types';

const SIZES = { small: 24, medium: 40, large: 56 };
const STROKE = { small: 2.5, medium: 3.5, large: 4.5 };

export function SpinnerLoader({ color = TFX.blue, size = 'medium' }: LoaderProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const dim = SIZES[size];
  const stroke = STROKE[size];

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            borderWidth: stroke,
            borderColor: `${color}22`,
            borderTopColor: color,
            transform: [{ rotate: spin }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    // Dynamic styles applied inline
  },
});
