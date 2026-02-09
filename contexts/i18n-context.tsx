import { useEffect, useState } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery } from '@tanstack/react-query';
import { useSchool } from './school-context';

const fallbackTranslations = {
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      cancel: 'Cancel',
      save: 'Save',
      continue: 'Continue',
      back: 'Back',
      or: 'OR',
      done: 'Done',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      search: 'Search',
      noResults: 'No results',
      required: 'Required',
      optional: 'Optional',
    },
    schoolSetup: {
      title: 'Connect to Your School',
      subtitle: 'Scan the QR code from your school\'s website or enter the domain manually',
      scanQR: 'Scan QR Code',
      enterDomain: 'Enter School Domain',
      domainPlaceholder: 'dintrafikskolahlm.se',
      domainHint: 'Example: dintrafikskolahlm.se or yourschool.com',
      invalidDomain: 'Please enter a valid domain',
      scanTitle: 'Scan School QR Code',
      scanInstructions: 'Position the QR code within the frame',
      firstTimeTitle: 'First time setup',
      firstTimeText: 'You only need to do this once. The app will remember your school and apply its theme automatically.',
      changeSchoolText: 'You can change schools later in Settings.',
      connecting: 'Connecting to school...',
      connectionFailed: 'Could not connect to the school. Please check the domain and try again.',
    },
    login: {
      welcomeTitle: 'Welcome Back',
      otpTitle: 'Enter OTP',
      welcomeSubtitle: 'Sign in to access your driving school account',
      otpSubtitle: 'We sent a code to',
      quickLogin: 'Quick Login with QR',
      emailLabel: 'Email Address',
      emailPlaceholder: 'your.email@example.com',
      sendOTP: 'Send OTP',
      resendOTP: 'Resend OTP',
      resendTimer: 'Resend in {{seconds}}s',
      changeEmail: 'Change Email',
      verifying: 'Verifying...',
      invalidOTP: 'Invalid OTP code',
      failedOTP: 'Failed to send OTP',
      scanInstructions: 'Scan the QR code from your student dashboard',
      loggingIn: 'Logging in...',
      cameraPermission: 'Camera permission is required to scan QR codes',
    },
    home: {
      welcomeTo: 'Welcome to',
      schoolConnected: 'Your driving school is connected',
      themeLoaded: 'Theme and branding loaded automatically',
      quickActions: 'Quick Actions',
      bookDriving: 'Book Driving Lessons',
      bookDrivingSub: 'Find available times',
      theoryLessons: 'Theory Lessons',
      theoryLessonsSub: 'View schedule and book',
      invoices: 'Invoices',
      invoicesSub: 'View and pay',
      lms: 'Study Material',
      lmsSub: 'Read and do quizzes',
      getStarted: 'Get Started',
      getStartedText: 'Your driving school app is now connected and themed. Explore the menus to book lessons, view invoices and more.',
      todaysBookings: "Today's Bookings",
      noBookingsToday: 'No bookings today',
    },
    profile: {
      title: 'Profile',
      student: 'Student',
      schoolTheme: 'School Theme',
      settings: 'Settings',
      refreshConfig: 'Refresh Configuration',
      changeSchool: 'Change School',
      allSettings: 'All Settings',
      systemSettings: 'System Settings',
      logout: 'Log Out',
      version: 'TFX v1.0.0',
    },
    settings: {
      title: 'Settings',
      connectedSchool: 'CONNECTED SCHOOL',
      theme: 'THEME',
      primaryColor: 'Primary',
      secondaryColor: 'Secondary',
      accentColor: 'Accent',
      manage: 'MANAGE',
      refreshConfig: 'Refresh configuration',
      refreshConfigDesc: 'Fetch theme and branding from school',
      changeSchool: 'Change school',
      changeSchoolDesc: 'Connect to another driving school',
      systemSettings: 'System settings',
      systemSettingsDesc: 'Permissions and app data',
      logout: 'Log out',
      logoutDesc: 'End your session',
      footerText: 'The app\'s theme and branding is controlled by your driving school. Contact the school if you experience problems.',
      changeSchoolConfirm: 'Change School',
      changeSchoolMessage: 'Are you sure you want to change driving school? You will need to enter the school domain again.',
      logoutConfirm: 'Log Out',
      logoutMessage: 'Are you sure you want to log out?',
      configUpdated: 'School configuration has been updated',
      configUpdateFailed: 'Could not update configuration. Please try again.',
    },
    bookings: {
      title: 'Bookings',
      driving: 'Driving Lessons',
      theory: 'Theory Sessions',
      upcoming: 'Upcoming',
      past: 'Past',
      book: 'Book',
      cancel: 'Cancel Booking',
      cancelConfirm: 'Are you sure you want to cancel this booking?',
      noUpcoming: 'No upcoming bookings',
      noPast: 'No past bookings',
      date: 'Date',
      time: 'Time',
      instructor: 'Instructor',
      location: 'Location',
      duration: 'Duration',
      minutes: 'min',
      booked: 'Booked',
      cancelled: 'Cancelled',
      completed: 'Completed',
    },
    invoicesScreen: {
      title: 'Invoices',
      unpaid: 'Unpaid',
      paid: 'Paid',
      overdue: 'Overdue',
      payNow: 'Pay Now',
      amount: 'Amount',
      dueDate: 'Due Date',
      invoiceNumber: 'Invoice #',
      noInvoices: 'No invoices',
      payWithSwish: 'Pay with Swish',
      payWithQliro: 'Pay with Qliro',
    },
    lmsScreen: {
      title: 'Study Material',
      chapters: 'Chapters',
      quizzes: 'Quizzes',
      progress: 'Progress',
      startQuiz: 'Start Quiz',
      continueReading: 'Continue Reading',
      completed: 'Completed',
      notStarted: 'Not Started',
      inProgress: 'In Progress',
    },
    studentDetails: {
      title: 'My Details',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone Number',
      address: 'Address',
      personalNumber: 'Personal Number',
      saveChanges: 'Save Changes',
      editDetails: 'Edit Details',
    },
  },
  sv: {
    common: {
      loading: 'Laddar...',
      error: 'Fel',
      retry: 'F\u00f6rs\u00f6k igen',
      cancel: 'Avbryt',
      save: 'Spara',
      continue: 'Forts\u00e4tt',
      back: 'Tillbaka',
      or: 'ELLER',
      done: 'Klar',
      confirm: 'Bekr\u00e4fta',
      delete: 'Radera',
      edit: 'Redigera',
      close: 'St\u00e4ng',
      yes: 'Ja',
      no: 'Nej',
      ok: 'OK',
      search: 'S\u00f6k',
      noResults: 'Inga resultat',
      required: 'Obligatorisk',
      optional: 'Valfritt',
    },
    schoolSetup: {
      title: 'Anslut till din skola',
      subtitle: 'Skanna QR-koden fr\u00e5n din skolas webbplats eller ange dom\u00e4nen manuellt',
      scanQR: 'Skanna QR-kod',
      enterDomain: 'Ange skoldom\u00e4n',
      domainPlaceholder: 'dintrafikskolahlm.se',
      domainHint: 'Exempel: dintrafikskolahlm.se eller dinskola.com',
      invalidDomain: 'V\u00e4nligen ange en giltig dom\u00e4n',
      scanTitle: 'Skanna skolans QR-kod',
      scanInstructions: 'Placera QR-koden inom ramen',
      firstTimeTitle: 'F\u00f6rsta g\u00e5ngen',
      firstTimeText: 'Du beh\u00f6ver bara g\u00f6ra detta en g\u00e5ng. Appen kommer att komma ih\u00e5g din skola och till\u00e4mpa dess tema automatiskt.',
      changeSchoolText: 'Du kan byta skola senare i Inst\u00e4llningar.',
      connecting: 'Ansluter till skolan...',
      connectionFailed: 'Kunde inte ansluta till skolan. Kontrollera dom\u00e4nen och f\u00f6rs\u00f6k igen.',
    },
    login: {
      welcomeTitle: 'V\u00e4lkommen tillbaka',
      otpTitle: 'Ange OTP',
      welcomeSubtitle: 'Logga in f\u00f6r att komma \u00e5t ditt k\u00f6rskole-konto',
      otpSubtitle: 'Vi skickade en kod till',
      quickLogin: 'Snabbinloggning med QR',
      emailLabel: 'E-postadress',
      emailPlaceholder: 'din.epost@exempel.se',
      sendOTP: 'Skicka OTP',
      resendOTP: 'Skicka igen',
      resendTimer: 'Skicka igen om {{seconds}}s',
      changeEmail: '\u00c4ndra e-post',
      verifying: 'Verifierar...',
      invalidOTP: 'Ogiltig OTP-kod',
      failedOTP: 'Misslyckades att skicka OTP',
      scanInstructions: 'Skanna QR-koden fr\u00e5n din studentpanel',
      loggingIn: 'Loggar in...',
      cameraPermission: 'Kamerabeh\u00f6righet kr\u00e4vs f\u00f6r att skanna QR-koder',
    },
    home: {
      welcomeTo: 'V\u00e4lkommen till',
      schoolConnected: 'Din k\u00f6rskola \u00e4r ansluten',
      themeLoaded: 'Tema och branding laddas automatiskt',
      quickActions: 'Snabbval',
      bookDriving: 'Boka k\u00f6rlektioner',
      bookDrivingSub: 'Hitta lediga tider',
      theoryLessons: 'Teorilektioner',
      theoryLessonsSub: 'Se schema och boka',
      invoices: 'Fakturor',
      invoicesSub: 'Se och betala',
      lms: 'Studiematerial',
      lmsSub: 'L\u00e4s och g\u00f6r quiz',
      getStarted: 'Kom ig\u00e5ng',
      getStartedText: 'Din k\u00f6rskoleapp \u00e4r nu ansluten och themed. Utforska menyerna f\u00f6r att boka lektioner, se fakturor och mer.',
      todaysBookings: 'Dagens bokningar',
      noBookingsToday: 'Inga bokningar idag',
    },
    profile: {
      title: 'Profil',
      student: 'Elev',
      schoolTheme: 'Skoltema',
      settings: 'Inst\u00e4llningar',
      refreshConfig: 'Uppdatera konfiguration',
      changeSchool: 'Byt skola',
      allSettings: 'Alla inst\u00e4llningar',
      systemSettings: 'Systeminst\u00e4llningar',
      logout: 'Logga ut',
      version: 'TFX v1.0.0',
    },
    settings: {
      title: 'Inst\u00e4llningar',
      connectedSchool: 'ANSLUTEN SKOLA',
      theme: 'TEMA',
      primaryColor: 'Prim\u00e4r',
      secondaryColor: 'Sekund\u00e4r',
      accentColor: 'Accent',
      manage: 'HANTERA',
      refreshConfig: 'Uppdatera konfiguration',
      refreshConfigDesc: 'H\u00e4mta tema och branding fr\u00e5n skolan',
      changeSchool: 'Byt skola',
      changeSchoolDesc: 'Anslut till en annan k\u00f6rskola',
      systemSettings: 'Systeminst\u00e4llningar',
      systemSettingsDesc: 'Beh\u00f6righeter och appdata',
      logout: 'Logga ut',
      logoutDesc: 'Avsluta din session',
      footerText: 'Appens tema och branding styrs av din k\u00f6rskola. Kontakta skolan om du upplever problem.',
      changeSchoolConfirm: 'Byt skola',
      changeSchoolMessage: '\u00c4r du s\u00e4ker p\u00e5 att du vill byta k\u00f6rskola? Du kommer beh\u00f6va ange skoldom\u00e4nen igen.',
      logoutConfirm: 'Logga ut',
      logoutMessage: '\u00c4r du s\u00e4ker p\u00e5 att du vill logga ut?',
      configUpdated: 'Skolkonfigurationen har uppdaterats',
      configUpdateFailed: 'Kunde inte uppdatera konfigurationen. F\u00f6rs\u00f6k igen.',
    },
    bookings: {
      title: 'Bokningar',
      driving: 'K\u00f6rlektioner',
      theory: 'Teorilektioner',
      upcoming: 'Kommande',
      past: 'Tidigare',
      book: 'Boka',
      cancel: 'Avboka',
      cancelConfirm: '\u00c4r du s\u00e4ker p\u00e5 att du vill avboka?',
      noUpcoming: 'Inga kommande bokningar',
      noPast: 'Inga tidigare bokningar',
      date: 'Datum',
      time: 'Tid',
      instructor: 'Trafikl\u00e4rare',
      location: 'Plats',
      duration: 'L\u00e4ngd',
      minutes: 'min',
      booked: 'Bokad',
      cancelled: 'Avbokad',
      completed: 'Genomförd',
    },
    invoicesScreen: {
      title: 'Fakturor',
      unpaid: 'Obetalda',
      paid: 'Betalda',
      overdue: 'F\u00f6rfallna',
      payNow: 'Betala nu',
      amount: 'Belopp',
      dueDate: 'F\u00f6rfallodatum',
      invoiceNumber: 'Faktura #',
      noInvoices: 'Inga fakturor',
      payWithSwish: 'Betala med Swish',
      payWithQliro: 'Betala med Qliro',
    },
    lmsScreen: {
      title: 'Studiematerial',
      chapters: 'Kapitel',
      quizzes: 'Quiz',
      progress: 'Framsteg',
      startQuiz: 'Starta quiz',
      continueReading: 'Forts\u00e4tt l\u00e4sa',
      completed: 'Avklarad',
      notStarted: 'Ej p\u00e5b\u00f6rjad',
      inProgress: 'P\u00e5g\u00e5ende',
    },
    studentDetails: {
      title: 'Mina uppgifter',
      firstName: 'F\u00f6rnamn',
      lastName: 'Efternamn',
      email: 'E-post',
      phone: 'Telefonnummer',
      address: 'Adress',
      personalNumber: 'Personnummer',
      saveChanges: 'Spara \u00e4ndringar',
      editDetails: 'Redigera uppgifter',
    },
  },
};

async function fetchTranslations(apiBaseUrl: string, locale: string) {
  try {
    console.log(`[i18n] Fetching translations for locale: ${locale}`);
    const response = await fetch(`${apiBaseUrl}/translations/${locale}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch translations: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.warn('[i18n] Failed to fetch server translations, using fallback:', error);
    return null;
  }
}

export const [I18nProvider, useI18n] = createContextHook(() => {
  const { config } = useSchool();
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<string>('en');

  const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
  const targetLocale = deviceLocale === 'sv' ? 'sv' : 'en';

  useEffect(() => {
    async function initWithFallback() {
      if (i18n.isInitialized) return;

      console.log('[i18n] Initializing with fallback. Device locale:', deviceLocale, '→ Using:', targetLocale);

      await i18n
        .use(initReactI18next)
        .init({
          resources: {
            en: { translation: fallbackTranslations.en },
            sv: { translation: fallbackTranslations.sv },
          },
          lng: targetLocale,
          fallbackLng: 'en',
          interpolation: {
            escapeValue: false,
          },
        });

      setCurrentLocale(targetLocale);
      setIsInitialized(true);
      console.log('[i18n] Initialized with fallback locale:', targetLocale);
    }

    initWithFallback();
  }, [deviceLocale, targetLocale]);

  const translationsQuery = useQuery({
    queryKey: ['translations', targetLocale, config?.apiBaseUrl],
    queryFn: () => fetchTranslations(config!.apiBaseUrl, targetLocale),
    enabled: !!config?.apiBaseUrl && isInitialized,
    staleTime: 1000 * 60 * 60 * 24,
  });

  useEffect(() => {
    if (translationsQuery.data && isInitialized) {
      console.log('[i18n] Applying server translations for:', targetLocale);
      i18n.addResourceBundle(targetLocale, 'translation', translationsQuery.data, true, true);
      i18n.changeLanguage(targetLocale);
    }
  }, [translationsQuery.data, targetLocale, isInitialized]);

  const changeLanguage = async (locale: string) => {
    await i18n.changeLanguage(locale);
    setCurrentLocale(locale);
  };

  return {
    isInitialized,
    currentLocale,
    changeLanguage,
    t: i18n.t,
    isLoading: translationsQuery.isLoading,
  };
});
