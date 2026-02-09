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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, AlertCircle, QrCode, X, Check, ChevronRight, Settings } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '@/contexts/auth-context';
import { useTranslation } from 'react-i18next';
import { useSchool } from '@/contexts/school-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { TFX } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';

const { width } = Dimensions.get('window');
const LOGO_URL = { uri: 'https://r2-pub.rork.com/generated-images/84decd64-941d-4043-98e0-2e592fa65179.png' };
const HEADER_BG_URL = { uri: 'https://r2-pub.rork.com/attachments/1v3jr1euro5i32gaenbvs' };

export default function LoginScreen() {
  const { requestOTP, verifyOTP, quickLogin, requestOTPLoading, verifyOTPLoading, quickLoginLoading, requestOTPError, verifyOTPError, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { config, clearSchool } = useSchool();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const bgScale = useRef(new Animated.Value(1)).current;
  const bgTranslateX = useRef(new Animated.Value(0)).current;
  const bgTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
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
  }, [fadeIn, slideUp, bgScale, bgTranslateX, bgTranslateY]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleRequestOTP = () => {
    if (!email || !email.includes('@')) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    requestOTP(email, {
      onSuccess: () => {
        setStep('otp');
        setResendTimer(60);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      },
    });
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (newOtp.every(digit => digit !== '') && newOtp.length === 6) {
      const code = newOtp.join('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      verifyOTP({ email, code });
    }
  };

  const handleOTPKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    requestOTP(email, { onSuccess: () => setResendTimer(60) });
  };

  const handleQRScan = (data: string) => {
    if (scanned) return;
    console.log('[Login] QR scanned:', data);
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    quickLogin(data, {
      onSuccess: () => setShowQRScanner(false),
      onError: () => {
        setShowQRScanner(false);
        setTimeout(() => setScanned(false), 1000);
      },
    });
  };

  const openQRScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowQRScanner(true);
    setScanned(false);
  };

  const schoolName = config?.branding?.schoolName || 'TFX';

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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cogRow}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={styles.cogButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  clearSchool();
                }}
                activeOpacity={0.7}
              >
                <Settings size={20} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>
            <View style={styles.header}>
              <View style={styles.logoRow}>
                <View style={styles.logoWrapper}>
                  <Image source={LOGO_URL} style={styles.logo} contentFit="contain" />
                </View>
                <Text style={styles.welcomeSchool}>{schoolName}</Text>
              </View>
            </View>

            <Animated.View style={[styles.card, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
              {step === 'email' ? (
                <>
                  <Text style={styles.cardTitle}>{t('login.welcomeTitle')}</Text>
                  <Text style={styles.cardSubtitle}>{t('login.welcomeSubtitle')}</Text>

                  <TouchableOpacity style={styles.qrButton} onPress={openQRScanner} activeOpacity={0.85}>
                    <LinearGradient
                      colors={[TFX.teal, TFX.tealDark]}
                      style={styles.qrButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <QrCode size={24} color="#fff" strokeWidth={2.5} />
                      <Text style={styles.qrButtonText}>{t('login.quickLogin')}</Text>
                      <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>ELLER</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <Text style={styles.label}>{t('login.emailLabel')}</Text>
                  <View style={[styles.inputWrapper, requestOTPError && styles.inputWrapperError]}>
                    <Mail size={20} color={TFX.slate} />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder={t('login.emailPlaceholder')}
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      editable={!requestOTPLoading}
                    />
                  </View>

                  {requestOTPError && (
                    <View style={styles.errorContainer}>
                      <AlertCircle size={16} color={TFX.danger} />
                      <Text style={styles.errorText}>
                        {requestOTPError instanceof Error ? requestOTPError.message : t('login.failedOTP')}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.primaryButton, (!email || requestOTPLoading) && styles.primaryButtonDisabled]}
                    onPress={handleRequestOTP}
                    disabled={!email || requestOTPLoading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[TFX.blue, TFX.blueDark]}
                      style={styles.primaryButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {requestOTPLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryButtonText}>{t('login.sendOTP')}</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.cardTitle}>{t('login.otpTitle')}</Text>
                  <Text style={styles.cardSubtitle}>{`${t('login.otpSubtitle')} ${email}`}</Text>

                  <View style={styles.otpContainer}>
                    {otpCode.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => { otpRefs.current[index] = ref; }}
                        style={[
                          styles.otpInput,
                          digit && styles.otpInputFilled,
                          verifyOTPError && styles.otpInputError,
                        ]}
                        value={digit}
                        onChangeText={(value) => handleOTPChange(index, value)}
                        onKeyPress={({ nativeEvent: { key } }) => handleOTPKeyPress(index, key)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        editable={!verifyOTPLoading}
                      />
                    ))}
                  </View>

                  {verifyOTPError && (
                    <View style={styles.errorContainer}>
                      <AlertCircle size={16} color={TFX.danger} />
                      <Text style={styles.errorText}>
                        {verifyOTPError instanceof Error ? verifyOTPError.message : t('login.invalidOTP')}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.resendButton, resendTimer > 0 && styles.resendButtonDisabled]}
                    onPress={handleResend}
                    disabled={resendTimer > 0}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
                      {resendTimer > 0 ? t('login.resendTimer', { seconds: resendTimer }) : t('login.resendOTP')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => { setStep('email'); setOtpCode(['', '', '', '', '', '']); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.backText}>{t('login.changeEmail')}</Text>
                  </TouchableOpacity>

                  {verifyOTPLoading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color={TFX.blue} />
                      <Text style={styles.loadingText}>{t('login.verifying')}</Text>
                    </View>
                  )}
                </>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={showQRScanner} animationType="slide" onRequestClose={() => setShowQRScanner(false)}>
        <View style={styles.qrModal}>
          <SafeAreaView style={styles.qrSafeArea} edges={['top']}>
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>{t('login.quickLogin')}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowQRScanner(false)} activeOpacity={0.7}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => { if (!scanned) handleQRScan(data); }}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.scanInstructions}>{t('login.scanInstructions')}</Text>
            </View>
          </CameraView>
          {quickLoginLoading && (
            <View style={styles.scanLoadingOverlay}>
              <View style={styles.scanLoadingBox}>
                <Check size={48} color={TFX.green} strokeWidth={3} />
                <Text style={styles.scanLoadingText}>{t('login.loggingIn')}</Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
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
    height: 300,
    overflow: 'hidden',
  },
  headerBgImage: {
    position: 'absolute',
    top: -40,
    left: -40,
    right: -40,
    bottom: -40,
    width: width + 80,
    height: 380,
    opacity: 0.28,
  },
  headerBgOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  cogRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  cogButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 22,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoWrapper: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 64,
    height: 64,
  },
  welcomeSchool: {
    fontSize: Math.min(width * 0.055, 24),
    fontWeight: '700' as const,
    fontFamily,
    color: '#fff',
    textAlign: 'left' as const,
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
    fontSize: 24,
    fontWeight: '700' as const,
    color: TFX.navy,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
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
    paddingHorizontal: 18,
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
    marginBottom: 16,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 13,
    color: TFX.danger,
    flex: 1,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    fontFamily,
    color: '#fff',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: TFX.grayMid,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700' as const,
    fontFamily,
    textAlign: 'center' as const,
    backgroundColor: TFX.grayLight,
    color: TFX.navy,
  },
  otpInputFilled: {
    borderColor: TFX.blue,
    backgroundColor: '#EFF6FF',
  },
  otpInputError: {
    borderColor: TFX.danger,
    backgroundColor: '#FEF2F2',
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '600' as const,
    fontFamily,
    color: TFX.orange,
  },
  resendTextDisabled: {
    color: TFX.slate,
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backText: {
    fontSize: 15,
    color: TFX.slate,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily,
    color: TFX.navy,
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
  scanLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLoadingBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  scanLoadingText: {
    fontSize: 18,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.navy,
  },
});
