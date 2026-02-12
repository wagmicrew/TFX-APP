/**
 * TrafficLightLoader — Red → Yellow → Green cycling traffic light.
 * Driving-school themed loader that cycles through traffic light colors.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { LoaderProps } from './types';

const LIGHT_SIZES = { small: 12, medium: 18, large: 24 };
const HOUSING_PAD = { small: 4, medium: 6, large: 8 };

type LightPhase = 'red' | 'yellow' | 'green';
const PHASES: LightPhase[] = ['red', 'yellow', 'green'];
const PHASE_COLORS: Record<LightPhase, string> = {
  red: '#EF4444',
  yellow: '#F5C518',
  green: '#34B364',
};

export function TrafficLightLoader({ size = 'medium' }: LoaderProps) {
  const lightSize = LIGHT_SIZES[size];
  const pad = HOUSING_PAD[size];
  const [phase, setPhase] = useState<LightPhase>('red');
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % PHASES.length;
      setPhase(PHASES[idx]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Pulse glow on phase change
    glowAnim.setValue(0);
    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [phase, glowAnim]);

  const housingWidth = lightSize + pad * 2;
  const housingHeight = lightSize * 3 + pad * 4;
  const housingRadius = housingWidth / 4;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.housing,
          {
            width: housingWidth,
            height: housingHeight,
            borderRadius: housingRadius,
            padding: pad,
            gap: pad,
          },
        ]}
      >
        {PHASES.map((p) => {
          const isActive = phase === p;
          return (
            <Animated.View
              key={p}
              style={[
                styles.light,
                {
                  width: lightSize,
                  height: lightSize,
                  borderRadius: lightSize / 2,
                  backgroundColor: isActive ? PHASE_COLORS[p] : `${PHASE_COLORS[p]}30`,
                  ...(isActive
                    ? {
                        shadowColor: PHASE_COLORS[p],
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: lightSize / 2,
                        elevation: 6,
                      }
                    : {}),
                  opacity: isActive ? glowAnim : 0.3,
                },
              ]}
            />
          );
        })}
      </View>
      {/* Pole */}
      <View
        style={[
          styles.pole,
          {
            width: Math.max(4, housingWidth / 4),
            height: lightSize,
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
  housing: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  light: {
    // Dynamic styles applied inline
  },
  pole: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});
