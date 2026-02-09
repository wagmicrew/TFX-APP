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
}

export interface SchoolContact {
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
}

export interface SchoolConfig {
  domain: string;
  apiBaseUrl: string;
  theme: SchoolTheme;
  branding: SchoolBranding;
  contact?: SchoolContact;
  features?: {
    enableQuiz?: boolean;
    enableLessons?: boolean;
    enableCertificates?: boolean;
    enableKorklar?: boolean;
  };
}

export interface SchoolApiResponse {
  success: boolean;
  data?: SchoolConfig;
  error?: string;
}
