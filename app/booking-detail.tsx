/**
 * Booking Detail Screen
 *
 * Full booking info with cancel support.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  XCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { useSchool } from '@/contexts/school-context';
import { useTheme } from '@/contexts/theme-context';
import { fetchBookings, cancelBooking } from '@/services/mobile-api';

export default function BookingDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { config } = useSchool();
  const { colors } = useTheme();

  const bookingsQuery = useQuery({
    queryKey: ['bookings'],
    queryFn: () => fetchBookings(config!.apiBaseUrl, accessToken ?? undefined),
    enabled: !!config?.apiBaseUrl && !!accessToken,
  });

  const booking = (bookingsQuery.data?.data?.bookings ?? []).find(
    (b: any) => b.id === bookingId,
  ) as any;

  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(config!.apiBaseUrl, bookingId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      Alert.alert('Avbokad', 'Din bokning har avbokats.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      Alert.alert('Fel', error.message || 'Kunde inte avboka');
    },
  });

  const handleCancel = () => {
    Alert.alert(
      'Avboka',
      'Är du säker på att du vill avboka denna lektion?',
      [
        { text: 'Nej', style: 'cancel' },
        {
          text: 'Ja, avboka',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(),
        },
      ],
    );
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('sv-SE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('sv-SE', {
    hour: '2-digit', minute: '2-digit',
  });

  const isFuture = booking?.startTime ? new Date(booking.startTime) > new Date() : false;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Bokningsdetaljer</Text>
        <View style={{ width: 24 }} />
      </View>

      {!booking ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.slate }]}>Bokning kunde inte hittas</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Status Badge */}
          <View style={[styles.statusBadge, {
            backgroundColor: booking.status === 'confirmed' ? colors.success + '20' :
              booking.status === 'cancelled' ? colors.error + '20' : colors.warning + '20',
          }]}>
            <Text style={[styles.statusText, {
              color: booking.status === 'confirmed' ? colors.success :
                booking.status === 'cancelled' ? colors.error : colors.warning,
            }]}>
              {booking.status === 'confirmed' ? 'Bekräftad' :
                booking.status === 'cancelled' ? 'Avbokad' :
                  booking.status === 'pending' ? 'Väntande' : booking.status}
            </Text>
          </View>

          {/* Type */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grayMid }]}>
            <Text style={[styles.bookingType, { color: colors.text }]}>
              {booking.type || booking.lessonType || 'Lektion'}
            </Text>
          </View>

          {/* Details */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grayMid }]}>
            {booking.startTime && (
              <View style={styles.detailRow}>
                <Calendar size={18} color={colors.primary} />
                <View>
                  <Text style={[styles.detailLabel, { color: colors.slate }]}>Datum</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(booking.startTime)}
                  </Text>
                </View>
              </View>
            )}
            {booking.startTime && (
              <View style={styles.detailRow}>
                <Clock size={18} color={colors.primary} />
                <View>
                  <Text style={[styles.detailLabel, { color: colors.slate }]}>Tid</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatTime(booking.startTime)}
                    {booking.endTime ? ` – ${formatTime(booking.endTime)}` : ''}
                  </Text>
                </View>
              </View>
            )}
            {booking.instructor && (
              <View style={styles.detailRow}>
                <User size={18} color={colors.primary} />
                <View>
                  <Text style={[styles.detailLabel, { color: colors.slate }]}>Lärare</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {booking.instructor.name}
                  </Text>
                </View>
              </View>
            )}
            {booking.location && (
              <View style={styles.detailRow}>
                <MapPin size={18} color={colors.primary} />
                <View>
                  <Text style={[styles.detailLabel, { color: colors.slate }]}>Plats</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {booking.location}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Cancel Button */}
          {isFuture && booking.status !== 'cancelled' && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.error }]}
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <>
                  <XCircle size={18} color={colors.error} />
                  <Text style={[styles.cancelButtonText, { color: colors.error }]}>Avboka</Text>
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
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusText: { fontSize: 15, fontWeight: '600' },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  bookingType: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },
});
