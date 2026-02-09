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
import { School, RefreshCw, ExternalLink, LogOut, Settings, ChevronRight, User } from 'lucide-react-native';
import { useSchool } from '@/contexts/school-context';
import { useAuth } from '@/contexts/auth-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { TFX } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';

const LOGO_URL = { uri: 'https://r2-pub.rork.com/generated-images/84decd64-941d-4043-98e0-2e592fa65179.png' };

export default function ProfileScreen() {
  const { config, clearSchool, refetch } = useSchool();
  const { user, logout } = useAuth();

  const handleChangeSchool = () => {
    Alert.alert(
      'Byt skola',
      'Är du säker på att du vill byta körskola?',
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
        { text: 'Logga ut', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const handleRefreshConfig = async () => {
    const result = await refetch();
    if (result.isSuccess) {
      Alert.alert('Klart', 'Konfigurationen har uppdaterats');
    } else {
      Alert.alert('Fel', 'Kunde inte uppdatera. Försök igen.');
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
    <View style={styles.root}>
      <LinearGradient
        colors={[TFX.blueDeep, TFX.navy]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <User size={36} color={TFX.blue} />
            </View>
            <Text style={styles.userName}>{user ? `${user.firstName} ${user.lastName}` : 'Student'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
            {config && (
              <View style={styles.schoolBadge}>
                <Image source={LOGO_URL} style={styles.badgeLogo} contentFit="contain" />
                <Text style={styles.schoolBadgeText}>{config.branding.schoolName}</Text>
              </View>
            )}
          </View>

          <View style={styles.body}>
            {config?.theme && (
              <View style={styles.themePreview}>
                <View style={[styles.colorDot, { backgroundColor: config.theme.primaryColor }]} />
                <View style={[styles.colorDot, { backgroundColor: config.theme.secondaryColor }]} />
                <View style={[styles.colorDot, { backgroundColor: config.theme.accentColor }]} />
                <Text style={styles.themeLabel}>Skoltema</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>INSTÄLLNINGAR</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleRefreshConfig} activeOpacity={0.7}>
              <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
                <RefreshCw size={20} color={TFX.blue} />
              </View>
              <Text style={styles.menuTitle}>Uppdatera konfiguration</Text>
              <ChevronRight size={18} color={TFX.slate} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleChangeSchool} activeOpacity={0.7}>
              <View style={[styles.menuIcon, { backgroundColor: '#FFF7ED' }]}>
                <School size={20} color={TFX.orange} />
              </View>
              <Text style={styles.menuTitle}>Byt skola</Text>
              <ChevronRight size={18} color={TFX.slate} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings')} activeOpacity={0.7}>
              <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
                <Settings size={20} color={TFX.green} />
              </View>
              <Text style={styles.menuTitle}>Alla inställningar</Text>
              <ChevronRight size={18} color={TFX.slate} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={openNativeSettings} activeOpacity={0.7}>
              <View style={[styles.menuIcon, { backgroundColor: '#F5F3FF' }]}>
                <ExternalLink size={20} color="#7C3AED" />
              </View>
              <Text style={styles.menuTitle}>Systeminställningar</Text>
              <ChevronRight size={18} color={TFX.slate} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleLogout} activeOpacity={0.7}>
              <View style={[styles.menuIcon, { backgroundColor: '#FEF2F2' }]}>
                <LogOut size={20} color={TFX.danger} />
              </View>
              <Text style={[styles.menuTitle, { color: TFX.danger }]}>Logga ut</Text>
              <ChevronRight size={18} color={TFX.danger} />
            </TouchableOpacity>

            <Text style={styles.versionText}>TFX v1.0.0</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TFX.grayLight,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 28,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700' as const,
    fontFamily,
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  schoolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  badgeLogo: {
    width: 20,
    height: 20,
  },
  schoolBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    fontFamily,
    color: 'rgba(255,255,255,0.9)',
  },
  body: {
    paddingHorizontal: 16,
  },
  themePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TFX.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: TFX.grayMid,
  },
  themeLabel: {
    fontSize: 13,
    color: TFX.slate,
    fontWeight: '500' as const,
    marginLeft: 'auto',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.slate,
    letterSpacing: 0.8,
    marginBottom: 10,
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
  menuItemDanger: {
    marginTop: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    fontFamily,
    color: TFX.navy,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: TFX.slate,
    marginTop: 24,
  },
});
