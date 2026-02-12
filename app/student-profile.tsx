/**
 * Student Profile Detail Screen
 *
 * Full profile display with edit mode.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  BookOpen,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { useSchool } from '@/contexts/school-context';
import { useTheme } from '@/contexts/theme-context';
import { fetchStudentProfile, updateStudentProfile } from '@/services/mobile-api';

export default function StudentProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { config } = useSchool();
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
  });

  const profileQuery = useQuery({
    queryKey: ['studentProfile'],
    queryFn: () => fetchStudentProfile(config!.apiBaseUrl, accessToken ?? undefined),
    enabled: !!config?.apiBaseUrl && !!accessToken,
  });

  const profile = profileQuery.data?.data;

  useEffect(() => {
    if (profile) {
      setEditData({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: () => updateStudentProfile(config!.apiBaseUrl, editData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
      setIsEditing(false);
      Alert.alert('Sparad', 'Din profil har uppdaterats.');
    },
    onError: (error) => {
      Alert.alert('Fel', error.message || 'Kunde inte uppdatera profilen');
    },
  });

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('sv-SE');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Min profil</Text>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Edit3 size={22} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(false)}>
            <X size={22} color={colors.slate} />
          </TouchableOpacity>
        )}
      </View>

      {profileQuery.isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      ) : !profile ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.slate }]}>Profil kunde inte laddas</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Name */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grayMid }]}>
            <View style={styles.fieldRow}>
              <User size={18} color={colors.primary} />
              <View style={styles.fieldContent}>
                <Text style={[styles.fieldLabel, { color: colors.slate }]}>Förnamn</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.grayMid }]}
                    value={editData.firstName}
                    onChangeText={(v) => setEditData({ ...editData, firstName: v })}
                  />
                ) : (
                  <Text style={[styles.fieldValue, { color: colors.text }]}>{profile.firstName}</Text>
                )}
              </View>
            </View>
            <View style={styles.fieldRow}>
              <User size={18} color="transparent" />
              <View style={styles.fieldContent}>
                <Text style={[styles.fieldLabel, { color: colors.slate }]}>Efternamn</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.grayMid }]}
                    value={editData.lastName}
                    onChangeText={(v) => setEditData({ ...editData, lastName: v })}
                  />
                ) : (
                  <Text style={[styles.fieldValue, { color: colors.text }]}>{profile.lastName}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Contact */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grayMid }]}>
            <View style={styles.fieldRow}>
              <Mail size={18} color={colors.primary} />
              <View style={styles.fieldContent}>
                <Text style={[styles.fieldLabel, { color: colors.slate }]}>E-post</Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>{profile.email}</Text>
              </View>
            </View>
            <View style={styles.fieldRow}>
              <Phone size={18} color={colors.primary} />
              <View style={styles.fieldContent}>
                <Text style={[styles.fieldLabel, { color: colors.slate }]}>Telefon</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.grayMid }]}
                    value={editData.phone}
                    onChangeText={(v) => setEditData({ ...editData, phone: v })}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    {profile.phone || '–'}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.fieldRow}>
              <MapPin size={18} color={colors.primary} />
              <View style={styles.fieldContent}>
                <Text style={[styles.fieldLabel, { color: colors.slate }]}>Adress</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.grayMid }]}
                    value={editData.address}
                    onChangeText={(v) => setEditData({ ...editData, address: v })}
                  />
                ) : (
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    {profile.address || '–'}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Enrollment Info */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grayMid }]}>
            {profile.enrolledAt && (
              <View style={styles.fieldRow}>
                <Calendar size={18} color={colors.primary} />
                <View style={styles.fieldContent}>
                  <Text style={[styles.fieldLabel, { color: colors.slate }]}>Inskriven</Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    {formatDate(profile.enrolledAt)}
                  </Text>
                </View>
              </View>
            )}
            {profile.licenseType && (
              <View style={styles.fieldRow}>
                <Award size={18} color={colors.primary} />
                <View style={styles.fieldContent}>
                  <Text style={[styles.fieldLabel, { color: colors.slate }]}>Körkortsklass</Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]}>{profile.licenseType}</Text>
                </View>
              </View>
            )}
            {profile.instructor && (
              <View style={styles.fieldRow}>
                <User size={18} color={colors.primary} />
                <View style={styles.fieldContent}>
                  <Text style={[styles.fieldLabel, { color: colors.slate }]}>Lärare</Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]}>{profile.instructor.name}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Progress */}
          {profile.progress && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grayMid }]}>
              <View style={styles.fieldRow}>
                <BookOpen size={18} color={colors.primary} />
                <View style={styles.fieldContent}>
                  <Text style={[styles.fieldLabel, { color: colors.slate }]}>Lektioner</Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    {profile.progress.lessonsCompleted} / {profile.progress.totalLessons}
                  </Text>
                </View>
              </View>
              {profile.progress.examStatus && (
                <View style={styles.fieldRow}>
                  <Award size={18} color={colors.primary} />
                  <View style={styles.fieldContent}>
                    <Text style={[styles.fieldLabel, { color: colors.slate }]}>Provstatus</Text>
                    <Text style={[styles.fieldValue, { color: colors.text }]}>
                      {profile.progress.examStatus}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Credits */}
          {profile.credits && profile.credits.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grayMid }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Krediter</Text>
              {profile.credits.map((credit, index) => (
                <View key={index} style={styles.creditRow}>
                  <Text style={[styles.creditType, { color: colors.text }]}>{credit.type}</Text>
                  <Text style={[styles.creditAmount, { color: colors.primary }]}>
                    {credit.amount} kr
                  </Text>
                  <Text style={[styles.creditDate, { color: colors.slate }]}>
                    {formatDate(credit.date)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Save Button */}
          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Save size={18} color={colors.white} />
                  <Text style={styles.saveButtonText}>Spara ändringar</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 12 },
  fieldValue: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  creditType: { fontSize: 14, flex: 1 },
  creditAmount: { fontSize: 14, fontWeight: '600', marginRight: 12 },
  creditDate: { fontSize: 12 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },
});
