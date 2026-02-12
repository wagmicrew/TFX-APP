/**
 * UserAvatarMenu
 *
 * Touchable avatar displayed in the hero section.
 * Shows a dropdown/modal with:
 *  - User profile details (name, email)
 *  - Edit profile fields (firstName, lastName, phone)
 *  - Avatar upload via camera or gallery
 *  - Logout button
 *
 * Fetches profile from GET /api/mobile/student/profile.
 * Saves edits via PUT /api/mobile/student/profile.
 * Uploads avatar via POST /api/mobile/student/avatar.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  User,
  Camera,
  ImageIcon,
  X,
  LogOut,
  Edit3,
  Check,
  Mail,
  Phone,
  Trash2,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useSchool } from '@/contexts/school-context';
import { TFX } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import {
  fetchStudentProfile,
  updateStudentProfile,
  uploadStudentAvatar,
  deleteStudentAvatar,
} from '@/services/mobile-api';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  profileImageUrl?: string;
}

export default function UserAvatarMenu() {
  const { user, isAuthenticated, accessToken, logout } = useAuth();
  const { config } = useSchool();
  const queryClient = useQueryClient();

  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // ─── Fetch full profile ─────────────────────────────────────────────────

  const profileQuery = useQuery({
    queryKey: ['studentProfile', config?.apiBaseUrl],
    queryFn: async () => {
      if (!config?.apiBaseUrl) throw new Error('No API URL');
      const result = await fetchStudentProfile(config.apiBaseUrl);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load profile');
      }
      return result.data as UserProfile;
    },
    enabled: !!config?.apiBaseUrl && isAuthenticated === true,
    staleTime: 1000 * 60 * 5,
  });

  const profile = profileQuery.data;
  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : user
      ? `${user.firstName} ${user.lastName}`
      : '';
  const displayEmail = profile?.email ?? user?.email ?? '';
  const avatarUrl = profile?.profileImageUrl ?? null;

  // ─── Update profile mutation ────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async (updates: { firstName?: string; lastName?: string; phone?: string }) => {
      if (!config?.apiBaseUrl) throw new Error('No API URL');
      const result = await updateStudentProfile(config.apiBaseUrl, updates);
      if (!result.success) throw new Error(result.error || 'Update failed');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
      setEditing(false);
      Alert.alert('Sparat', 'Dina uppgifter har uppdaterats.');
    },
    onError: (err: Error) => {
      Alert.alert('Fel', err.message);
    },
  });

  // ─── Avatar upload mutation ─────────────────────────────────────────────

  const avatarMutation = useMutation({
    mutationFn: async ({ uri, mimeType }: { uri: string; mimeType: string }) => {
      if (!config?.apiBaseUrl) throw new Error('No API URL');
      const result = await uploadStudentAvatar(config.apiBaseUrl, uri, mimeType);
      if (!result.success) throw new Error(result.error || 'Upload failed');
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
      Alert.alert('Klart', 'Din profilbild har uppdaterats.');
    },
    onError: (err: Error) => {
      Alert.alert('Fel', `Kunde inte ladda upp bilden: ${err.message}`);
    },
  });

  // ─── Avatar delete mutation ─────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!config?.apiBaseUrl) throw new Error('No API URL');
      const result = await deleteStudentAvatar(config.apiBaseUrl);
      if (!result.success) throw new Error(result.error || 'Delete failed');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
    },
  });

  // ─── Image picker helpers ──────────────────────────────────────────────

  const pickFromGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Behörighet', 'Appen behöver åtkomst till dina bilder.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      avatarMutation.mutate({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    }
  }, [avatarMutation]);

  const pickFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Behörighet', 'Appen behöver åtkomst till kameran.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      avatarMutation.mutate({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    }
  }, [avatarMutation]);

  const handleRemoveAvatar = useCallback(() => {
    Alert.alert('Ta bort profilbild', 'Vill du ta bort din profilbild?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  }, [deleteMutation]);

  // ─── Open / Close ──────────────────────────────────────────────────────

  const open = useCallback(() => {
    setVisible(true);
    if (profile) {
      setEditFields({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone ?? '',
      });
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 9 }),
    ]).start();
  }, [fadeAnim, scaleAnim, profile]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setEditing(false);
    });
  }, [fadeAnim, scaleAnim]);

  // ─── Save edits ────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    const updates: Record<string, string> = {};
    if (editFields.firstName !== profile?.firstName) updates.firstName = editFields.firstName;
    if (editFields.lastName !== profile?.lastName) updates.lastName = editFields.lastName;
    if (editFields.phone !== (profile?.phone ?? '')) updates.phone = editFields.phone;

    if (Object.keys(updates).length === 0) {
      setEditing(false);
      return;
    }
    updateMutation.mutate(updates);
  }, [editFields, profile, updateMutation]);

  // ─── Logout ─────────────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    Alert.alert('Logga ut', 'Är du säker på att du vill logga ut?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Logga ut',
        style: 'destructive',
        onPress: () => {
          close();
          setTimeout(() => logout(), 300);
        },
      },
    ]);
  }, [close, logout]);

  // ─── Avatar image picker action sheet ──────────────────────────────────

  const showImageOptions = useCallback(() => {
    Alert.alert('Profilbild', 'Välj källa', [
      { text: 'Kamera', onPress: pickFromCamera },
      { text: 'Bildbibliotek', onPress: pickFromGallery },
      ...(avatarUrl ? [{ text: 'Ta bort bild', style: 'destructive' as const, onPress: handleRemoveAvatar }] : []),
      { text: 'Avbryt', style: 'cancel' as const },
    ]);
  }, [pickFromCamera, pickFromGallery, handleRemoveAvatar, avatarUrl]);

  // ─── Render avatar button ─────────────────────────────────────────────

  const isUploading = avatarMutation.isPending;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Touchable avatar circle */}
      <TouchableOpacity
        style={styles.avatarButton}
        onPress={open}
        activeOpacity={0.7}
        testID="user-avatar-btn"
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatarImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>
              {(user?.firstName?.[0] ?? '').toUpperCase()}
              {(user?.lastName?.[0] ?? '').toUpperCase()}
            </Text>
          </View>
        )}
        {isUploading && (
          <View style={styles.avatarLoading}>
            <ActivityIndicator size="small" color={TFX.white} />
          </View>
        )}
      </TouchableOpacity>

      {/* Full-screen modal */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={close}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
            <Animated.View style={[styles.sheet, { transform: [{ scale: scaleAnim }] }]}>
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Header */}
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Min profil</Text>
                  <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={22} color={TFX.slate} />
                  </TouchableOpacity>
                </View>

                {/* Avatar section */}
                <View style={styles.avatarSection}>
                  <TouchableOpacity onPress={showImageOptions} activeOpacity={0.7}>
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={styles.sheetAvatar}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={[styles.sheetAvatar, styles.sheetAvatarPlaceholder]}>
                        <User size={36} color={TFX.slate} />
                      </View>
                    )}
                    <View style={styles.cameraBadge}>
                      <Camera size={14} color={TFX.white} />
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.avatarHint}>Tryck för att ändra bild</Text>
                </View>

                {/* Profile loading */}
                {profileQuery.isLoading && (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator color={TFX.blue} />
                    <Text style={styles.loadingText}>Laddar profil...</Text>
                  </View>
                )}

                {/* Profile error */}
                {profileQuery.isError && (
                  <View style={styles.errorWrap}>
                    <Text style={styles.errorText}>
                      Kunde inte ladda profilen. Kontrollera anslutningen.
                    </Text>
                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={() => profileQuery.refetch()}
                    >
                      <Text style={styles.retryBtnText}>Försök igen</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Profile details */}
                {(profile || user) && !profileQuery.isLoading && (
                  <View style={styles.detailsSection}>
                    {!editing ? (
                      <>
                        <DetailRow icon={<User size={16} color={TFX.blue} />} label="Namn" value={displayName} />
                        <DetailRow icon={<Mail size={16} color={TFX.blue} />} label="E-post" value={displayEmail} />
                        {profile?.phone && (
                          <DetailRow icon={<Phone size={16} color={TFX.blue} />} label="Telefon" value={profile.phone} />
                        )}

                        <TouchableOpacity style={styles.editBtn} onPress={() => {
                          if (profile) {
                            setEditFields({
                              firstName: profile.firstName,
                              lastName: profile.lastName,
                              phone: profile.phone ?? '',
                            });
                          }
                          setEditing(true);
                        }}>
                          <Edit3 size={16} color={TFX.blue} />
                          <Text style={styles.editBtnText}>Redigera uppgifter</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <EditField
                          label="Förnamn"
                          value={editFields.firstName}
                          onChangeText={(t) => setEditFields(f => ({ ...f, firstName: t }))}
                        />
                        <EditField
                          label="Efternamn"
                          value={editFields.lastName}
                          onChangeText={(t) => setEditFields(f => ({ ...f, lastName: t }))}
                        />
                        <EditField
                          label="Telefon"
                          value={editFields.phone}
                          onChangeText={(t) => setEditFields(f => ({ ...f, phone: t }))}
                          keyboardType="phone-pad"
                        />
                        <View style={styles.editActions}>
                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => setEditing(false)}
                          >
                            <Text style={styles.cancelBtnText}>Avbryt</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.saveBtn, updateMutation.isPending && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? (
                              <ActivityIndicator size="small" color={TFX.white} />
                            ) : (
                              <>
                                <Check size={16} color={TFX.white} />
                                <Text style={styles.saveBtnText}>Spara</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                )}

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <LogOut size={18} color={TFX.danger} />
                  <Text style={styles.logoutBtnText}>Logga ut</Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      {icon}
      <View style={styles.detailCol}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function EditField({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}) {
  return (
    <View style={styles.editFieldWrap}>
      <Text style={styles.editFieldLabel}>{label}</Text>
      <TextInput
        style={styles.editFieldInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="words"
        placeholderTextColor={TFX.grayMid}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Avatar button (hero bar)
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: TFX.white,
    fontSize: 13,
    fontWeight: '700',
    fontFamily,
  },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: '88%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: TFX.white,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily,
    color: TFX.navy,
  },

  // Avatar in modal
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
  },
  sheetAvatarPlaceholder: {
    backgroundColor: TFX.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: TFX.grayMid,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TFX.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: TFX.white,
  },
  avatarHint: {
    fontSize: 12,
    color: TFX.slate,
    marginTop: 8,
  },

  // Loading & error
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: TFX.slate,
  },
  errorWrap: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: TFX.danger,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: TFX.blue,
    borderRadius: 8,
  },
  retryBtnText: {
    color: TFX.white,
    fontSize: 13,
    fontWeight: '600',
    fontFamily,
  },

  // Detail rows
  detailsSection: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: TFX.grayLight,
    gap: 12,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: TFX.slate,
    fontWeight: '600',
    fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: TFX.navy,
    fontWeight: '500',
    fontFamily,
    marginTop: 2,
  },

  // Edit button
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  editBtnText: {
    fontSize: 14,
    color: TFX.blue,
    fontWeight: '600',
    fontFamily,
  },

  // Edit fields
  editFieldWrap: {
    marginBottom: 14,
  },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily,
    color: TFX.slate,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  editFieldInput: {
    backgroundColor: TFX.grayLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily,
    color: TFX.navy,
    borderWidth: 1,
    borderColor: TFX.grayMid,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: TFX.grayLight,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily,
    color: TFX.slate,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TFX.blue,
    gap: 6,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily,
    color: TFX.white,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: TFX.grayLight,
    marginTop: 4,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily,
    color: TFX.danger,
  },
});
