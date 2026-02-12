import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  GraduationCap,
  ChevronRight,
  Clock,
  CheckCircle,
  BarChart3,
  FileQuestion,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSchool } from '@/contexts/school-context';
import { useAuth } from '@/contexts/auth-context';
import { useAppConfig } from '@/contexts/app-config-context';
import { TFX } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import { fetchLmsCourses } from '@/services/lms-api';
import type { LmsCourse } from '@/types/lms';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function ProgressRing({ progress, size = 48, strokeWidth = 4 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: TFX.grayMid,
      }} />
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: progress >= 100 ? TFX.green : TFX.blue,
        borderTopColor: 'transparent',
        borderRightColor: progress > 25 ? (progress >= 100 ? TFX.green : TFX.blue) : 'transparent',
        borderBottomColor: progress > 50 ? (progress >= 100 ? TFX.green : TFX.blue) : 'transparent',
        borderLeftColor: progress > 75 ? (progress >= 100 ? TFX.green : TFX.blue) : 'transparent',
        transform: [{ rotate: '-45deg' }],
      }} />
      <Text style={{
        fontSize: 11,
        fontWeight: '700',
        fontFamily,
        color: progress >= 100 ? TFX.green : TFX.navy,
      }}>
        {progress >= 100 ? '✓' : `${Math.round(progress)}%`}
      </Text>
    </View>
  );
}

function CourseCard({ course, onPress }: { course: LmsCourse; onPress: () => void }) {
  const { t } = useTranslation();

  const statusColor = course.isCompleted
    ? TFX.green
    : course.progress > 0
      ? TFX.orange
      : TFX.slate;

  const statusLabel = course.isCompleted
    ? t('lmsScreen.completed')
    : course.progress > 0
      ? t('lmsScreen.inProgress')
      : t('lmsScreen.notStarted');

  return (
    <TouchableOpacity style={styles.courseCard} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.courseCardInner}>
        <View style={styles.courseIconBox}>
          <LinearGradient
            colors={course.isCompleted ? [TFX.green, TFX.tealDark] : [TFX.blue, TFX.blueDark]}
            style={styles.courseIconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <BookOpen size={22} color={TFX.white} />
          </LinearGradient>
        </View>

        <View style={styles.courseInfo}>
          <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
          <Text style={styles.courseDesc} numberOfLines={1}>{course.description}</Text>
          <View style={styles.courseMeta}>
            <View style={styles.courseMetaItem}>
              <BookOpen size={12} color={TFX.slate} />
              <Text style={styles.courseMetaText}>
                {t('lmsScreen.chaptersCount', { count: course.totalChapters })}
              </Text>
            </View>
            {course.totalQuizzes > 0 && (
              <View style={styles.courseMetaItem}>
                <FileQuestion size={12} color={TFX.slate} />
                <Text style={styles.courseMetaText}>
                  {t('lmsScreen.quizzesCount', { count: course.totalQuizzes })}
                </Text>
              </View>
            )}
            {course.estimatedMinutes && (
              <View style={styles.courseMetaItem}>
                <Clock size={12} color={TFX.slate} />
                <Text style={styles.courseMetaText}>
                  {t('lmsScreen.estimatedTime', { minutes: course.estimatedMinutes })}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.courseRight}>
          <ProgressRing progress={course.progress} size={44} />
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(course.progress, 100)}%`,
              backgroundColor: course.isCompleted ? TFX.green : TFX.blue,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <LinearGradient
        colors={[color + '20', color + '08']}
        style={styles.statGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.statIconBox, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </LinearGradient>
    </View>
  );
}

export default function LmsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { config } = useSchool();
  const { accessToken } = useAuth();
  const { isFeatureEnabled } = useAppConfig();

  const lmsEnabled = isFeatureEnabled('featureLms');

  if (!lmsEnabled) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={[TFX.blueDeep, TFX.navy]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SafeAreaView edges={['top']} style={styles.headerSafe}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>{t('lmsScreen.title')}</Text>
                <Text style={styles.headerSubtitle}>{t('lmsScreen.dashboard')}</Text>
              </View>
              <View style={styles.headerIcon}>
                <GraduationCap size={28} color={TFX.white} />
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.disabledContainer}>
          <GraduationCap size={48} color={TFX.slate} />
          <Text style={styles.disabledTitle}>{t('lmsScreen.featureDisabled', 'LMS inte aktiverat')}</Text>
          <Text style={styles.disabledText}>{t('lmsScreen.featureDisabledDesc', 'Kontakta din trafikskola för att aktivera kurser.')}</Text>
        </View>
      </View>
    );
  }

  const coursesQuery = useQuery({
    queryKey: ['lms-courses'],
    queryFn: () => fetchLmsCourses(config!.apiBaseUrl, accessToken!, 'sv-SE'),
    enabled: !!config?.apiBaseUrl && !!accessToken,
  });

  const courses = coursesQuery.data?.data?.courses ?? [];

  const stats = useMemo(() => {
    const total = courses.length;
    const completed = courses.filter(c => c.isCompleted).length;
    const inProgressCount = courses.filter(c => c.progress > 0 && !c.isCompleted).length;
    const totalQuizzes = courses.reduce((sum, c) => sum + c.totalQuizzes, 0);
    const avgProgress = total > 0
      ? Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / total)
      : 0;
    return { total, completed, inProgressCount, totalQuizzes, avgProgress };
  }, [courses]);

  const continueCourse = useMemo(() => {
    return courses.find(c => c.progress > 0 && !c.isCompleted);
  }, [courses]);

  const handleCoursePress = useCallback((courseId: string) => {
    router.push({ pathname: '/lms/course-detail', params: { courseId } });
  }, [router]);

  const handleRefresh = useCallback(() => {
    coursesQuery.refetch();
  }, [coursesQuery]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[TFX.blueDeep, TFX.navy]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>{t('lmsScreen.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('lmsScreen.dashboard')}</Text>
            </View>
            <View style={styles.headerIcon}>
              <GraduationCap size={28} color={TFX.white} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={coursesQuery.isFetching && !coursesQuery.isLoading}
            onRefresh={handleRefresh}
            tintColor={TFX.blue}
          />
        }
      >
        {/* Stats row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
        >
          <StatCard
            icon={<BookOpen size={18} color={TFX.blue} />}
            value={String(stats.total)}
            label={t('lmsScreen.allCourses')}
            color={TFX.blue}
          />
          <StatCard
            icon={<BarChart3 size={18} color={TFX.orange} />}
            value={`${stats.avgProgress}%`}
            label={t('lmsScreen.overallProgress')}
            color={TFX.orange}
          />
          <StatCard
            icon={<CheckCircle size={18} color={TFX.green} />}
            value={String(stats.completed)}
            label={t('lmsScreen.completed')}
            color={TFX.green}
          />
          <StatCard
            icon={<FileQuestion size={18} color={TFX.teal} />}
            value={String(stats.totalQuizzes)}
            label={t('quizScreen.title')}
            color={TFX.teal}
          />
        </ScrollView>

        {/* Continue where you left off */}
        {continueCourse && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('lmsScreen.continueWhere')}</Text>
            <TouchableOpacity
              style={styles.continueCard}
              activeOpacity={0.85}
              onPress={() => handleCoursePress(continueCourse.id)}
            >
              <LinearGradient
                colors={[TFX.blue, TFX.blueDark]}
                style={styles.continueGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.continueContent}>
                  <BookOpen size={24} color={TFX.white} />
                  <View style={styles.continueText}>
                    <Text style={styles.continueTitle} numberOfLines={1}>{continueCourse.title}</Text>
                    <Text style={styles.continueProgress}>
                      {t('lmsScreen.courseProgress', { progress: continueCourse.progress })}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
                </View>
                <View style={styles.continueBarBg}>
                  <View
                    style={[styles.continueBarFill, { width: `${continueCourse.progress}%` }]}
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Courses list */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('lmsScreen.myCourses')}</Text>
            <Text style={styles.courseCount}>{courses.length}</Text>
          </View>

          {coursesQuery.isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={TFX.blue} />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : courses.length === 0 ? (
            <View style={styles.emptyBox}>
              <GraduationCap size={48} color={TFX.grayMid} />
              <Text style={styles.emptyTitle}>{t('lmsScreen.noCourses')}</Text>
              <Text style={styles.emptyDesc}>{t('lmsScreen.noCoursesDesc')}</Text>
            </View>
          ) : (
            courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                onPress={() => handleCoursePress(course.id)}
              />
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TFX.grayLight,
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerSafe: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily,
    color: TFX.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  statsRow: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: (SCREEN_WIDTH - 62) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily,
    color: TFX.slate,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily,
    color: TFX.navy,
    marginBottom: 12,
  },
  courseCount: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily,
    color: TFX.slate,
    backgroundColor: TFX.grayMid,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  courseCard: {
    backgroundColor: TFX.white,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  courseCardInner: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  courseIconBox: {
    marginRight: 14,
  },
  courseIconGradient: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseInfo: {
    flex: 1,
    marginRight: 12,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily,
    color: TFX.navy,
    marginBottom: 3,
  },
  courseDesc: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily,
    color: TFX.slate,
    marginBottom: 6,
  },
  courseMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  courseMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseMetaText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily,
    color: TFX.slate,
  },
  courseRight: {
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: TFX.grayLight,
  },
  progressBarFill: {
    height: 3,
    borderRadius: 2,
  },
  continueCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: TFX.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  continueGradient: {
    padding: 18,
    borderRadius: 16,
  },
  continueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  continueText: {
    flex: 1,
  },
  continueTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily,
    color: TFX.white,
    marginBottom: 3,
  },
  continueProgress: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily,
    color: 'rgba(255,255,255,0.75)',
  },
  continueBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: 14,
  },
  continueBarFill: {
    height: 4,
    backgroundColor: TFX.white,
    borderRadius: 2,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily,
    color: TFX.slate,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: TFX.white,
    borderRadius: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily,
    color: TFX.navy,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily,
    color: TFX.slate,
    textAlign: 'center',
  },
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: TFX.grayUltraLight,
  },
  disabledTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily,
    color: TFX.navy,
    marginTop: 8,
    textAlign: 'center',
  },
  disabledText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily,
    color: TFX.slate,
    textAlign: 'center',
    lineHeight: 20,
  },
});
