import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Circle,
  Clock,
  FileQuestion,
  PlayCircle,
  Lock,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSchool } from '@/contexts/school-context';
import { useAuth } from '@/contexts/auth-context';
import { TFX } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import { fetchCourseStructure } from '@/services/lms-api';
import type { LmsChapter, LmsLessonMeta } from '@/types/lms';

function ChapterSection({
  chapter,
  index,
  totalChapters,
  onLessonPress,
  onQuizPress,
}: {
  chapter: LmsChapter;
  index: number;
  totalChapters: number;
  onLessonPress: (lessonId: string) => void;
  onQuizPress: (quizId: string) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = React.useState(
    chapter.progress > 0 && !chapter.isCompleted
  );

  return (
    <View style={styles.chapterCard}>
      <TouchableOpacity
        style={styles.chapterHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View style={styles.chapterHeaderLeft}>
          <View
            style={[
              styles.chapterNumber,
              {
                backgroundColor: chapter.isCompleted
                  ? TFX.green + '18'
                  : chapter.progress > 0
                    ? TFX.blue + '18'
                    : TFX.grayMid,
              },
            ]}
          >
            {chapter.isCompleted ? (
              <CheckCircle size={18} color={TFX.green} />
            ) : (
              <Text
                style={[
                  styles.chapterNumberText,
                  { color: chapter.progress > 0 ? TFX.blue : TFX.slate },
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>
          <View style={styles.chapterTitleBox}>
            <Text style={styles.chapterTitle} numberOfLines={2}>
              {chapter.title}
            </Text>
            <Text style={styles.chapterMeta}>
              {t('lmsScreen.chapterOf', {
                current: index + 1,
                total: totalChapters,
              })}{' '}
              · {chapter.lessons.length} {t('lmsScreen.lessons').toLowerCase()}
              {chapter.quiz ? ` · 1 ${t('quizScreen.title').toLowerCase()}` : ''}
            </Text>
          </View>
        </View>
        <ChevronRight
          size={18}
          color={TFX.slate}
          style={{
            transform: [{ rotate: expanded ? '90deg' : '0deg' }],
          }}
        />
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={styles.chapterProgressBg}>
        <View
          style={[
            styles.chapterProgressFill,
            {
              width: `${chapter.progress}%`,
              backgroundColor: chapter.isCompleted ? TFX.green : TFX.blue,
            },
          ]}
        />
      </View>

      {expanded && (
        <View style={styles.chapterContent}>
          {chapter.lessons.map((lesson, li) => (
            <TouchableOpacity
              key={lesson.id}
              style={styles.lessonRow}
              activeOpacity={0.75}
              onPress={() => onLessonPress(lesson.id)}
            >
              <View style={styles.lessonLeft}>
                {lesson.isCompleted ? (
                  <CheckCircle size={18} color={TFX.green} />
                ) : lesson.progress > 0 ? (
                  <PlayCircle size={18} color={TFX.blue} />
                ) : (
                  <Circle size={18} color={TFX.grayMid} />
                )}
                <View style={styles.lessonInfo}>
                  <Text
                    style={[
                      styles.lessonTitle,
                      lesson.isCompleted && styles.lessonTitleDone,
                    ]}
                    numberOfLines={1}
                  >
                    {lesson.title}
                  </Text>
                  <View style={styles.lessonMetaRow}>
                    {lesson.type === 'video' && (
                      <View style={styles.lessonBadge}>
                        <PlayCircle size={10} color={TFX.blue} />
                        <Text style={styles.lessonBadgeText}>Video</Text>
                      </View>
                    )}
                    {lesson.estimatedMinutes && (
                      <View style={styles.lessonMetaItem}>
                        <Clock size={10} color={TFX.slate} />
                        <Text style={styles.lessonMetaText}>
                          {t('lmsScreen.estimatedTime', {
                            minutes: lesson.estimatedMinutes,
                          })}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <ChevronRight size={16} color={TFX.grayMid} />
            </TouchableOpacity>
          ))}

          {/* Quiz at end of chapter */}
          {chapter.quiz && (
            <TouchableOpacity
              style={styles.quizRow}
              activeOpacity={0.75}
              onPress={() => onQuizPress(chapter.quiz!.id)}
            >
              <View style={styles.lessonLeft}>
                <View
                  style={[
                    styles.quizIcon,
                    {
                      backgroundColor: chapter.quiz.isCompleted
                        ? TFX.green + '18'
                        : TFX.orange + '18',
                    },
                  ]}
                >
                  <FileQuestion
                    size={16}
                    color={chapter.quiz.isCompleted ? TFX.green : TFX.orange}
                  />
                </View>
                <View style={styles.lessonInfo}>
                  <Text style={styles.lessonTitle}>{chapter.quiz.title}</Text>
                  <View style={styles.lessonMetaRow}>
                    <Text style={styles.lessonMetaText}>
                      {chapter.quiz.questionCount} {t('quizScreen.question').toLowerCase()}
                    </Text>
                    {chapter.quiz.bestScore !== undefined && (
                      <Text style={styles.lessonMetaText}>
                        {t('quizScreen.bestScore', { score: chapter.quiz.bestScore })}
                      </Text>
                    )}
                    {chapter.quiz.attempts > 0 && (
                      <Text style={styles.lessonMetaText}>
                        {t('quizScreen.attempts', { count: chapter.quiz.attempts })}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              <ChevronRight size={16} color={TFX.grayMid} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function CourseDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { config } = useSchool();
  const { accessToken } = useAuth();

  const structureQuery = useQuery({
    queryKey: ['course-structure', courseId],
    queryFn: () =>
      fetchCourseStructure(config!.apiBaseUrl, accessToken!, courseId!, 'sv-SE'),
    enabled: !!config?.apiBaseUrl && !!accessToken && !!courseId,
  });

  const courseData = structureQuery.data?.data;

  const overallProgress = useMemo(() => {
    if (!courseData?.chapters?.length) return 0;
    const total = courseData.chapters.reduce((s, c) => s + c.progress, 0);
    return Math.round(total / courseData.chapters.length);
  }, [courseData]);

  const handleLessonPress = useCallback(
    (lessonId: string) => {
      router.push({
        pathname: '/lms/lesson',
        params: { lessonId, courseId },
      });
    },
    [router, courseId],
  );

  const handleQuizPress = useCallback(
    (quizId: string) => {
      router.push({
        pathname: '/lms/quiz',
        params: { quizId, courseId },
      });
    },
    [router, courseId],
  );

  if (structureQuery.isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={TFX.blue} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[TFX.blueDeep, TFX.navy]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={22} color={TFX.white} />
            <Text style={styles.backBtnText}>{t('lmsScreen.backToCourses')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {courseData?.title ?? t('lmsScreen.courseDetails')}
          </Text>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{courseData?.chapters?.length ?? 0}</Text>
              <Text style={styles.headerStatLabel}>{t('lmsScreen.chapters')}</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{overallProgress}%</Text>
              <Text style={styles.headerStatLabel}>{t('lmsScreen.progress')}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {courseData?.chapters?.map((chapter, i) => (
          <ChapterSection
            key={chapter.id}
            chapter={chapter}
            index={i}
            totalChapters={courseData.chapters.length}
            onLessonPress={handleLessonPress}
            onQuizPress={handleQuizPress}
          />
        ))}
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
  loadingRoot: {
    flex: 1,
    backgroundColor: TFX.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily,
    color: TFX.slate,
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerSafe: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    marginLeft: -4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily,
    color: 'rgba(255,255,255,0.8)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily,
    color: TFX.white,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 20,
  },
  headerStat: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily,
    color: TFX.white,
  },
  headerStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  headerStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  chapterCard: {
    backgroundColor: TFX.white,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  chapterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  chapterNumber: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumberText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily,
  },
  chapterTitleBox: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily,
    color: TFX.navy,
    marginBottom: 2,
  },
  chapterMeta: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily,
    color: TFX.slate,
  },
  chapterProgressBg: {
    height: 3,
    backgroundColor: TFX.grayLight,
  },
  chapterProgressFill: {
    height: 3,
  },
  chapterContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TFX.grayLight,
  },
  lessonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily,
    color: TFX.navy,
    marginBottom: 3,
  },
  lessonTitleDone: {
    color: TFX.slate,
    textDecorationLine: 'line-through',
  },
  lessonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lessonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TFX.blue + '12',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  lessonBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily,
    color: TFX.blue,
  },
  lessonMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  lessonMetaText: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily,
    color: TFX.slate,
  },
  quizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 4,
    backgroundColor: TFX.orange + '08',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: TFX.grayLight,
  },
  quizIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
