import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { School, RefreshCw, ExternalLink, AlertCircle, LogOut } from 'lucide-react-native';
import { useSchool } from '@/contexts/school-context';
import { useAuth } from '@/contexts/auth-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { TFX } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';

const LOGO_URL = { uri: 'https://r2-pub.rork.com/generated-images/84decd64-941d-4043-98e0-2e592fa65179.png' };

export default function SettingsScreen() {
  const { config, clearSchool, refetch } = useSchool();
  const { logout } = useAuth();

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
                  <Image source={LOGO_URL} style={styles.tfxLogo} contentFit="contain" />
                </View>
                {config.branding.logoUrl && (
                  <Image
                    source={{ uri: config.branding.logoUrl }}
                    style={styles.schoolLogo}
                    contentFit="contain"
                  />
                )}
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
});
