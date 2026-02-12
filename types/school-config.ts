export interface SchoolTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  cardBackground: string;
  errorColor?: string;
  successColor?: string;
  warningColor?: string;
}

export interface SchoolBranding {
  logoUrl: string;
  iconUrl?: string;
  splashImageUrl?: string;
  schoolName: string;
  tagline?: string;
  /** Server-configured loader style for boot screen and loading states */
  loaderType?: import('@/components/loaders/types').LoaderType;
}

export interface SchoolContact {
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
}

export interface SchoolFeatures {
  enableQuiz?: boolean;
  enableLessons?: boolean;
  enableCertificates?: boolean;
  enableKorklar?: boolean;
  enableBookings?: boolean;
  enableLms?: boolean;
  enableInvoices?: boolean;
  enableProfile?: boolean;
  enableOfflineMode?: boolean;
  // Alternative key names from some server versions
  bookings?: boolean;
  lms?: boolean;
  invoices?: boolean;
  profile?: boolean;
  quiz?: boolean;
  certificates?: boolean;
  korklar?: boolean;
  offlineMode?: boolean;
}

export interface SchoolConfig {
  domain: string;
  apiBaseUrl: string;
  theme: SchoolTheme;
  branding: SchoolBranding;
  contact?: SchoolContact;
  features?: SchoolFeatures;
  /** Top-level enabled features array from server (e.g. ["bookings","invoices","lms","profile"]) */
  enabledFeatures?: string[];
  /** Mobile app-specific config from admin dashboard */
  mobileConfig?: {
    appEnabled: boolean;
    maintenanceMode: boolean;
    minVersion: { ios: string; android: string };
    latestVersion: { ios: string; android: string };
    pushEnabled: boolean;
    syncIntervalMinutes: number;
  };
}

export interface SchoolApiResponse {
  success: boolean;
  data?: SchoolConfig;
  error?: string;
}
