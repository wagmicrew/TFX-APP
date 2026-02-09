// template - TFX App
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SchoolProvider, useSchool } from "@/contexts/school-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { I18nProvider } from "@/contexts/i18n-context";
import { View, ActivityIndicator, StyleSheet, Animated, Dimensions, Platform } from "react-native";
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily } from '@/constants/typography';


// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function BootScreen() {
  const logoScale = React.useRef(new Animated.Value(0.7)).current;
  const logoOpacity = React.useRef(new Animated.Value(0)).current;
  const textOpacity = React.useRef(new Animated.Value(0)).current;
  const textSlide = React.useRef(new Animated.Value(20)).current;
  const shimmerOpacity = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const bgScale = React.useRef(new Animated.Value(1)).current;
  const bgTranslateX = React.useRef(new Animated.Value(0)).current;
  const bgTranslateY = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(textSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(shimmerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

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
          source={{ uri: 'https://r2-pub.rork.com/attachments/4hayzjd0epoq06hgrtw84' }}
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
                source={{ uri: 'https://r2-pub.rork.com/generated-images/84decd64-941d-4043-98e0-2e592fa65179.png' }}
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

        <Animated.View style={[bootStyles.loaderArea, { opacity: shimmerOpacity }]}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
        </Animated.View>
      </View>
    </View>
  );
}

function RootLayoutNav() {
  const { isConfigured, isLoading: schoolLoading } = useSchool();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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

  if (schoolLoading || authLoading) {
    return <BootScreen />;
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="school-setup" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="book-lesson" options={{ headerShown: false, presentation: "card" }} />
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
    <QueryClientProvider client={queryClient}>
      <SchoolProvider>
        <I18nProvider>
          <AuthProvider>
            <GestureHandlerRootView>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </AuthProvider>
        </I18nProvider>
      </SchoolProvider>
    </QueryClientProvider>
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
  },
});
