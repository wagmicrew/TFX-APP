/**
 * AppLoader — Server-configurable loader component.
 *
 * Reads the loaderType from school branding config and renders the
 * appropriate loader. Falls back to SpinnerLoader when config is
 * unavailable or the type is unknown.
 *
 * Usage:
 *   <AppLoader />                          // Auto-detect from school config
 *   <AppLoader type="traffic-light" />     // Override type
 *   <AppLoader size="small" color="#F00" /> // Custom size & color
 *   <AppLoader statusText="Loading..." />  // With status text
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontFamily } from '@/constants/typography';
import { TFX } from '@/constants/colors';
import type { LoaderType, LoaderProps } from './types';
import { DEFAULT_LOADER_TYPE } from './types';
import { SpinnerLoader } from './SpinnerLoader';
import { DotsLoader } from './DotsLoader';
import { CarLoader } from './CarLoader';
import { RoadLoader } from './RoadLoader';
import { TrafficLightLoader } from './TrafficLightLoader';
import { SteeringWheelLoader } from './SteeringWheelLoader';
import { ProgressBarLoader } from './ProgressBarLoader';
import { SkeletonLoader } from './SkeletonLoader';

export interface AppLoaderProps extends LoaderProps {
  /** Override the loader type (otherwise reads from school config) */
  type?: LoaderType;
}

/** Map of loader type → component */
const LOADER_MAP: Record<LoaderType, React.ComponentType<LoaderProps>> = {
  spinner: SpinnerLoader,
  dots: DotsLoader,
  car: CarLoader,
  road: RoadLoader,
  'traffic-light': TrafficLightLoader,
  'steering-wheel': SteeringWheelLoader,
  'progress-bar': ProgressBarLoader,
  skeleton: SkeletonLoader,
};

/**
 * Resolve the loader type to use.
 * Priority: explicit type prop > school config > default (spinner)
 */
function resolveLoaderType(
  explicitType?: LoaderType,
  configType?: LoaderType,
): LoaderType {
  if (explicitType && LOADER_MAP[explicitType]) return explicitType;
  if (configType && LOADER_MAP[configType]) return configType;
  return DEFAULT_LOADER_TYPE;
}

export function AppLoader({
  type,
  color = TFX.blue,
  size = 'medium',
  statusText,
  progress,
}: AppLoaderProps) {
  // Try to read school config — wrapped in try/catch because this component
  // may render before SchoolProvider is available (e.g. during initial boot)
  let configLoaderType: LoaderType | undefined;
  try {
    // Dynamic import to avoid circular dependency and allow usage outside provider
    const { useSchool } = require('@/contexts/school-context');
    const { config } = useSchool();
    configLoaderType = config?.branding?.loaderType as LoaderType | undefined;
  } catch {
    // SchoolProvider not available — use fallback
  }

  const resolvedType = resolveLoaderType(type, configLoaderType);
  const LoaderComponent = LOADER_MAP[resolvedType];

  return (
    <View style={styles.container}>
      <LoaderComponent color={color} size={size} progress={progress} />
      {statusText ? (
        <Text style={styles.statusText}>{statusText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
