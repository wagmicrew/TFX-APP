/**
 * Loader system types
 *
 * Defines the available loader types that can be configured per-school
 * via the /api/app-config endpoint, and shared props for all loaders.
 */

export type LoaderType =
  | 'spinner'
  | 'dots'
  | 'car'
  | 'road'
  | 'traffic-light'
  | 'steering-wheel'
  | 'progress-bar'
  | 'skeleton';

export interface LoaderProps {
  /** Primary color from school theme (defaults to TFX blue) */
  color?: string;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Optional status text to display below the loader */
  statusText?: string;
  /** Progress value 0–1 for progress-based loaders */
  progress?: number;
}

export const DEFAULT_LOADER_TYPE: LoaderType = 'spinner';

/** Map size variant to pixel dimensions */
export const LOADER_SIZES = {
  small: { width: 120, height: 40 },
  medium: { width: 220, height: 60 },
  large: { width: 280, height: 80 },
} as const;
