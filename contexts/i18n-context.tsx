import { useEffect, useState, useRef } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery } from '@tanstack/react-query';
import { useSchool } from './school-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAppTranslations } from '@/services/mobile-api';

const I18N_ETAG_KEY = '@tfx_i18n_etag';
const I18N_CACHE_KEY = '@tfx_i18n_cache';

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
      dashboard: 'Dashboard',
      myCourses: 'My Courses',
      allCourses: 'All Courses',
      chapters: 'Chapters',
      lessons: 'Lessons',
      quizzes: 'Quizzes',
      progress: 'Progress',
      overallProgress: 'Overall Progress',
      startQuiz: 'Start Quiz',
      retakeQuiz: 'Retake Quiz',
      continueReading: 'Continue Reading',
      startLesson: 'Start Lesson',
      completed: 'Completed',
      notStarted: 'Not Started',
      inProgress: 'In Progress',
      courseProgress: '{{progress}}% completed',
      chaptersCount: '{{count}} chapters',
      lessonsCount: '{{count}} lessons',
      quizzesCount: '{{count}} quizzes',
      estimatedTime: '~{{minutes}} min',
      noCourses: 'No courses available',
      noCoursesDesc: 'Your school has not published any courses for the app yet.',
      continueWhere: 'Continue where you left off',
      recentActivity: 'Recent Activity',
      viewAll: 'View All',
      courseDetails: 'Course Details',
      chapterOf: 'Chapter {{current}} of {{total}}',
      lessonContent: 'Lesson Content',
      nextLesson: 'Next Lesson',
      prevLesson: 'Previous Lesson',
      markComplete: 'Mark as Complete',
      alreadyCompleted: 'Already Completed',
      lessonCompleted: 'Lesson completed!',
      backToCourse: 'Back to Course',
      backToCourses: 'Back to Courses',
    },
    quizScreen: {
      title: 'Quiz',
      question: 'Question',
      questionOf: 'Question {{current}} of {{total}}',
      selectAnswer: 'Select an answer',
      selectAnswers: 'Select all correct answers',
      trueOrFalse: 'True or False?',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit Quiz',
      submitConfirm: 'Are you sure you want to submit?',
      submitConfirmDesc: 'You have answered {{answered}} of {{total}} questions.',
      timeRemaining: 'Time remaining',
      timeUp: 'Time is up!',
      results: 'Quiz Results',
      score: 'Score',
      passed: 'Passed!',
      failed: 'Not passed',
      passedDesc: 'Congratulations! You passed the quiz.',
      failedDesc: 'You did not reach the passing score. Try again!',
      correctAnswers: '{{count}} correct',
      wrongAnswers: '{{count}} wrong',
      passingScore: 'Passing score: {{score}}%',
      yourScore: 'Your score: {{score}}%',
      reviewAnswers: 'Review Answers',
      correct: 'Correct',
      wrong: 'Wrong',
      explanation: 'Explanation',
      tryAgain: 'Try Again',
      backToCourse: 'Back to Course',
      attempts: '{{count}} attempts',
      bestScore: 'Best: {{score}}%',
      unanswered: '{{count}} unanswered',
      exitConfirm: 'Exit Quiz?',
      exitConfirmDesc: 'Your progress will be lost if you exit now.',
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
      dashboard: 'Översikt',
      myCourses: 'Mina kurser',
      allCourses: 'Alla kurser',
      chapters: 'Kapitel',
      lessons: 'Lektioner',
      quizzes: 'Quiz',
      progress: 'Framsteg',
      overallProgress: 'Totalt framsteg',
      startQuiz: 'Starta quiz',
      retakeQuiz: 'Gör om quiz',
      continueReading: 'Fortsätt läsa',
      startLesson: 'Starta lektion',
      completed: 'Avklarad',
      notStarted: 'Ej påbörjad',
      inProgress: 'Pågående',
      courseProgress: '{{progress}}% avklarat',
      chaptersCount: '{{count}} kapitel',
      lessonsCount: '{{count}} lektioner',
      quizzesCount: '{{count}} quiz',
      estimatedTime: '~{{minutes}} min',
      noCourses: 'Inga kurser tillgängliga',
      noCoursesDesc: 'Din skola har inte publicerat några kurser för appen ännu.',
      continueWhere: 'Fortsätt där du slutade',
      recentActivity: 'Senaste aktivitet',
      viewAll: 'Visa alla',
      courseDetails: 'Kursdetaljer',
      chapterOf: 'Kapitel {{current}} av {{total}}',
      lessonContent: 'Lektionsinnehåll',
      nextLesson: 'Nästa lektion',
      prevLesson: 'Föregående lektion',
      markComplete: 'Markera som klar',
      alreadyCompleted: 'Redan avklarad',
      lessonCompleted: 'Lektion avklarad!',
      backToCourse: 'Tillbaka till kurs',
      backToCourses: 'Tillbaka till kurser',
    },
    quizScreen: {
      title: 'Quiz',
      question: 'Fråga',
      questionOf: 'Fråga {{current}} av {{total}}',
      selectAnswer: 'Välj ett svar',
      selectAnswers: 'Välj alla korrekta svar',
      trueOrFalse: 'Sant eller falskt?',
      next: 'Nästa',
      previous: 'Föregående',
      submit: 'Skicka in quiz',
      submitConfirm: 'Är du säker på att du vill skicka in?',
      submitConfirmDesc: 'Du har svarat på {{answered}} av {{total}} frågor.',
      timeRemaining: 'Tid kvar',
      timeUp: 'Tiden är slut!',
      results: 'Quizresultat',
      score: 'Poäng',
      passed: 'Godkänd!',
      failed: 'Ej godkänd',
      passedDesc: 'Grattis! Du klarade quizet.',
      failedDesc: 'Du nådde inte godkäntgränsen. Försök igen!',
      correctAnswers: '{{count}} rätt',
      wrongAnswers: '{{count}} fel',
      passingScore: 'Godkäntgräns: {{score}}%',
      yourScore: 'Ditt resultat: {{score}}%',
      reviewAnswers: 'Granska svar',
      correct: 'Rätt',
      wrong: 'Fel',
      explanation: 'Förklaring',
      tryAgain: 'Försök igen',
      backToCourse: 'Tillbaka till kurs',
      attempts: '{{count}} försök',
      bestScore: 'Bäst: {{score}}%',
      unanswered: '{{count}} obesvarade',
      exitConfirm: 'Avsluta quiz?',
      exitConfirmDesc: 'Dina framsteg går förlorade om du avslutar nu.',
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

    // Try mobile i18n endpoint with ETag caching first
    const storedETag = await AsyncStorage.getItem(I18N_ETAG_KEY);
    const result = await fetchAppTranslations(apiBaseUrl, locale, storedETag ?? undefined);

    if (result.notModified) {
      console.log('[i18n] Translations not modified (304), using cache');
      const cached = await AsyncStorage.getItem(I18N_CACHE_KEY);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // Fall through to legacy endpoint
        }
      }
    }

    if (result.success && result.data?.translations) {
      // Cache the translations and ETag
      await AsyncStorage.setItem(I18N_CACHE_KEY, JSON.stringify(result.data.translations));
      if (result.etag) {
        await AsyncStorage.setItem(I18N_ETAG_KEY, result.etag);
      }
      console.log('[i18n] Translations fetched and cached via mobile API');
      return result.data.translations;
    }

    // Fallback: try legacy endpoint
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
    // Try loading from cache as last resort
    try {
      const cached = await AsyncStorage.getItem(I18N_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
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
