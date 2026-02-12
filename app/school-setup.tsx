import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, QrCode, X, Globe, ChevronRight, Info } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSchool } from '@/contexts/school-context';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/contexts/i18n-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { TFX } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const LOGO_URL = require('@/assets/images/tfx-logo.png');
const HEADER_BG_URL = require('@/assets/images/header-bg.png');

const LANGUAGES = [
  { code: 'sv', flag: '🇸🇪', label: 'Svenska' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
] as const;

export default function SchoolSetupScreen() {
  const { selectSchool, isSaving, error } = useSchool();
  const { t } = useTranslation();
  const { currentLocale, changeLanguage } = useI18n();
  const [domain, setDomain] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const logoScale = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const infoScale = useRef(new Animated.Value(0.85)).current;
  const bgScale = useRef(new Animated.Value(1)).current;
  const bgTranslateX = useRef(new Animated.Value(0)).current;
  const bgTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(bgScale, { toValue: 1.15, duration: 12000, useNativeDriver: true }),
          Animated.timing(bgTranslateX, { toValue: -15, duration: 12000, useNativeDriver: true }),
          Animated.timing(bgTranslateY, { toValue: -8, duration: 12000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(bgScale, { toValue: 1.05, duration: 10000, useNativeDriver: true }),
          Animated.timing(bgTranslateX, { toValue: 10, duration: 10000, useNativeDriver: true }),
          Animated.timing(bgTranslateY, { toValue: 5, duration: 10000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(bgScale, { toValue: 1, duration: 11000, useNativeDriver: true }),
          Animated.timing(bgTranslateX, { toValue: 0, duration: 11000, useNativeDriver: true }),
          Animated.timing(bgTranslateY, { toValue: 0, duration: 11000, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [logoScale, formOpacity, formTranslateY, bgScale, bgTranslateX, bgTranslateY]);

  const showInfoModal = () => {
    setShowInfoPopup(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(infoOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(infoScale, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const hideInfoModal = () => {
    Animated.parallel([
      Animated.timing(infoOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(infoScale, { toValue: 0.85, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowInfoPopup(false));
  };

  const validateDomain = (input: string): boolean => {
    const cleanInput = input.trim();
    if (!cleanInput) {
      setValidationError(t('schoolSetup.invalidDomain'));
      return false;
    }
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const cleanDomain = cleanInput.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!domainRegex.test(cleanDomain)) {
      setValidationError(t('schoolSetup.invalidDomain'));
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleContinue = async () => {
    if (validateDomain(domain)) {
      console.log('[SchoolSetup] Selecting school:', domain);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      selectSchool(domain);
    }
  };

  const handleLanguageSwitch = (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    changeLanguage(code);
  };

  const handleQRScan = (data: string) => {
    if (scanned) return;
    console.log('[SchoolSetup] QR scanned:', data);
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'school_config' && parsed.domain) {
        const scannedDomain = parsed.domain;
        setDomain(scannedDomain);
        setShowQRScanner(false);
        console.log('[SchoolSetup] QR valid, selecting school:', scannedDomain);
        selectSchool(scannedDomain);
        setTimeout(() => setScanned(false), 1000);
      } else {
        throw new Error(t('common.error'));
      }
    } catch {
      setValidationError(t('common.error'));
      setShowQRScanner(false);
      setTimeout(() => setScanned(false), 1000);
    }
  };

  const openQRScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setValidationError(t('common.error'));
        return;
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowQRScanner(true);
    setScanned(false);
  };

  return (
    <View style={styles.root}>
      <View style={styles.headerBgContainer}>
        <Animated.Image
          source={HEADER_BG_URL}
          style={[
            styles.headerBgImage,
            {
              transform: [
                { scale: bgScale },
                { translateX: bgTranslateX },
                { translateY: bgTranslateY },
              ],
            },
          ]}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(10,79,122,0.88)', 'rgba(15,43,62,0.94)', 'rgba(26,46,59,0.97)']}
          style={styles.headerBgOverlay}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View style={styles.languageSwitcher}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langButton,
                  currentLocale === lang.code && styles.langButtonActive,
                ]}
                onPress={() => handleLanguageSwitch(lang.code)}
                activeOpacity={0.7}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                {currentLocale === lang.code && (
                  <View style={styles.langDot} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={showInfoModal}
            activeOpacity={0.7}
          >
            <Info size={22} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.header, { transform: [{ scale: logoScale }] }]}>
              <View style={styles.logoRow}>
                <View style={styles.logoWrapper}>
                  <Image
                    source={LOGO_URL}
                    style={styles.logo}
                    contentFit="contain"
                  />
                </View>
                <View>
                  <Text style={styles.brandName}>TFX</Text>
                  <Text style={styles.brandTagline}>Din digitala körskola</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[styles.card, { opacity: formOpacity, transform: [{ translateY: formTranslateY }] }]}>
              <Text style={styles.cardTitle}>{t('schoolSetup.title')}</Text>
              <Text style={styles.cardSubtitle}>{t('schoolSetup.subtitle')}</Text>

              <TouchableOpacity
                style={styles.qrButton}
                onPress={openQRScanner}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[TFX.orange, TFX.orangeDark]}
                  style={styles.qrButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <QrCode size={24} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.qrButtonText}>{t('schoolSetup.scanQR')}</Text>
                  <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('common.or')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <Text style={styles.label}>{t('schoolSetup.enterDomain')}</Text>
              <View style={[styles.inputWrapper, (validationError || error) && styles.inputWrapperError]}>
                <Globe size={20} color={TFX.slate} />
                <TextInput
                  style={styles.input}
                  value={domain}
                  onChangeText={(text) => {
                    setDomain(text);
                    setValidationError(null);
                  }}
                  placeholder={t('schoolSetup.domainPlaceholder')}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!isSaving}
                />
              </View>
              <Text style={styles.hint}>{t('schoolSetup.domainHint')}</Text>

              {validationError && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={16} color={TFX.danger} />
                  <Text style={styles.errorText}>{validationError}</Text>
                </View>
              )}

              {error && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={16} color={TFX.danger} />
                  <Text style={styles.errorText}>
                    {error instanceof Error ? error.message : t('schoolSetup.connectionFailed')}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.connectButton, isSaving && styles.connectButtonDisabled]}
                onPress={handleContinue}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[TFX.blue, TFX.blueDark]}
                  style={styles.connectButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isSaving ? (
                    <View style={styles.connectingRow}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.connectButtonText}>{t('schoolSetup.connecting')}</Text>
                    </View>
                  ) : (
                    <Text style={styles.connectButtonText}>{t('common.continue')}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {showInfoPopup && (
        <Modal transparent visible animationType="none" onRequestClose={hideInfoModal}>
          <Animated.View style={[styles.infoOverlay, { opacity: infoOpacity }]}>
            <TouchableOpacity style={styles.infoOverlayTouch} activeOpacity={1} onPress={hideInfoModal}>
              <Animated.View style={[styles.infoPopup, { transform: [{ scale: infoScale }] }]}>
                {Platform.OS !== 'web' ? (
                  <BlurView intensity={80} tint="dark" style={styles.infoBlur}>
                    <InfoPopupContent onClose={hideInfoModal} t={t} />
                  </BlurView>
                ) : (
                  <View style={styles.infoBlurFallback}>
                    <InfoPopupContent onClose={hideInfoModal} t={t} />
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </Modal>
      )}

      <Modal
        visible={showQRScanner}
        animationType="slide"
        onRequestClose={() => setShowQRScanner(false)}
      >
        <SafeAreaProvider>
          <View style={styles.qrModal}>
            <SafeAreaView style={styles.qrSafeArea} edges={['top']}>
              <View style={styles.qrHeader}>
                <Text style={styles.qrTitle}>{t('schoolSetup.scanTitle')}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowQRScanner(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                if (!scanned) handleQRScan(data);
              }}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <Text style={styles.scanInstructions}>{t('schoolSetup.scanInstructions')}</Text>
              </View>
            </CameraView>
          </View>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

function InfoPopupContent({ onClose, t }: { onClose: () => void; t: (key: string) => string }) {
  return (
    <View style={styles.infoContent}>
      <View style={styles.infoHeaderRow}>
        <Text style={styles.infoPopupTitle}>{t('schoolSetup.firstTimeTitle')}</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.infoCloseBtn}>
          <X size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>
      <Text style={styles.infoPopupText}>{t('schoolSetup.firstTimeText')}</Text>
      <View style={styles.infoSeparator} />
      <Text style={styles.infoPopupText}>{t('schoolSetup.changeSchoolText')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TFX.grayLight,
  },
  headerBgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
    overflow: 'hidden',
  },
  headerBgImage: {
    position: 'absolute',
    top: -40,
    left: -40,
    right: -40,
    bottom: -40,
    width: width + 80,
    height: 420,
    opacity: 0.28,
  },
  headerBgOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 0,
  },
  languageSwitcher: {
    flexDirection: 'row',
    gap: 6,
  },
  langButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  langButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  langFlag: {
    fontSize: 22,
  },
  langDot: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TFX.orange,
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Math.min(width * 0.05, 24),
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 72,
    height: 72,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800' as const,
    fontFamily,
    color: TFX.white,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    fontFamily,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 1,
  },
  card: {
    backgroundColor: TFX.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  cardTitle: {
    fontSize: Math.min(width * 0.055, 22),
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.navy,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: Math.min(width * 0.037, 14),
    fontFamily,
    color: TFX.slate,
    lineHeight: 20,
    marginBottom: 24,
  },
  qrButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  qrButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  qrButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    flex: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: TFX.grayMid,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: TFX.slate,
    letterSpacing: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: TFX.navy,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: TFX.grayMid,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: TFX.grayLight,
    gap: 10,
  },
  inputWrapperError: {
    borderColor: TFX.danger,
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: TFX.navy,
    height: '100%',
  },
  hint: {
    fontSize: 12,
    color: TFX.slate,
    marginTop: 6,
    marginBottom: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 13,
    color: TFX.danger,
    flex: 1,
  },
  connectButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 20,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connectButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    fontFamily,
    color: '#fff',
  },
  infoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoOverlayTouch: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  infoPopup: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
  },
  infoBlur: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 24,
  },
  infoBlurFallback: {
    backgroundColor: 'rgba(15, 43, 62, 0.92)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  infoContent: {
    padding: 24,
  },
  infoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoPopupTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    fontFamily,
    color: '#fff',
    flex: 1,
  },
  infoCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPopupText: {
    fontSize: 15,
    fontWeight: '600' as const,
    fontFamily,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 22,
  },
  infoSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 16,
  },
  qrModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  qrSafeArea: {
    zIndex: 10,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    fontFamily,
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: TFX.orange,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanInstructions: {
    marginTop: 32,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
