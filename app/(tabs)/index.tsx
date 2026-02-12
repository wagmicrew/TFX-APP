import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Animated, Dimensions } from "react-native";
import { useSchool } from "@/contexts/school-context";
import { useAuth } from "@/contexts/auth-context";
import { useAppConfig } from "@/contexts/app-config-context";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Calendar,
  BookOpen,
  FileText,
  Car,
  ChevronRight,
  ChevronLeft,
  Clock,
  MapPin,
  User,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { TFX } from "@/constants/colors";
import { useTheme } from "@/contexts/theme-context";
import { fontFamily } from "@/constants/typography";
import { APP_SECRET } from "@/constants/config";
import UserAvatarMenu from "@/components/UserAvatarMenu";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";

const FALLBACK_LOGO = require('@/assets/images/tfx-logo.png');

const WEEKDAY_NAMES_SV = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const MONTH_NAMES_SV = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
];

interface Booking {
  id: string;
  type: string;
  startTime: string;
  endTime: string;
  duration: number;
  instructor?: { id: string; name: string; phone?: string };
  location?: { name: string; address: string };
  status: string;
  vehicle?: string;
  notes?: string;
  topic?: string;
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  colors: [string, string];
  onPress?: () => void;
}

function QuickAction({ icon, label, sublabel, colors, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={onPress}>
      <LinearGradient
        colors={colors}
        style={styles.actionIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {icon}
      </LinearGradient>
      <View style={styles.actionContent}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionSublabel}>{sublabel}</Text>
      </View>
      <ChevronRight size={18} color={TFX.slate} />
    </TouchableOpacity>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function FluidBackground() {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (val: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration, useNativeDriver: false }),
          Animated.timing(val, { toValue: 0, duration, useNativeDriver: false }),
        ])
      );
    loop(anim1, 8000).start();
    loop(anim2, 11000).start();
    loop(anim3, 14000).start();
  }, [anim1, anim2, anim3]);

  const blob1X = anim1.interpolate({ inputRange: [0, 1], outputRange: ['-20%', '30%'] });
  const blob1Y = anim1.interpolate({ inputRange: [0, 1], outputRange: ['-10%', '20%'] });
  const blob2X = anim2.interpolate({ inputRange: [0, 1], outputRange: ['50%', '10%'] });
  const blob2Y = anim2.interpolate({ inputRange: [0, 1], outputRange: ['30%', '-5%'] });
  const blob3X = anim3.interpolate({ inputRange: [0, 1], outputRange: ['10%', '60%'] });
  const blob3Y = anim3.interpolate({ inputRange: [0, 1], outputRange: ['50%', '20%'] });
  const scale1 = anim1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const scale2 = anim2.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.9] });
  const scale3 = anim3.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          fluidStyles.blob,
          {
            width: SCREEN_WIDTH * 1.2,
            height: SCREEN_WIDTH * 1.2,
            borderRadius: SCREEN_WIDTH * 0.6,
            backgroundColor: 'rgba(27, 143, 206, 0.25)',
            left: blob1X as unknown as number,
            top: blob1Y as unknown as number,
            transform: [{ scale: scale1 as unknown as number }],
          },
        ]}
      />
      <Animated.View
        style={[
          fluidStyles.blob,
          {
            width: SCREEN_WIDTH * 0.9,
            height: SCREEN_WIDTH * 0.9,
            borderRadius: SCREEN_WIDTH * 0.45,
            backgroundColor: 'rgba(42, 191, 179, 0.18)',
            left: blob2X as unknown as number,
            top: blob2Y as unknown as number,
            transform: [{ scale: scale2 as unknown as number }],
          },
        ]}
      />
      <Animated.View
        style={[
          fluidStyles.blob,
          {
            width: SCREEN_WIDTH * 1.0,
            height: SCREEN_WIDTH * 1.0,
            borderRadius: SCREEN_WIDTH * 0.5,
            backgroundColor: 'rgba(13, 107, 168, 0.2)',
            left: blob3X as unknown as number,
            top: blob3Y as unknown as number,
            transform: [{ scale: scale3 as unknown as number }],
          },
        ]}
      />
    </View>
  );
}

const fluidStyles = StyleSheet.create({
  blob: {
    position: 'absolute',
  },
});

function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function getStatusColor(isConfigured: boolean, isAuthenticated: boolean | null): string {
  if (!isConfigured) return TFX.danger;
  if (isAuthenticated) return TFX.green;
  return TFX.orange;
}

function getStatusText(isConfigured: boolean, isAuthenticated: boolean | null): string {
  if (!isConfigured) return 'Ej ansluten';
  if (isAuthenticated) return 'Ansluten & inloggad';
  return 'Ansluten, ej inloggad';
}

function StatusIndicator({ isConfigured, isAuthenticated }: { isConfigured: boolean; isAuthenticated: boolean | null }) {
  const [showText, setShowText] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const color = getStatusColor(isConfigured, isAuthenticated);
  const text = getStatusText(isConfigured, isAuthenticated);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const handlePress = useCallback(() => {
    setShowText(prev => {
      const next = !prev;
      Animated.timing(fadeAnim, {
        toValue: next ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return next;
    });
  }, [fadeAnim]);

  return (
    <TouchableOpacity
      style={statusStyles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      testID="status-indicator"
    >
      <View style={statusStyles.iconWrap}>
        <Car size={18} color={TFX.white} />
        <Animated.View
          style={[
            statusStyles.dot,
            {
              backgroundColor: color,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      </View>
      {showText && (
        <Animated.View style={[statusStyles.tooltip, { opacity: fadeAnim }]}>
          <View style={[statusStyles.tooltipDot, { backgroundColor: color }]} />
          <Text style={statusStyles.tooltipText}>{text}</Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

const statusStyles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(11,42,60,0.9)',
  },
  tooltip: {
    position: 'absolute',
    top: 42,
    right: 0,
    backgroundColor: TFX.navy,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tooltipText: {
    color: TFX.white,
    fontSize: 12,
    fontWeight: '600' as const,
  },
});

interface WeekCalendarProps {
  bookings: Booking[];
  isLoading: boolean;
}

const WeekCalendar = React.memo(function WeekCalendar({ bookings, isLoading }: WeekCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const router = useRouter();

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const today = useMemo(() => new Date(), []);

  const weekLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${MONTH_NAMES_SV[start.getMonth()]}`;
    }
    return `${start.getDate()} ${MONTH_NAMES_SV[start.getMonth()].substring(0, 3)} - ${end.getDate()} ${MONTH_NAMES_SV[end.getMonth()].substring(0, 3)}`;
  }, [weekDates]);

  const bookingsForSelectedDate = useMemo(() => {
    if (!bookings.length) return [];
    return bookings.filter(b => {
      const bDate = new Date(b.startTime);
      return isSameDay(bDate, selectedDate);
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [bookings, selectedDate]);

  const bookingCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      const key = formatDateISO(new Date(b.startTime));
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [bookings]);

  return (
    <View style={calStyles.container}>
      <View style={calStyles.header}>
        <View style={calStyles.headerLeft}>
          <Calendar size={16} color={TFX.blue} />
          <Text style={calStyles.headerTitle}>Veckovy</Text>
        </View>
        <View style={calStyles.navRow}>
          <TouchableOpacity
            onPress={() => setWeekOffset(w => w - 1)}
            style={calStyles.navBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={18} color={TFX.slate} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setWeekOffset(0); setSelectedDate(new Date()); }}
            activeOpacity={0.7}
          >
            <Text style={calStyles.weekLabel}>{weekLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setWeekOffset(w => w + 1)}
            style={calStyles.navBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronRight size={18} color={TFX.slate} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={calStyles.daysRow}>
        {weekDates.map((date, idx) => {
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const dateKey = formatDateISO(date);
          const count = bookingCountByDate[dateKey] || 0;
          const isPast = date < today && !isToday;

          return (
            <TouchableOpacity
              key={dateKey}
              style={[
                calStyles.dayCell,
                isSelected && calStyles.dayCellSelected,
                isToday && !isSelected && calStyles.dayCellToday,
              ]}
              onPress={() => setSelectedDate(date)}
              activeOpacity={0.7}
            >
              <Text style={[
                calStyles.dayName,
                isSelected && calStyles.dayNameSelected,
                isPast && calStyles.dayNamePast,
              ]}>
                {WEEKDAY_NAMES_SV[idx]}
              </Text>
              <Text style={[
                calStyles.dayNum,
                isSelected && calStyles.dayNumSelected,
                isToday && !isSelected && calStyles.dayNumToday,
                isPast && calStyles.dayNumPast,
              ]}>
                {date.getDate()}
              </Text>
              {count > 0 && (
                <View style={[
                  calStyles.dotIndicator,
                  isSelected && calStyles.dotIndicatorSelected,
                ]}>
                  {count > 1 && (
                    <Text style={[
                      calStyles.dotCount,
                      isSelected && calStyles.dotCountSelected,
                    ]}>{count}</Text>
                  )}
                </View>
              )}
              {count === 0 && <View style={calStyles.dotPlaceholder} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={calStyles.bookingsList}>
        {isLoading ? (
          <View style={calStyles.emptyState}>
            <Text style={calStyles.emptyText}>Laddar...</Text>
          </View>
        ) : bookingsForSelectedDate.length === 0 ? (
          <View style={calStyles.emptyState}>
            <Clock size={20} color={TFX.grayMid} />
            <Text style={calStyles.emptyText}>Inga bokningar denna dag</Text>
            <TouchableOpacity
              style={calStyles.bookBtn}
              onPress={() => router.push('/book-lesson')}
              activeOpacity={0.8}
            >
              <Text style={calStyles.bookBtnText}>Boka lektion</Text>
            </TouchableOpacity>
          </View>
        ) : (
          bookingsForSelectedDate.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))
        )}
      </View>
    </View>
  );
});

const BookingCard = React.memo(function BookingCard({ booking }: { booking: Booking }) {
  const isDriving = booking.type === 'driving_lesson';
  const accentColor = isDriving ? TFX.blue : TFX.teal;
  const statusColor = booking.status === 'confirmed' ? TFX.green :
    booking.status === 'pending' ? TFX.orange : TFX.slate;

  return (
    <View style={[calStyles.bookingCard, { borderLeftColor: accentColor }]}>
      <View style={calStyles.bookingTop}>
        <View style={[calStyles.bookingTypeBadge, { backgroundColor: accentColor + '18' }]}>
          {isDriving ? (
            <Car size={14} color={accentColor} />
          ) : (
            <BookOpen size={14} color={accentColor} />
          )}
          <Text style={[calStyles.bookingTypeText, { color: accentColor }]}>
            {isDriving ? 'Körlektion' : 'Teori'}
          </Text>
        </View>
        <View style={[calStyles.statusDot, { backgroundColor: statusColor }]} />
      </View>

      <View style={calStyles.bookingTimeRow}>
        <Clock size={13} color={TFX.slate} />
        <Text style={calStyles.bookingTime}>
          {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
        </Text>
        <Text style={calStyles.bookingDuration}>{booking.duration} min</Text>
      </View>

      {booking.instructor && (
        <View style={calStyles.bookingDetailRow}>
          <User size={13} color={TFX.slate} />
          <Text style={calStyles.bookingDetail}>{booking.instructor.name}</Text>
        </View>
      )}

      {booking.location && (
        <View style={calStyles.bookingDetailRow}>
          <MapPin size={13} color={TFX.slate} />
          <Text style={calStyles.bookingDetail} numberOfLines={1}>{booking.location.name}</Text>
        </View>
      )}

      {booking.vehicle && (
        <View style={calStyles.bookingDetailRow}>
          <Car size={13} color={TFX.slate} />
          <Text style={calStyles.bookingDetail}>{booking.vehicle}</Text>
        </View>
      )}
    </View>
  );
});

const calStyles = StyleSheet.create({
  container: {
    backgroundColor: TFX.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.navy,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: TFX.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily,
    color: TFX.slate,
    minWidth: 100,
    textAlign: 'center' as const,
  },
  daysRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 12,
    gap: 2,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  dayCellSelected: {
    backgroundColor: TFX.blue,
  },
  dayCellToday: {
    backgroundColor: TFX.blue + '12',
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600' as const,
    fontFamily,
    color: TFX.slate,
    marginBottom: 4,
  },
  dayNameSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  dayNamePast: {
    color: TFX.grayMid,
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.navy,
  },
  dayNumSelected: {
    color: TFX.white,
  },
  dayNumToday: {
    color: TFX.blue,
  },
  dayNumPast: {
    color: TFX.grayMid,
  },
  dotIndicator: {
    marginTop: 4,
    backgroundColor: TFX.blue + '30',
    borderRadius: 6,
    minWidth: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dotIndicatorSelected: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotCount: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: TFX.blue,
  },
  dotCountSelected: {
    color: TFX.white,
  },
  dotPlaceholder: {
    height: 16,
  },
  bookingsList: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    minHeight: 80,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: TFX.slate,
  },
  bookBtn: {
    backgroundColor: TFX.blue,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  bookBtnText: {
    color: TFX.white,
    fontSize: 13,
    fontWeight: '600' as const,
    fontFamily,
  },
  bookingCard: {
    backgroundColor: TFX.grayLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  bookingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bookingTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bookingTypeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bookingTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  bookingTime: {
    fontSize: 14,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.navy,
  },
  bookingDuration: {
    fontSize: 11,
    color: TFX.slate,
    marginLeft: 'auto',
  },
  bookingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  bookingDetail: {
    fontSize: 12,
    color: TFX.slate,
    flex: 1,
  },
});

export default function HomeScreen() {
  const { colors } = useTheme();
  const { config, isConfigured } = useSchool();
  const { isAuthenticated, accessToken } = useAuth();
  const { isFeatureEnabled, settings: appSettings, updateAvailable } = useAppConfig();
  const router = useRouter();

  const weekRange = useMemo(() => {
    const now = new Date();
    const dates = getWeekDates(now);
    return {
      startDate: formatDateISO(dates[0]),
      endDate: formatDateISO(dates[6]),
    };
  }, []);

  const bookingsQuery = useQuery({
    queryKey: ['bookings', weekRange.startDate, weekRange.endDate, config?.apiBaseUrl, accessToken],
    queryFn: async () => {
      if (!config?.apiBaseUrl || !accessToken) return [];
      const url = `${config.apiBaseUrl}/bookings?startDate=${weekRange.startDate}&endDate=${weekRange.endDate}`;
      console.log('[Dashboard] Fetching bookings:', url);
      try {
        const response = await fetch(url, {
          headers: {
            'X-App-Secret': APP_SECRET,
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });
        if (!response.ok) {
          console.log('[Dashboard] Bookings fetch failed:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('[Dashboard] Bookings response:', JSON.stringify(data).substring(0, 200));
        if (data.success && data.data?.bookings) {
          return data.data.bookings as Booking[];
        }
        return [];
      } catch (err) {
        console.log('[Dashboard] Bookings fetch error:', err);
        return [];
      }
    },
    enabled: !!config?.apiBaseUrl && !!accessToken && isAuthenticated === true,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  if (!config) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const { branding } = config;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <LinearGradient
            colors={[colors.primaryDeep, colors.primaryDark, colors.primary]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <FluidBackground />
          <SafeAreaView edges={['top']}>
            <View style={styles.heroInner}>
              <View style={styles.heroTop}>
                <View style={styles.logoBox}>
                  <Image
                    source={branding.logoUrl ? { uri: branding.logoUrl } : FALLBACK_LOGO}
                    style={styles.logo}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.heroTopRight}>
                  <UserAvatarMenu />
                  <StatusIndicator isConfigured={isConfigured} isAuthenticated={isAuthenticated} />
                </View>
              </View>
              <Text style={styles.heroGreeting}>Välkommen till</Text>
              <Text style={styles.heroSchoolName}>{branding.schoolName}</Text>
              {branding.tagline && (
                <Text style={styles.heroTagline}>{branding.tagline}</Text>
              )}
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <WeekCalendar
            bookings={bookingsQuery.data ?? []}
            isLoading={bookingsQuery.isLoading}
          />

          <Text style={styles.sectionTitle}>Snabbval</Text>

          {isFeatureEnabled('featureBookings') && (
            <QuickAction
              icon={<Calendar size={22} color="#fff" />}
              label="Boka körlektioner"
              sublabel="Hitta lediga tider"
              colors={[TFX.blue, TFX.blueDark]}
              onPress={() => router.push('/book-lesson')}
            />
          )}
          {isFeatureEnabled('featureLms') && (
            <QuickAction
              icon={<BookOpen size={22} color="#fff" />}
              label="Studiematerial"
              sublabel="Läs och gör quiz"
              colors={[TFX.teal, TFX.tealDark]}
              onPress={() => router.push('/(tabs)/lms')}
            />
          )}
          {isFeatureEnabled('featureInvoices') && (
            <QuickAction
              icon={<FileText size={22} color="#fff" />}
              label="Fakturor"
              sublabel="Se och betala"
              colors={[TFX.orange, TFX.orangeDark]}
            />
          )}
          {isFeatureEnabled('featureKorklar') && (
            <QuickAction
              icon={<Car size={22} color="#fff" />}
              label="Körklar"
              sublabel="Se din progress"
              colors={['#7C3AED', '#6D28D9']}
            />
          )}

          {updateAvailable && (
            <View style={styles.updateBanner}>
              <Text style={styles.updateBannerText}>📲 Ny version tillgänglig — uppdatera appen</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TFX.grayLight,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TFX.grayLight,
  },
  loadingText: {
    fontSize: 16,
    fontFamily,
    color: TFX.slate,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  heroSection: {
    paddingBottom: 32,
    overflow: 'hidden',
  },
  heroInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  heroTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 56,
    height: 56,
  },
  schoolLogoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  schoolLogo: {
    width: 28,
    height: 28,
  },
  heroGreeting: {
    fontSize: 15,
    fontFamily,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  heroSchoolName: {
    fontSize: 28,
    fontWeight: "800" as const,
    fontFamily,
    color: "#fff",
    marginBottom: 6,
  },
  heroTagline: {
    fontSize: 14,
    fontFamily,
    color: "rgba(255,255,255,0.6)",
    fontStyle: "italic" as const,
  },
  body: {
    paddingHorizontal: 16,
    marginTop: -16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    fontFamily,
    color: TFX.slate,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TFX.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionContent: {
    flex: 1,
    marginLeft: 14,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily,
    color: TFX.navy,
  },
  actionSublabel: {
    fontSize: 13,
    fontFamily,
    color: TFX.slate,
    marginTop: 2,
  },
  updateBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    alignItems: 'center',
  },
  updateBannerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily,
    color: TFX.blue,
  },
});
