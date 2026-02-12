import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { School, RefreshCw, ExternalLink, AlertCircle, LogOut, Bell, Wifi, Cloud, Shield, Globe } from 'lucide-react-native';
import { useSchool } from '@/contexts/school-context';
import { useAuth } from '@/contexts/auth-context';
import { useAppConfig } from '@/contexts/app-config-context';
import { useTheme } from '@/contexts/theme-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { TFX } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import { getLastSyncTime, getPendingCount, executeSyncToServer } from '@/services/sync-service';
import { getPushPermissionStatus, requestPushPermissions, getPushPreferences, savePushPreferences } from '@/services/push-service';
import { useTranslation } from 'react-i18next';

const FALLBACK_LOGO = require('@/assets/images/tfx-logo.png');

export default function SettingsScreen() {
  const { config, clearSchool, refetch } = useSchool();
  const { logout, accessToken } = useAuth();
  const { colors, branding } = useTheme();
  const { t, i18n } = useTranslation();
  const {
    settings: appSettings,
    isAppEnabled,
    isMaintenanceMode,
    appVersion,
    updateAvailable,
    storeUrl,
    refetchConfig,
  } = useAppConfig();

  const [lastSync, setLastSync] = useState<string | null>(null);
  const [pendingOps, setPendingOps] = useState(0);
  const [pushStatus, setPushStatus] = useState<string>('unknown');
  const [isSyncing, setIsSyncing] = useState(false);
  const [pushPrefs, setPushPrefs] = useState({
    bookingReminders: true,
    lessonAvailable: true,
    paymentReminders: true,
    adminBroadcast: true,
  });
  const currentLang = i18n.language || 'sv';

  useEffect(() => {
    loadSyncInfo();
    loadPushStatus();
    loadPushPrefs();
  }, []);

  const loadPushPrefs = async () => {
    const prefs = await getPushPreferences();
    if (prefs) setPushPrefs(prefs);
  };

  const togglePushPref = async (key: keyof typeof pushPrefs) => {
    const updated = { ...pushPrefs, [key]: !pushPrefs[key] };
    setPushPrefs(updated);
    await savePushPreferences(updated);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  useEffect(() => {
    loadSyncInfo();
    loadPushStatus();
  }, []);

  const loadSyncInfo = async () => {
    const syncTime = await getLastSyncTime();
    setLastSync(syncTime);
    const pending = await getPendingCount();
    setPendingOps(pending);
  };

  const loadPushStatus = async () => {
    const status = await getPushPermissionStatus();
    setPushStatus(status);
  };

  const handleManualSync = async () => {
    if (!config || !accessToken) return;
    setIsSyncing(true);
    try {
      const result = await executeSyncToServer(config.apiBaseUrl, accessToken);
      if (result.success) {
        Alert.alert('Synkronisering klar', `${result.processed} operationer synkade`);
      } else {
        Alert.alert('Synkfel', 'Kunde inte synka. Försök igen.');
      }
      await loadSyncInfo();
    } catch {
      Alert.alert('Fel', 'Synkronisering misslyckades');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEnablePush = async () => {
    const result = await requestPushPermissions();
    if (result.granted) {
      setPushStatus('granted');
      Alert.alert('Push aktiverat', 'Du får nu push-notiser');
    } else {
      setPushStatus('denied');
      Alert.alert('Push nekad', 'Aktivera push-notiser i systeminställningar');
    }
  };

  const handleChangeSchool = () => {
    Alert.alert(
      'Byt skola',
      'Är du säker på att du vill byta körskola? Du kommer behöva ange skoldomänen igen.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Byt',
          style: 'destructive',
          onPress: () => {
            clearSchool();
            router.replace('/school-setup');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logga ut',
      'Är du säker på att du vill logga ut?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Logga ut',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const handleRefreshConfig = async () => {
    const result = await refetch();
    if (result.isSuccess) {
      Alert.alert('Klart', 'Skolkonfigurationen har uppdaterats');
    } else {
      Alert.alert('Fel', 'Kunde inte uppdatera konfigurationen. Försök igen.');
    }
  };

  const openNativeSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {config && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ANSLUTEN SKOLA</Text>
            <View style={styles.schoolCard}>
              <View style={styles.schoolCardHeader}>
                <View style={styles.tfxLogoBox}>
                  <Image
                    source={branding.logo ? { uri: branding.logo } : FALLBACK_LOGO}
                    style={styles.tfxLogo}
                    contentFit="contain"
                  />
                </View>
              </View>
              <Text style={styles.schoolName}>{config.branding.schoolName}</Text>
              <Text style={styles.schoolDomain}>{config.domain}</Text>
              {config.branding.tagline && (
                <Text style={styles.schoolTagline}>{config.branding.tagline}</Text>
              )}
            </View>
          </View>
        )}

        {config?.theme && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TEMA</Text>
            <View style={styles.themeCard}>
              <View style={styles.themeRow}>
                <View style={styles.themeItem}>
                  <View style={[styles.colorDot, { backgroundColor: config.theme.primaryColor }]} />
                  <Text style={styles.colorLabel}>Primär</Text>
                </View>
                <View style={styles.themeItem}>
                  <View style={[styles.colorDot, { backgroundColor: config.theme.secondaryColor }]} />
                  <Text style={styles.colorLabel}>Sekundär</Text>
                </View>
                <View style={styles.themeItem}>
                  <View style={[styles.colorDot, { backgroundColor: config.theme.accentColor }]} />
                  <Text style={styles.colorLabel}>Accent</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HANTERA</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleRefreshConfig} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
              <RefreshCw size={20} color={TFX.blue} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Uppdatera konfiguration</Text>
              <Text style={styles.menuDesc}>Hämta tema och branding från skolan</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleChangeSchool} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#FFF7ED' }]}>
              <School size={20} color={TFX.orange} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Byt skola</Text>
              <Text style={styles.menuDesc}>Anslut till en annan körskola</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={openNativeSettings} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
              <ExternalLink size={20} color={TFX.green} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Systeminställningar</Text>
              <Text style={styles.menuDesc}>Behörigheter och appdata</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#FEF2F2' }]}>
              <LogOut size={20} color={TFX.danger} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: TFX.danger }]}>Logga ut</Text>
              <Text style={styles.menuDesc}>Avsluta din session</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Status Section */}
        {appSettings && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>APPSTATUS</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>App</Text>
                <View style={[styles.statusBadge, { backgroundColor: isAppEnabled ? '#DCFCE7' : '#FEE2E2' }]}>
                  <Text style={[styles.statusBadgeText, { color: isAppEnabled ? '#16A34A' : '#DC2626' }]}>
                    {isAppEnabled ? 'Aktiv' : 'Inaktiv'}
                  </Text>
                </View>
              </View>
              {isMaintenanceMode && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Underhållsläge</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#D97706' }]}>Aktivt</Text>
                  </View>
                </View>
              )}
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Version</Text>
                <Text style={styles.statusValue}>v{appVersion}</Text>
              </View>
              {updateAvailable && (
                <TouchableOpacity
                  style={styles.updateBanner}
                  onPress={() => storeUrl && Linking.openURL(storeUrl)}
                >
                  <Text style={styles.updateText}>📲 Ny version tillgänglig</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Push Notifications Section */}
        {appSettings?.pushNotificationsEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PUSH-NOTISER</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={styles.statusRowLeft}>
                  <Bell size={16} color={TFX.blue} />
                  <Text style={styles.statusLabel}>Push-notiser</Text>
                </View>
                <View style={[styles.statusBadge, {
                  backgroundColor: pushStatus === 'granted' ? '#DCFCE7' : '#FEE2E2',
                }]}>
                  <Text style={[styles.statusBadgeText, {
                    color: pushStatus === 'granted' ? '#16A34A' : '#DC2626',
                  }]}>
                    {pushStatus === 'granted' ? 'Aktivt' : pushStatus === 'denied' ? 'Nekad' : 'Ej konfigurerat'}
                  </Text>
                </View>
              </View>

              {pushStatus !== 'granted' && (
                <TouchableOpacity style={styles.actionButton} onPress={handleEnablePush}>
                  <Text style={styles.actionButtonText}>Aktivera push-notiser</Text>
                </TouchableOpacity>
              )}

              {pushStatus === 'granted' && (
                <>
                  <View style={styles.featureRow}>
                    <Text style={styles.featureLabel}>Bokningspåminnelser</Text>
                    <Switch
                      value={pushPrefs.bookingReminders}
                      onValueChange={() => togglePushPref('bookingReminders')}
                      trackColor={{ false: TFX.grayMid, true: TFX.blue + '60' }}
                      thumbColor={pushPrefs.bookingReminders ? TFX.blue : '#f4f3f4'}
                    />
                  </View>
                  <View style={styles.featureRow}>
                    <Text style={styles.featureLabel}>Ny lektion</Text>
                    <Switch
                      value={pushPrefs.lessonAvailable}
                      onValueChange={() => togglePushPref('lessonAvailable')}
                      trackColor={{ false: TFX.grayMid, true: TFX.blue + '60' }}
                      thumbColor={pushPrefs.lessonAvailable ? TFX.blue : '#f4f3f4'}
                    />
                  </View>
                  <View style={styles.featureRow}>
                    <Text style={styles.featureLabel}>Betalningspåminnelser</Text>
                    <Switch
                      value={pushPrefs.paymentReminders}
                      onValueChange={() => togglePushPref('paymentReminders')}
                      trackColor={{ false: TFX.grayMid, true: TFX.blue + '60' }}
                      thumbColor={pushPrefs.paymentReminders ? TFX.blue : '#f4f3f4'}
                    />
                  </View>
                  <View style={styles.featureRow}>
                    <Text style={styles.featureLabel}>Meddelanden från skolan</Text>
                    <Switch
                      value={pushPrefs.adminBroadcast}
                      onValueChange={() => togglePushPref('adminBroadcast')}
                      trackColor={{ false: TFX.grayMid, true: TFX.blue + '60' }}
                      thumbColor={pushPrefs.adminBroadcast ? TFX.blue : '#f4f3f4'}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Sync Section */}
        {appSettings?.featureOfflineMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SYNKRONISERING</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={styles.statusRowLeft}>
                  <Cloud size={16} color={TFX.teal} />
                  <Text style={styles.statusLabel}>Synkintervall</Text>
                </View>
                <Text style={styles.statusValue}>{appSettings.syncIntervalMinutes} min</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Senaste synk</Text>
                <Text style={styles.statusValue}>
                  {lastSync ? new Date(lastSync).toLocaleString('sv-SE') : 'Aldrig'}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Väntande operationer</Text>
                <Text style={styles.statusValue}>{pendingOps}</Text>
              </View>
              <View style={styles.featureRow}>
                <Text style={styles.featureLabel}>Offline-retention</Text>
                <Text style={styles.featureValue}>{appSettings.offlineRetentionDays} dagar</Text>
              </View>
              <View style={styles.featureRow}>
                <Text style={styles.featureLabel}>Max offline-bokningar</Text>
                <Text style={styles.featureValue}>{appSettings.maxOfflineBookings}</Text>
              </View>
              {pendingOps > 0 && (
                <TouchableOpacity
                  style={[styles.actionButton, isSyncing && { opacity: 0.6 }]}
                  onPress={handleManualSync}
                  disabled={isSyncing}
                >
                  <Text style={styles.actionButtonText}>
                    {isSyncing ? 'Synkar...' : 'Synka nu'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Enabled Features Section */}
        {appSettings && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AKTIVERADE FUNKTIONER</Text>
            <View style={styles.statusCard}>
              {[
                { label: 'Bokningar', enabled: appSettings.featureBookings },
                { label: 'LMS / Teori', enabled: appSettings.featureLms },
                { label: 'Quiz', enabled: appSettings.featureQuiz },
                { label: 'Certifikat', enabled: appSettings.featureCertificates },
                { label: 'Körklar', enabled: appSettings.featureKorklar },
                { label: 'Fakturor', enabled: appSettings.featureInvoices },
                { label: 'Profil', enabled: appSettings.featureProfile },
                { label: 'Offline-läge', enabled: appSettings.featureOfflineMode },
              ].map((feature) => (
                <View key={feature.label} style={styles.featureRow}>
                  <Text style={styles.featureLabel}>{feature.label}</Text>
                  <View style={[styles.featureDot, {
                    backgroundColor: feature.enabled ? TFX.green : TFX.grayMid,
                  }]} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SPRÅK</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusRowLeft}>
                <Globe size={16} color={TFX.teal} />
                <Text style={styles.statusLabel}>Appspråk</Text>
              </View>
            </View>
            {[
              { code: 'sv', label: 'Svenska' },
              { code: 'en', label: 'English' },
              { code: 'ar', label: 'العربية' },
            ].map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.featureRow}
                onPress={() => changeLanguage(lang.code)}
              >
                <Text style={[styles.featureLabel, currentLang === lang.code && { fontWeight: '700', color: TFX.blue }]}>
                  {lang.label}
                </Text>
                {currentLang === lang.code && (
                  <View style={[styles.featureDot, { backgroundColor: TFX.blue }]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <AlertCircle size={16} color={TFX.slate} />
          <Text style={styles.footerText}>
            Appens tema och branding styrs av din körskola. Kontakta skolan om du upplever problem.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TFX.grayLight,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.slate,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  schoolCard: {
    backgroundColor: TFX.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  schoolCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  tfxLogoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: TFX.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tfxLogo: {
    width: 36,
    height: 36,
  },
  schoolLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  schoolName: {
    fontSize: 20,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.navy,
    marginBottom: 4,
  },
  schoolDomain: {
    fontSize: 13,
    color: TFX.slate,
    marginBottom: 6,
  },
  schoolTagline: {
    fontSize: 13,
    color: TFX.slate,
    fontStyle: 'italic' as const,
    textAlign: 'center',
  },
  themeCard: {
    backgroundColor: TFX.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  themeItem: {
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: TFX.grayMid,
  },
  colorLabel: {
    fontSize: 12,
    color: TFX.slate,
    fontWeight: '500' as const,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TFX.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    fontFamily,
    color: TFX.navy,
    marginBottom: 2,
  },
  menuDesc: {
    fontSize: 12,
    color: TFX.slate,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: TFX.white,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 24,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: TFX.slate,
    lineHeight: 17,
  },
  // ─── App Status & Feature Styles ─────────────────────
  statusCard: {
    backgroundColor: TFX.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TFX.grayMid,
  },
  statusRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: TFX.navy,
    fontWeight: '500' as const,
    fontFamily,
  },
  statusValue: {
    fontSize: 14,
    color: TFX.slate,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily,
  },
  updateBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  updateText: {
    fontSize: 14,
    color: TFX.blue,
    fontWeight: '600' as const,
    fontFamily,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TFX.grayMid,
  },
  featureLabel: {
    fontSize: 14,
    color: TFX.navy,
    fontFamily,
  },
  featureValue: {
    fontSize: 14,
    color: TFX.slate,
    fontWeight: '500' as const,
  },
  featureDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionButton: {
    backgroundColor: TFX.blue,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: TFX.white,
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily,
  },
});
