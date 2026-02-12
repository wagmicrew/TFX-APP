/**
 * Notifications Screen
 *
 * List of push notifications with mark-as-read support.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  Calendar,
  BookOpen,
  CreditCard,
  Megaphone,
  Info,
  LogOut,
  MessageCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { useSchool } from '@/contexts/school-context';
import { useTheme } from '@/contexts/theme-context';
import { fetchNotifications, markNotificationsRead, type PollNotification } from '@/services/mobile-api';

const TYPE_ICONS: Record<string, any> = {
  session_kicked: LogOut,
  admin_message: MessageCircle,
  booking_reminder: Calendar,
  booking_update: Calendar,
  lesson_available: BookOpen,
  payment_reminder: CreditCard,
  payment_update: CreditCard,
  admin_broadcast: Megaphone,
  system_update: Info,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { config } = useSchool();
  const { colors } = useTheme();

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(config!.apiBaseUrl, accessToken ?? undefined, { limit: 50 }),
    enabled: !!config?.apiBaseUrl && !!accessToken,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationIds: string[]) =>
      markNotificationsRead(config!.apiBaseUrl, notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications: PollNotification[] = notificationsQuery.data?.data?.notifications ?? [];

  const handlePress = useCallback((notification: PollNotification) => {
    // Mark as read
    if (!notification.readAt) {
      markReadMutation.mutate([notification.id]);
    }

    // Navigate based on type/data
    const data = notification.data;
    if (data?.bookingId) {
      router.push(`/booking-detail?bookingId=${data.bookingId}` as any);
    } else if (data?.lessonId) {
      router.push(`/lms/lesson?lessonId=${data.lessonId}` as any);
    } else if (data?.invoiceId) {
      router.push(`/invoice-detail?invoiceId=${data.invoiceId}` as any);
    }
  }, [router, markReadMutation]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just nu';
    if (diffHours < 24) return `${diffHours}h sedan`;
    if (diffHours < 48) return 'Igår';
    return d.toLocaleDateString('sv-SE');
  };

  const renderNotification = useCallback(({ item }: { item: PollNotification }) => {
    const IconComponent = TYPE_ICONS[item.notificationType] || Bell;
    const isUnread = !item.readAt;

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { backgroundColor: isUnread ? colors.primary + '08' : colors.card, borderColor: colors.grayMid },
        ]}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <IconComponent size={20} color={colors.primary} />
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </View>
          <Text style={[styles.notificationBody, { color: colors.slate }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.notificationTime, { color: colors.slate }]}>
            {formatTime(item.sentAt || item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [colors, handlePress]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifikationer</Text>
        <View style={{ width: 24 }} />
      </View>

      {notificationsQuery.isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={notificationsQuery.isFetching}
              onRefresh={() => notificationsQuery.refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Bell size={48} color={colors.slate} />
              <Text style={[styles.emptyText, { color: colors.slate }]}>
                Inga notifikationer
              </Text>
            </View>
          }
        />
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
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: { flex: 1 },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  notificationBody: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  notificationTime: { fontSize: 12, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, marginTop: 12 },
});
