import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Car,
  BookOpen,
  Clock,
  ChevronRight,
  ChevronLeft,
  Zap,
  Check,
  RotateCcw,
  Calendar as CalendarIcon,
  MapPin,
  User,
  CreditCard,
  Smartphone,
  Wallet,
  Building,
  FileText,
  Shield,
  CircleDot,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSchool } from '@/contexts/school-context';
import { useAuth } from '@/contexts/auth-context';
import { TFX } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import type {
  LessonCategory,
  LessonTypeItem,
  TimeSlot,
  SessionItem,
  BookingStep,
} from '@/types/booking';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const APP_SECRET = 'sk_trafikskola_prod_acbdca5a99ca581b2528d9da55d5be73';

const WEEKDAY_NAMES_SV = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const MONTH_NAMES_SV = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
];

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

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatSwedishDate(d: Date): string {
  const days = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
  return `${days[d.getDay()]} ${d.getDate()} ${MONTH_NAMES_SV[d.getMonth()]} ${d.getFullYear()}`;
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <View style={stepStyles.container}>
      {labels.map((label, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = idx < currentStep;
        return (
          <View key={label} style={stepStyles.step}>
            <View
              style={[
                stepStyles.dot,
                isActive && stepStyles.dotActive,
                isCompleted && stepStyles.dotCompleted,
              ]}
            >
              {isCompleted ? (
                <Check size={12} color="#fff" />
              ) : (
                <Text
                  style={[
                    stepStyles.dotText,
                    (isActive || isCompleted) && stepStyles.dotTextActive,
                  ]}
                >
                  {idx + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                stepStyles.label,
                isActive && stepStyles.labelActive,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {idx < totalSteps - 1 && (
              <View
                style={[
                  stepStyles.line,
                  isCompleted && stepStyles.lineCompleted,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: TFX.white,
    borderBottomWidth: 1,
    borderBottomColor: TFX.grayMid,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TFX.grayMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dotActive: {
    backgroundColor: TFX.blue,
  },
  dotCompleted: {
    backgroundColor: TFX.green,
  },
  dotText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: TFX.slate,
  },
  dotTextActive: {
    color: '#fff',
  },
  label: {
    fontSize: 10,
    color: TFX.slate,
    textAlign: 'center' as const,
  },
  labelActive: {
    color: TFX.blue,
    fontWeight: '600' as const,
  },
  line: {
    position: 'absolute' as const,
    top: 14,
    right: -SCREEN_WIDTH * 0.08,
    width: SCREEN_WIDTH * 0.16,
    height: 2,
    backgroundColor: TFX.grayMid,
  },
  lineCompleted: {
    backgroundColor: TFX.green,
  },
});

export default function BookLessonScreen() {
  const router = useRouter();
  const { config } = useSchool();
  const { accessToken } = useAuth();
  const [step, setStep] = useState<BookingStep>('select-type');
  const [selectedCategory, setSelectedCategory] = useState<LessonCategory | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonTypeItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekBase, setWeekBase] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [transmission, setTransmission] = useState<'manual' | 'automatic' | null>(null);
  const [showTransmissionPicker, setShowTransmissionPicker] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-App-Secret': APP_SECRET,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const apiBaseUrl = config?.apiBaseUrl ?? '';

  const lessonTypesQuery = useQuery({
    queryKey: ['lessonTypes', apiBaseUrl, accessToken],
    queryFn: async () => {
      if (!apiBaseUrl) throw new Error('No config');
      const url = `${apiBaseUrl}/bookings/lesson-types`;
      console.log('[Booking] Fetching lesson types from:', url);
      const res = await fetch(url, { headers: getHeaders() });
      const data = await res.json();
      console.log('[Booking] Lesson types response:', JSON.stringify(data));
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to fetch lesson types');
      return data.data.categories as LessonCategory[];
    },
    enabled: !!apiBaseUrl && !!accessToken,
  });

  const selectedLessonId = selectedLesson?.id ?? '';
  const selectedDateStr = formatDate(selectedDate);

  const slotsQuery = useQuery({
    queryKey: ['availableSlots', apiBaseUrl, selectedLessonId, selectedDateStr, accessToken],
    queryFn: async () => {
      if (!apiBaseUrl || !selectedLessonId) throw new Error('Missing data');
      const url = `${apiBaseUrl}/bookings/available-slots?type=${selectedLessonId}&date=${selectedDateStr}`;
      console.log('[Booking] Fetching slots from:', url);
      const res = await fetch(url, { headers: getHeaders() });
      const data = await res.json();
      console.log('[Booking] Slots response:', JSON.stringify(data));
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to fetch slots');
      return data.data.slots as TimeSlot[];
    },
    enabled: !!apiBaseUrl && !!accessToken && !!selectedLessonId && step === 'calendar',
  });

  const sessionsQuery = useQuery({
    queryKey: ['availableSessions', apiBaseUrl, selectedLessonId, accessToken],
    queryFn: async () => {
      if (!apiBaseUrl || !selectedLessonId) throw new Error('Missing data');
      const url = `${apiBaseUrl}/bookings/available-sessions?type=${selectedLessonId}`;
      console.log('[Booking] Fetching sessions from:', url);
      const res = await fetch(url, { headers: getHeaders() });
      const data = await res.json();
      console.log('[Booking] Sessions response:', JSON.stringify(data));
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to fetch sessions');
      return data.data.sessions as SessionItem[];
    },
    enabled: !!apiBaseUrl && !!accessToken && !!selectedLessonId && step === 'sessions',
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!config || !selectedLesson) throw new Error('Missing data');
      const body: Record<string, unknown> = {
        type: selectedCategory?.type === 'lesson' ? 'driving_lesson' : 'theory_session',
        lessonTypeId: selectedLesson.id,
        startTime: selectedSlot?.startTime || selectedSession?.startTime,
        duration: selectedLesson.duration,
        instructorId: selectedSlot?.instructor?.id || selectedSession?.instructor?.id,
      };
      if (transmission) body.transmission = transmission;

      console.log('[Booking] Creating booking:', JSON.stringify(body));
      const res = await fetch(`${config.apiBaseUrl}/bookings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log('[Booking] Booking response:', JSON.stringify(data));
      if (!data.success || !data.data) throw new Error(data.error || 'Bokningen misslyckades');
      return data.data;
    },
    onSuccess: (data) => {
      console.log('[Booking] Booking created:', data.booking?.id);
      Alert.alert(
        'Bokning bekräftad!',
        data.message || 'Din bokning har skapats. Du skickas nu till betalhubben.',
        [
          {
            text: 'Till Betalhubben',
            onPress: () => router.back(),
          },
        ],
      );
    },
    onError: (error: Error) => {
      console.error('[Booking] Booking error:', error.message);
      Alert.alert('Fel', error.message);
    },
  });

  const animateStep = useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleSelectLesson = useCallback((category: LessonCategory, lesson: LessonTypeItem) => {
    console.log('[Booking] Selected lesson:', lesson.name, 'category type:', category.type);
    setSelectedCategory(category);
    setSelectedLesson(lesson);
    if (category.type === 'lesson') {
      setStep('calendar');
    } else {
      setStep('sessions');
    }
    animateStep();
  }, [animateStep]);

  const handleSelectSlot = useCallback((slot: TimeSlot) => {
    console.log('[Booking] Selected slot:', slot.startTime);
    setSelectedSlot(slot);
    setShowTransmissionPicker(true);
  }, []);

  const handleTransmissionSelect = useCallback((t: 'manual' | 'automatic') => {
    console.log('[Booking] Selected transmission:', t);
    setTransmission(t);
    setShowTransmissionPicker(false);
    setStep('confirm');
    animateStep();
  }, [animateStep]);

  const handleSelectSession = useCallback((session: SessionItem) => {
    console.log('[Booking] Selected session:', session.id);
    setSelectedSession(session);
    setStep('confirm');
    animateStep();
  }, [animateStep]);

  const handleReset = useCallback(() => {
    setStep('select-type');
    setSelectedCategory(null);
    setSelectedLesson(null);
    setSelectedSlot(null);
    setSelectedSession(null);
    setTransmission(null);
    setShowTransmissionPicker(false);
    animateStep();
  }, [animateStep]);

  const handleBack = useCallback(() => {
    if (step === 'confirm') {
      if (selectedCategory?.type === 'lesson') {
        setStep('calendar');
        setSelectedSlot(null);
        setTransmission(null);
      } else {
        setStep('sessions');
        setSelectedSession(null);
      }
    } else if (step === 'calendar' || step === 'sessions') {
      setStep('select-type');
      setSelectedCategory(null);
      setSelectedLesson(null);
    } else {
      router.back();
    }
    animateStep();
  }, [step, selectedCategory, animateStep, router]);

  const weekDates = useMemo(() => getWeekDates(weekBase), [weekBase]);

  const currentStepIndex = step === 'select-type' ? 0 : step === 'calendar' || step === 'sessions' ? 1 : 2;

  const priceToShow = selectedLesson?.studentPrice ?? selectedLesson?.price ?? 0;
  const priceExclVat = Math.round(priceToShow / 1.25);
  const vatAmount = priceToShow - priceExclVat;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.headerBack}
            testID="booking-back"
          >
            <ArrowLeft size={22} color={TFX.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Boka körlektion</Text>
          {step !== 'select-type' && (
            <TouchableOpacity onPress={handleReset} style={styles.headerReset} testID="booking-reset">
              <RotateCcw size={18} color={TFX.slate} />
              <Text style={styles.headerResetText}>Börja om</Text>
            </TouchableOpacity>
          )}
        </View>

        <StepIndicator
          currentStep={currentStepIndex}
          totalSteps={3}
          labels={['Välj typ', 'Välj tid', 'Bekräfta']}
        />

        <Animated.View style={[styles.body, { opacity: fadeAnim }]}>
          {step === 'select-type' && (
            <SelectTypeStep
              categories={lessonTypesQuery.data ?? []}
              isLoading={lessonTypesQuery.isLoading}
              error={lessonTypesQuery.error}
              onSelect={handleSelectLesson}
              onRefetch={lessonTypesQuery.refetch}
            />
          )}
          {step === 'calendar' && (
            <CalendarStep
              lessonName={selectedLesson?.name ?? ''}
              weekDates={weekDates}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onPrevWeek={() => {
                const d = new Date(weekBase);
                d.setDate(d.getDate() - 7);
                setWeekBase(d);
              }}
              onNextWeek={() => {
                const d = new Date(weekBase);
                d.setDate(d.getDate() + 7);
                setWeekBase(d);
              }}
              slots={slotsQuery.data ?? []}
              isLoading={slotsQuery.isLoading}
              onSelectSlot={handleSelectSlot}
              showTransmissionPicker={showTransmissionPicker}
              onTransmissionSelect={handleTransmissionSelect}
              onDismissTransmission={() => setShowTransmissionPicker(false)}
            />
          )}
          {step === 'sessions' && (
            <SessionsStep
              lessonName={selectedLesson?.name ?? ''}
              sessions={sessionsQuery.data ?? []}
              isLoading={sessionsQuery.isLoading}
              onSelectSession={handleSelectSession}
            />
          )}
          {step === 'confirm' && (
            <ConfirmStep
              lesson={selectedLesson!}
              category={selectedCategory!}
              slot={selectedSlot}
              session={selectedSession}
              transmission={transmission}
              selectedDate={selectedDate}
              price={priceToShow}
              priceExclVat={priceExclVat}
              vatAmount={vatAmount}
              isBooking={bookMutation.isPending}
              onBook={() => bookMutation.mutate()}
            />
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

interface SelectTypeStepProps {
  categories: LessonCategory[];
  isLoading: boolean;
  error: Error | null;
  onSelect: (category: LessonCategory, lesson: LessonTypeItem) => void;
  onRefetch: () => void;
}

function SelectTypeStep({ categories, isLoading, error, onSelect, onRefetch }: SelectTypeStepProps) {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={TFX.blue} />
        <Text style={styles.loadingText}>Hämtar lektionstyper...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Kunde inte hämta lektionstyper</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefetch}>
          <Text style={styles.retryButtonText}>Försök igen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.stepScroll}
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Välj lektionstyp</Text>
        <Text style={styles.stepSubtitle}>Välj vilken typ av körlektion du vill boka</Text>
      </View>

      {categories.map((category) => (
        <View key={category.id} style={styles.categoryBlock}>
          <View style={styles.categoryHeader}>
            {category.type === 'lesson' ? (
              <Car size={18} color={TFX.blue} />
            ) : (
              <BookOpen size={18} color={TFX.teal} />
            )}
            <Text style={styles.categoryName}>{category.name}</Text>
          </View>

          {category.items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.lessonCard}
              activeOpacity={0.7}
              onPress={() => onSelect(category, item)}
              testID={`lesson-${item.id}`}
            >
              <View style={styles.lessonCardTop}>
                <View style={styles.lessonCardInfo}>
                  <Text style={styles.lessonName}>{item.name}</Text>
                  <Text style={styles.lessonDesc} numberOfLines={3}>
                    {item.description}
                  </Text>
                </View>
                <ChevronRight size={20} color={TFX.slate} />
              </View>

              <View style={styles.lessonCardBottom}>
                {item.duration > 0 && (
                  <View style={styles.lessonTag}>
                    <Clock size={13} color={TFX.blue} />
                    <Text style={styles.lessonTagText}>{item.duration} min</Text>
                  </View>
                )}
                <View style={styles.lessonPriceBlock}>
                  <Text style={styles.lessonPrice}>{item.price.toFixed(2)} Kr</Text>
                  {item.studentPrice && item.studentPrice < item.price && (
                    <Text style={styles.lessonStudentPrice}>
                      Studentpris: {item.studentPrice.toFixed(2)} Kr
                    </Text>
                  )}
                </View>
              </View>

              {item.quickBuy && (
                <View style={styles.quickBuyBanner}>
                  <Zap size={14} color={TFX.orange} />
                  <Text style={styles.quickBuyText}>Snabbköp utan registrering</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

interface CalendarStepProps {
  lessonName: string;
  weekDates: Date[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  slots: TimeSlot[];
  isLoading: boolean;
  onSelectSlot: (slot: TimeSlot) => void;
  showTransmissionPicker: boolean;
  onTransmissionSelect: (t: 'manual' | 'automatic') => void;
  onDismissTransmission: () => void;
}

function CalendarStep({
  lessonName,
  weekDates,
  selectedDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  slots,
  isLoading,
  onSelectSlot,
  showTransmissionPicker,
  onTransmissionSelect,
  onDismissTransmission,
}: CalendarStepProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthYear = `${MONTH_NAMES_SV[weekDates[0].getMonth()]} ${weekDates[0].getFullYear()}`;

  const availableSlots = slots.filter((s) => s.available);

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>{lessonName}</Text>
        <Text style={styles.stepSubtitle}>Välj dag och tid för din lektion</Text>
      </View>

      <View style={styles.calendarNav}>
        <TouchableOpacity onPress={onPrevWeek} style={styles.calendarNavBtn}>
          <ChevronLeft size={22} color={TFX.navy} />
        </TouchableOpacity>
        <Text style={styles.calendarMonth}>{monthYear}</Text>
        <TouchableOpacity onPress={onNextWeek} style={styles.calendarNavBtn}>
          <ChevronRight size={22} color={TFX.navy} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {weekDates.map((date, idx) => {
          const isSelected = formatDate(date) === formatDate(selectedDate);
          const isPast = date < today;
          const isToday = formatDate(date) === formatDate(today);

          return (
            <TouchableOpacity
              key={formatDate(date)}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isPast && styles.dayCellPast,
              ]}
              onPress={() => !isPast && onSelectDate(date)}
              disabled={isPast}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected && styles.dayNameSelected,
                  isPast && styles.dayNamePast,
                ]}
              >
                {WEEKDAY_NAMES_SV[idx]}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  isPast && styles.dayNumberPast,
                  isToday && styles.dayNumberToday,
                ]}
              >
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.slotsSectionHeader}>
        <CalendarIcon size={16} color={TFX.blue} />
        <Text style={styles.slotsSectionTitle}>
          Lediga tider — {formatSwedishDate(selectedDate)}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.slotsLoading}>
          <ActivityIndicator size="small" color={TFX.blue} />
          <Text style={styles.slotsLoadingText}>Hämtar tider...</Text>
        </View>
      ) : availableSlots.length === 0 ? (
        <View style={styles.noSlots}>
          <Text style={styles.noSlotsText}>Inga lediga tider denna dag</Text>
          <Text style={styles.noSlotsHint}>Prova en annan dag</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.slotsScroll}
          contentContainerStyle={styles.slotsGrid}
          showsVerticalScrollIndicator={false}
        >
          {availableSlots.map((slot, idx) => (
            <TouchableOpacity
              key={`${slot.startTime}-${idx}`}
              style={styles.slotChip}
              onPress={() => onSelectSlot(slot)}
              activeOpacity={0.7}
            >
              <Text style={styles.slotTime}>
                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
              </Text>
              {slot.instructor && (
                <Text style={styles.slotInstructor}>{slot.instructor.name}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {showTransmissionPicker && (
        <View style={styles.transmissionOverlay}>
          <View style={styles.transmissionCard}>
            <Text style={styles.transmissionTitle}>Välj växellåda</Text>
            <Text style={styles.transmissionSubtitle}>Vilken typ av bil vill du köra?</Text>

            <TouchableOpacity
              style={styles.transmissionOption}
              onPress={() => onTransmissionSelect('manual')}
              activeOpacity={0.7}
            >
              <View style={[styles.transmissionIcon, { backgroundColor: 'rgba(27,143,206,0.1)' }]}>
                <CircleDot size={22} color={TFX.blue} />
              </View>
              <View style={styles.transmissionOptionContent}>
                <Text style={styles.transmissionOptionTitle}>Manual</Text>
                <Text style={styles.transmissionOptionDesc}>Manuell växellåda</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.transmissionOption}
              onPress={() => onTransmissionSelect('automatic')}
              activeOpacity={0.7}
            >
              <View style={[styles.transmissionIcon, { backgroundColor: 'rgba(42,191,179,0.1)' }]}>
                <Zap size={22} color={TFX.teal} />
              </View>
              <View style={styles.transmissionOptionContent}>
                <Text style={styles.transmissionOptionTitle}>Automat</Text>
                <Text style={styles.transmissionOptionDesc}>Automatisk växellåda</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.transmissionCancel}
              onPress={onDismissTransmission}
            >
              <Text style={styles.transmissionCancelText}>Avbryt</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

interface SessionsStepProps {
  lessonName: string;
  sessions: SessionItem[];
  isLoading: boolean;
  onSelectSession: (session: SessionItem) => void;
}

function SessionsStep({ lessonName, sessions, isLoading, onSelectSession }: SessionsStepProps) {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={TFX.blue} />
        <Text style={styles.loadingText}>Hämtar tillgängliga sessioner...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.stepScroll}
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>{lessonName}</Text>
        <Text style={styles.stepSubtitle}>Tillgängliga sessioner</Text>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.noSlots}>
          <Text style={styles.noSlotsText}>Inga sessioner tillgängliga just nu</Text>
        </View>
      ) : (
        sessions.map((session) => {
          const sessionDate = new Date(session.date || session.startTime);
          return (
            <TouchableOpacity
              key={session.id}
              style={styles.sessionCard}
              onPress={() => onSelectSession(session)}
              activeOpacity={0.7}
            >
              <View style={styles.sessionCardLeft}>
                <View style={styles.sessionDateBadge}>
                  <Text style={styles.sessionDateDay}>{sessionDate.getDate()}</Text>
                  <Text style={styles.sessionDateMonth}>
                    {MONTH_NAMES_SV[sessionDate.getMonth()].substring(0, 3)}
                  </Text>
                </View>
              </View>
              <View style={styles.sessionCardContent}>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <View style={styles.sessionMeta}>
                  <Clock size={13} color={TFX.slate} />
                  <Text style={styles.sessionMetaText}>
                    {formatTime(session.startTime)} - {formatTime(session.endTime)}
                  </Text>
                </View>
                {session.instructor && (
                  <View style={styles.sessionMeta}>
                    <User size={13} color={TFX.slate} />
                    <Text style={styles.sessionMetaText}>{session.instructor.name}</Text>
                  </View>
                )}
                {session.location && (
                  <View style={styles.sessionMeta}>
                    <MapPin size={13} color={TFX.slate} />
                    <Text style={styles.sessionMetaText}>{session.location}</Text>
                  </View>
                )}
                <View style={styles.sessionSpots}>
                  <Text style={styles.sessionSpotsText}>
                    {session.spotsLeft} av {session.totalSpots} platser kvar
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={TFX.slate} />
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

interface ConfirmStepProps {
  lesson: LessonTypeItem;
  category: LessonCategory;
  slot: TimeSlot | null;
  session: SessionItem | null;
  transmission: 'manual' | 'automatic' | null;
  selectedDate: Date;
  price: number;
  priceExclVat: number;
  vatAmount: number;
  isBooking: boolean;
  onBook: () => void;
}

function ConfirmStep({
  lesson,
  category,
  slot,
  session,
  transmission,
  selectedDate,
  price,
  priceExclVat,
  vatAmount,
  isBooking,
  onBook,
}: ConfirmStepProps) {
  const bookingDate = slot ? selectedDate : session ? new Date(session.date || session.startTime) : selectedDate;
  const startTime = slot?.startTime ?? session?.startTime;
  const endTime = slot?.endTime ?? session?.endTime;
  const instructorName = slot?.instructor?.name ?? session?.instructor?.name;

  return (
    <ScrollView
      style={styles.stepScroll}
      contentContainerStyle={styles.confirmContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Bekräfta bokning</Text>
        <Text style={styles.stepSubtitle}>Granska och bekräfta din bokning</Text>
      </View>

      <View style={styles.confirmCard}>
        <LinearGradient
          colors={[TFX.blue, TFX.blueDark]}
          style={styles.confirmCardHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Car size={24} color="#fff" />
          <Text style={styles.confirmCardTitle}>Din Körlektion</Text>
        </LinearGradient>

        <View style={styles.confirmCardBody}>
          <Text style={styles.confirmSectionTitle}>Bokningsinformation</Text>

          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Lektionstyp</Text>
            <Text style={styles.confirmValue}>{lesson.name}</Text>
          </View>

          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Datum</Text>
            <Text style={styles.confirmValue}>{formatSwedishDate(bookingDate)}</Text>
          </View>

          {startTime && endTime && (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Tid</Text>
              <Text style={styles.confirmValue}>
                {formatTime(startTime)} - {formatTime(endTime)}
              </Text>
            </View>
          )}

          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Varaktighet</Text>
            <Text style={styles.confirmValue}>{lesson.duration} minuter</Text>
          </View>

          {transmission && (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Växellåda</Text>
              <Text style={styles.confirmValue}>
                {transmission === 'manual' ? 'Manual' : 'Automat'}
              </Text>
            </View>
          )}

          {instructorName && (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Instruktör</Text>
              <Text style={styles.confirmValue}>{instructorName}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.importantCard}>
        <Shield size={18} color={TFX.orange} />
        <Text style={styles.importantText}>
          Betala denna faktura för att bekräfta din bokning. Din bokade tid reserveras när betalningen är genomförd.
        </Text>
      </View>

      <View style={styles.invoiceCard}>
        <View style={styles.invoiceHeader}>
          <FileText size={18} color={TFX.navy} />
          <Text style={styles.invoiceTitle}>Prisuppgifter</Text>
        </View>

        <View style={styles.invoiceRow}>
          <Text style={styles.invoiceItemName}>
            {lesson.name}{transmission ? ` - ${transmission}` : ''} - {lesson.duration} min
          </Text>
          <Text style={styles.invoiceItemPrice}>{price.toFixed(0)} kr</Text>
        </View>

        <View style={styles.invoiceDivider} />

        <View style={styles.invoiceTotalRow}>
          <Text style={styles.invoiceTotalLabel}>Totalt att betala</Text>
          <Text style={styles.invoiceTotalValue}>{price.toFixed(0)} SEK</Text>
        </View>

        <View style={styles.invoiceVatSection}>
          <Text style={styles.invoiceVatTitle}>Momsuppgifter</Text>
          <View style={styles.invoiceVatRow}>
            <Text style={styles.invoiceVatLabel}>Belopp exkl. moms</Text>
            <Text style={styles.invoiceVatValue}>{priceExclVat.toFixed(2)} kr</Text>
          </View>
          <View style={styles.invoiceVatRow}>
            <Text style={styles.invoiceVatLabel}>25% moms</Text>
            <Text style={styles.invoiceVatValue}>{vatAmount.toFixed(2)} kr</Text>
          </View>
        </View>
      </View>

      <View style={styles.paymentMethodsCard}>
        <Text style={styles.paymentMethodsTitle}>Betalningsmetoder</Text>
        <Text style={styles.paymentMethodsSubtitle}>
          Välj betalningsmetod efter bokning i betalhubben
        </Text>

        <View style={styles.paymentMethodRow}>
          <View style={[styles.paymentMethodIcon, { backgroundColor: 'rgba(52,179,100,0.1)' }]}>
            <Smartphone size={20} color={TFX.green} />
          </View>
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodName}>Swish</Text>
            <Text style={styles.paymentMethodDesc}>Snabb och säker betalning</Text>
          </View>
        </View>

        <View style={styles.paymentMethodRow}>
          <View style={[styles.paymentMethodIcon, { backgroundColor: 'rgba(27,143,206,0.1)' }]}>
            <CreditCard size={20} color={TFX.blue} />
          </View>
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodName}>Qliro Kortbetalning</Text>
            <Text style={styles.paymentMethodDesc}>Visa, Mastercard, American Express</Text>
          </View>
        </View>

        <View style={styles.paymentMethodRow}>
          <View style={[styles.paymentMethodIcon, { backgroundColor: 'rgba(245,146,27,0.1)' }]}>
            <Wallet size={20} color={TFX.orange} />
          </View>
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodName}>Krediter</Text>
            <Text style={styles.paymentMethodDesc}>Använd dina sparade krediter</Text>
          </View>
        </View>

        <View style={styles.paymentMethodRow}>
          <View style={[styles.paymentMethodIcon, { backgroundColor: 'rgba(100,116,139,0.1)' }]}>
            <Building size={20} color={TFX.slate} />
          </View>
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodName}>Betala på plats</Text>
            <Text style={styles.paymentMethodDesc}>Betala vid trafikskolan</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.bookButton, isBooking && styles.bookButtonDisabled]}
        onPress={onBook}
        disabled={isBooking}
        activeOpacity={0.8}
        testID="confirm-booking"
      >
        <LinearGradient
          colors={isBooking ? [TFX.slate, TFX.slate] : [TFX.blue, TFX.blueDark]}
          style={styles.bookButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {isBooking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Check size={20} color="#fff" />
              <Text style={styles.bookButtonText}>Boka & gå till betalhubben</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TFX.grayLight,
  },
  safeArea: {
    flex: 1,
    backgroundColor: TFX.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: TFX.white,
    borderBottomWidth: 1,
    borderBottomColor: TFX.grayMid,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: TFX.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    color: TFX.navy,
    marginLeft: 12,
  },
  headerReset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: TFX.grayLight,
  },
  headerResetText: {
    fontSize: 12,
    color: TFX.slate,
    fontWeight: '500' as const,
  },
  body: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: TFX.slate,
  },
  errorText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: TFX.danger,
    textAlign: 'center' as const,
  },
  errorDetail: {
    marginTop: 8,
    fontSize: 13,
    color: TFX.slate,
    textAlign: 'center' as const,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: TFX.blue,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  stepScroll: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
    paddingBottom: 32,
  },
  stepHeader: {
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: TFX.navy,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: TFX.slate,
  },
  categoryBlock: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: TFX.navy,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  lessonCard: {
    backgroundColor: TFX.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: TFX.grayMid,
  },
  lessonCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  lessonCardInfo: {
    flex: 1,
  },
  lessonName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: TFX.navy,
    marginBottom: 4,
  },
  lessonDesc: {
    fontSize: 13,
    color: TFX.slate,
    lineHeight: 18,
  },
  lessonCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TFX.grayMid,
  },
  lessonTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(27,143,206,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  lessonTagText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TFX.blue,
  },
  lessonPriceBlock: {
    alignItems: 'flex-end' as const,
  },
  lessonPrice: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: TFX.navy,
  },
  lessonStudentPrice: {
    fontSize: 12,
    color: TFX.green,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  quickBuyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(245,146,27,0.08)',
    borderRadius: 8,
  },
  quickBuyText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: TFX.orange,
  },
  calendarContainer: {
    flex: 1,
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  calendarNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: TFX.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonth: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: TFX.navy,
    textTransform: 'capitalize' as const,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: TFX.white,
    borderWidth: 1,
    borderColor: TFX.grayMid,
  },
  dayCellSelected: {
    backgroundColor: TFX.blue,
    borderColor: TFX.blue,
  },
  dayCellPast: {
    opacity: 0.4,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: TFX.slate,
    marginBottom: 4,
  },
  dayNameSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  dayNamePast: {
    color: TFX.slate,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: TFX.navy,
  },
  dayNumberSelected: {
    color: '#fff',
  },
  dayNumberPast: {
    color: TFX.slate,
  },
  dayNumberToday: {
    color: TFX.blue,
  },
  slotsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  slotsSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: TFX.navy,
  },
  slotsLoading: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  slotsLoadingText: {
    fontSize: 13,
    color: TFX.slate,
  },
  noSlots: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noSlotsText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: TFX.slate,
  },
  noSlotsHint: {
    fontSize: 13,
    color: TFX.slate,
    marginTop: 4,
  },
  slotsScroll: {
    flex: 1,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 32,
  },
  slotChip: {
    backgroundColor: TFX.white,
    borderWidth: 1,
    borderColor: TFX.blue,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: (SCREEN_WIDTH - 48) / 3,
    alignItems: 'center',
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: TFX.blue,
  },
  slotInstructor: {
    fontSize: 11,
    color: TFX.slate,
    marginTop: 2,
  },
  transmissionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  transmissionCard: {
    backgroundColor: TFX.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  transmissionTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: TFX.navy,
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  transmissionSubtitle: {
    fontSize: 14,
    color: TFX.slate,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  transmissionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TFX.grayMid,
    marginBottom: 10,
  },
  transmissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transmissionOptionContent: {
    marginLeft: 14,
    flex: 1,
  },
  transmissionOptionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: TFX.navy,
  },
  transmissionOptionDesc: {
    fontSize: 13,
    color: TFX.slate,
    marginTop: 2,
  },
  transmissionCancel: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  transmissionCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: TFX.slate,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TFX.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: TFX.grayMid,
  },
  sessionCardLeft: {
    marginRight: 14,
  },
  sessionDateBadge: {
    width: 52,
    height: 56,
    borderRadius: 12,
    backgroundColor: TFX.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionDateDay: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#fff',
  },
  sessionDateMonth: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase' as const,
  },
  sessionCardContent: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.navy,
    marginBottom: 6,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  sessionMetaText: {
    fontSize: 12,
    color: TFX.slate,
  },
  sessionSpots: {
    marginTop: 6,
    backgroundColor: 'rgba(52,179,100,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start' as const,
  },
  sessionSpotsText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: TFX.green,
  },
  confirmContent: {
    paddingBottom: 40,
  },
  confirmCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: TFX.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 16,
  },
  confirmCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 18,
  },
  confirmCardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    fontFamily,
    color: '#fff',
  },
  confirmCardBody: {
    padding: 18,
  },
  confirmSectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.navy,
    marginBottom: 14,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: TFX.grayLight,
  },
  confirmLabel: {
    fontSize: 14,
    color: TFX.slate,
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: TFX.navy,
    textAlign: 'right' as const,
    maxWidth: '55%' as unknown as number,
  },
  importantCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 14,
    backgroundColor: 'rgba(245,146,27,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,146,27,0.2)',
    gap: 10,
    marginBottom: 16,
  },
  importantText: {
    flex: 1,
    fontSize: 13,
    color: TFX.navy,
    lineHeight: 19,
  },
  invoiceCard: {
    marginHorizontal: 16,
    backgroundColor: TFX.white,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.navy,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  invoiceItemName: {
    fontSize: 14,
    color: TFX.navy,
    flex: 1,
  },
  invoiceItemPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: TFX.navy,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: TFX.grayMid,
    marginVertical: 10,
  },
  invoiceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  invoiceTotalLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.navy,
  },
  invoiceTotalValue: {
    fontSize: 20,
    fontWeight: '800' as const,
    fontFamily,
    color: TFX.blue,
  },
  invoiceVatSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TFX.grayMid,
  },
  invoiceVatTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: TFX.slate,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  invoiceVatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  invoiceVatLabel: {
    fontSize: 13,
    color: TFX.slate,
  },
  invoiceVatValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: TFX.navy,
  },
  paymentMethodsCard: {
    marginHorizontal: 16,
    backgroundColor: TFX.white,
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentMethodsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    fontFamily,
    color: TFX.navy,
    marginBottom: 4,
  },
  paymentMethodsSubtitle: {
    fontSize: 13,
    color: TFX.slate,
    marginBottom: 16,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: TFX.grayLight,
    gap: 12,
  },
  paymentMethodIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: TFX.navy,
  },
  paymentMethodDesc: {
    fontSize: 12,
    color: TFX.slate,
    marginTop: 1,
  },
  bookButton: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: TFX.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  bookButtonDisabled: {
    shadowOpacity: 0,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    fontFamily,
    color: '#fff',
  },
});
