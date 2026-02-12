// template - TFX App
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SchoolProvider, useSchool } from "@/contexts/school-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { AppConfigProvider, useAppConfig } from "@/contexts/app-config-context";
import { I18nProvider } from "@/contexts/i18n-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { View, Text, StyleSheet, Animated, Dimensions, Platform, TouchableOpacity, Linking } from "react-native";
import { Image } from 'expo-image';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily } from '@/constants/typography';
import { TFX } from '@/constants/colors';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useNotificationPoller } from '@/hooks/useNotificationPoller';
import { AppLoader } from '@/components/loaders';


// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BOOT_STEPS = [
  'Startar TFX...',
  'Laddar konfiguration...',
  'Ansluter till servern...',
  'Nästan klar...',
];

function BootScreen() {
  const logoScale = React.useRef(new Animated.Value(0.7)).current;
  const logoOpacity = React.useRef(new Animated.Value(0)).current;
  const textOpacity = React.useRef(new Animated.Value(0)).current;
  const textSlide = React.useRef(new Animated.Value(20)).current;
  const loaderOpacity = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const bgScale = React.useRef(new Animated.Value(1)).current;
  const bgTranslateX = React.useRef(new Animated.Value(0)).current;
  const bgTranslateY = React.useRef(new Animated.Value(0)).current;
  const statusOpacity = React.useRef(new Animated.Value(0)).current;
  const dotOpacity1 = React.useRef(new Animated.Value(0.3)).current;
  const dotOpacity2 = React.useRef(new Animated.Value(0.3)).current;
  const dotOpacity3 = React.useRef(new Animated.Value(0.3)).current;
  const [statusIndex, setStatusIndex] = React.useState(0);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    // Logo + text entrance
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(textSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(loaderOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(statusOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // Logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Dot wave animation
    Animated.loop(
      Animated.sequence([
        Animated.stagger(200, [
          Animated.sequence([
            Animated.timing(dotOpacity1, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dotOpacity1, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dotOpacity2, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dotOpacity2, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dotOpacity3, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dotOpacity3, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          ]),
        ]),
      ])
    ).start();

    // Background ken-burns
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(bgScale, { toValue: 1.12, duration: 14000, useNativeDriver: true }),
          Animated.timing(bgTranslateX, { toValue: -12, duration: 14000, useNativeDriver: true }),
          Animated.timing(bgTranslateY, { toValue: -6, duration: 14000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(bgScale, { toValue: 1.04, duration: 12000, useNativeDriver: true }),
          Animated.timing(bgTranslateX, { toValue: 8, duration: 12000, useNativeDriver: true }),
          Animated.timing(bgTranslateY, { toValue: 4, duration: 12000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(bgScale, { toValue: 1, duration: 13000, useNativeDriver: true }),
          Animated.timing(bgTranslateX, { toValue: 0, duration: 13000, useNativeDriver: true }),
          Animated.timing(bgTranslateY, { toValue: 0, duration: 13000, useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Rotate through status messages
    const statusInterval = setInterval(() => {
      setStatusIndex((prev) => {
        if (prev < BOOT_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 1200);

    return () => clearInterval(statusInterval);
  }, []);

  return (
    <View style={bootStyles.container}>
      <Animated.View style={[bootStyles.bgAnimContainer, {
        transform: [
          { scale: bgScale },
          { translateX: bgTranslateX },
          { translateY: bgTranslateY },
        ],
      }]}>
        <Image
          source={require('@/assets/images/boot-bg.png')}
          style={bootStyles.bgImage}
          contentFit="cover"
        />
      </Animated.View>
      <View style={bootStyles.overlay} />
      <View style={[bootStyles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Animated.View style={[
          bootStyles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] }
        ]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={bootStyles.logoGlow} />
            <View style={bootStyles.logoBox}>
              <Image
                source={require('@/assets/images/tfx-logo.png')}
                style={bootStyles.logo}
                contentFit="contain"
              />
            </View>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[
          bootStyles.textContainer,
          { opacity: textOpacity, transform: [{ translateY: textSlide }] }
        ]}>
          <Animated.Text style={bootStyles.appName}>TFX</Animated.Text>
          <Animated.Text style={bootStyles.tagline}>TrafikskolaX</Animated.Text>
        </Animated.View>

        <Animated.View style={[bootStyles.loaderArea, { opacity: loaderOpacity }]}>
          {/* Server-configurable loader — reads type from school config, falls back to spinner */}
          <AppLoader size="medium" statusText={BOOT_STEPS[statusIndex]} />

          {/* Animated dots below status text */}
          <Animated.View style={[bootStyles.statusRow, { opacity: statusOpacity }]}>
            <View style={bootStyles.dotsRow}>
              <Animated.Text style={[bootStyles.dot, { opacity: dotOpacity1 }]}>●</Animated.Text>
              <Animated.Text style={[bootStyles.dot, { opacity: dotOpacity2 }]}>●</Animated.Text>
              <Animated.Text style={[bootStyles.dot, { opacity: dotOpacity3 }]}>●</Animated.Text>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

/** Maintenance mode gate screen */
function MaintenanceScreen() {
  return (
    <View style={gateStyles.container}>
      <Text style={gateStyles.emoji}>🔧</Text>
      <Text style={gateStyles.title}>Underhåll pågår</Text>
      <Text style={gateStyles.message}>
        Appen är tillfälligt otillgänglig för underhåll. Vänligen försök igen senare.
      </Text>
    </View>
  );
}

/** Force update gate screen */
function ForceUpdateScreen({ storeUrl }: { storeUrl?: string }) {
  const handleUpdate = () => {
    if (storeUrl) {
      Linking.openURL(storeUrl);
    }
  };

  return (
    <View style={gateStyles.container}>
      <Text style={gateStyles.emoji}>📲</Text>
      <Text style={gateStyles.title}>Uppdatering krävs</Text>
      <Text style={gateStyles.message}>
        En ny version av appen finns tillgänglig. Du måste uppdatera för att fortsätta.
      </Text>
      {storeUrl ? (
        <TouchableOpacity style={gateStyles.button} onPress={handleUpdate}>
          <Text style={gateStyles.buttonText}>Uppdatera nu</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** App disabled gate screen */
function AppDisabledScreen() {
  return (
    <View style={gateStyles.container}>
      <Text style={gateStyles.emoji}>📵</Text>
      <Text style={gateStyles.title}>Appen är inte aktiv</Text>
      <Text style={gateStyles.message}>
        Mobilappen är för närvarande inte aktiverad. Kontakta din trafikskola för mer information.
      </Text>
    </View>
  );
}

function RootLayoutNav() {
  const { isConfigured, isLoading: schoolLoading } = useSchool();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    settings: appSettings,
    isLoading: configLoading,
    isAppEnabled,
    isMaintenanceMode,
    requiresUpdate,
    storeUrl,
  } = useAppConfig();
  const segments = useSegments();
  const router = useRouter();

  // Start auto-sync when authenticated + offline mode enabled
  useAutoSync();

  // Poll for notifications (handles kick detection + unread count)
  const { unreadCount } = useNotificationPoller();

  useEffect(() => {
    if (schoolLoading || authLoading) {
      console.log('[RootLayout] Loading...');
      return;
    }

    const inSetup = segments[0] === 'school-setup';
    const inLogin = segments[0] === 'login';
    const inTabs = segments[0] === '(tabs)';

    if (!isConfigured && !inSetup) {
      console.log('[RootLayout] No school configured, redirecting to setup');
      router.replace('/school-setup');
    } else if (isConfigured && !isAuthenticated && !inLogin) {
      console.log('[RootLayout] School configured but not authenticated, redirecting to login');
      router.replace('/login');
    } else if (isConfigured && isAuthenticated && (inSetup || inLogin)) {
      console.log('[RootLayout] Authenticated, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [isConfigured, isAuthenticated, schoolLoading, authLoading, segments]);

  if (schoolLoading || authLoading || configLoading) {
    return <BootScreen />;
  }

  // Gate: Force update required
  if (isConfigured && requiresUpdate) {
    return <ForceUpdateScreen storeUrl={storeUrl} />;
  }

  // Gate: Maintenance mode
  if (isConfigured && isMaintenanceMode) {
    return <MaintenanceScreen />;
  }

  // Gate: App disabled by admin
  if (isConfigured && appSettings && !isAppEnabled) {
    return <AppDisabledScreen />;
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="school-setup" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="lms" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="book-lesson" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="invoice-detail" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="booking-detail" options={{ headerShown: false }} />
      <Stack.Screen name="student-profile" options={{ headerShown: false }} />
    </Stack>
  );
}

function useTypekitFont() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const existing = document.querySelector('link[href*="use.typekit.net/nok5gzd"]');
      if (!existing) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://use.typekit.net/nok5gzd.css';
        document.head.appendChild(link);
        console.log('[Font] Typekit Komet font loaded');
      }
    }
  }, []);
}

export default function RootLayout() {
  useTypekitFont();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SchoolProvider>
          <I18nProvider>
            <AppConfigProvider>
              <AuthProvider>
                <ThemeProvider>
                  <ErrorBoundary>
                    <GestureHandlerRootView>
                      <OfflineBanner />
                      <RootLayoutNav />
                    </GestureHandlerRootView>
                  </ErrorBoundary>
                </ThemeProvider>
              </AuthProvider>
            </AppConfigProvider>
          </I18nProvider>
        </SchoolProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const bootStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2e3b',
  },
  bgAnimContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgImage: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: SCREEN_WIDTH + 60,
    height: SCREEN_HEIGHT + 60,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 43, 62, 0.55)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(27, 143, 206, 0.2)',
    top: -10,
    left: -10,
  },
  logoBox: {
    width: 140,
    height: 140,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
  },
  logo: {
    width: 110,
    height: 110,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 48,
    fontWeight: '800' as const,
    fontFamily,
    color: '#FFFFFF',
    letterSpacing: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500' as const,
    fontFamily,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 3,
    marginTop: 4,
    textTransform: 'uppercase' as const,
  },
  loaderArea: {
    position: 'absolute' as const,
    bottom: Platform.OS === 'web' ? 60 : 80,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginLeft: 2,
  },
  dot: {
    fontSize: 6,
    color: 'rgba(255,255,255,0.7)',
  },
});

const gateStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TFX.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.navy,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: TFX.slate,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: TFX.blue,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: TFX.white,
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily,
  },
});
