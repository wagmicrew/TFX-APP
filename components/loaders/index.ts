/**
 * Loader system barrel exports.
 *
 * Primary usage:
 *   import { AppLoader } from '@/components/loaders';
 *
 * Individual loaders (for direct use):
 *   import { SpinnerLoader, DotsLoader } from '@/components/loaders';
 */

export { AppLoader } from './AppLoader';
export type { AppLoaderProps } from './AppLoader';

export { SpinnerLoader } from './SpinnerLoader';
export { DotsLoader } from './DotsLoader';
export { CarLoader } from './CarLoader';
export { RoadLoader } from './RoadLoader';
export { TrafficLightLoader } from './TrafficLightLoader';
export { SteeringWheelLoader } from './SteeringWheelLoader';
export { ProgressBarLoader } from './ProgressBarLoader';
export { SkeletonLoader } from './SkeletonLoader';

export type { LoaderType, LoaderProps } from './types';
export { DEFAULT_LOADER_TYPE, LOADER_SIZES } from './types';
