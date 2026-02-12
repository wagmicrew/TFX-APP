import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  BookOpen,
  Clock,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSchool } from '@/contexts/school-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { TFX } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import { fetchLesson, updateLessonProgress } from '@/services/lms-api';
import { WebView } from 'react-native-webview';
import { Video, ResizeMode } from 'expo-av';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = (SCREEN_WIDTH - 40) * 9 / 16;

function VideoPlayer({ url, onProgress }: { url: string; onProgress?: (percent: number) => void }) {
  const videoRef = useRef<Video>(null);

  return (
    <View style={lessonMediaStyles.videoContainer}>
      <Video
        ref={videoRef}
        source={{ uri: url }}
        style={lessonMediaStyles.video}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && onProgress && status.durationMillis && status.durationMillis > 0) {
            onProgress(Math.round((status.positionMillis / status.durationMillis) * 100));
          }
        }}
        onError={(error: string) => console.warn('[Video] Error:', error)}
      />
    </View>
  );
}

function HtmlContent({ html, baseUrl }: { html: string; baseUrl?: string }) {
  const { width } = useWindowDimensions();
  const [webViewHeight, setWebViewHeight] = useState(300);

  const wrappedHtml = `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>
      body { font-family: -apple-system, sans-serif; font-size: 16px; line-height: 1.6; color: #1E293B; padding: 0; margin: 0; }
      img { max-width: 100%; height: auto; border-radius: 8px; }
      h1,h2,h3 { color: #0F2B3E; }
      a { color: #1B8FCE; }
      pre, code { background: #F1F5F9; padding: 8px; border-radius: 6px; overflow-x: auto; font-size: 14px; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid #E2E8F0; padding: 8px; }
    </style>
    </head><body>${html}</body>
    <script>
      window.ReactNativeWebView.postMessage(JSON.stringify({ height: document.body.scrollHeight }));
      new MutationObserver(() => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ height: document.body.scrollHeight }));
      }).observe(document.body, { subtree: true, childList: true });
    </script>
    </html>`;

  return (
    <WebView
      source={{ html: wrappedHtml, baseUrl }}
      style={{ width: width - 40, height: webViewHeight }}
      scrollEnabled={false}
      originWhitelist={['*']}
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.height) setWebViewHeight(data.height + 20);
        } catch {}
      }}
    />
  );
}

export default function LessonScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { lessonId, courseId } = useLocalSearchParams<{
    lessonId: string;
    courseId: string;
  }>();
  const { config } = useSchool();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);

  const lessonQuery = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => fetchLesson(config!.apiBaseUrl, accessToken!, lessonId!),
    enabled: !!config?.apiBaseUrl && !!accessToken && !!lessonId,
  });

  const lesson = lessonQuery.data?.data;

  const completeMutation = useMutation({
    mutationFn: () =>
      updateLessonProgress(config!.apiBaseUrl, accessToken!, lessonId!, 100),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['course-structure', courseId] });
      queryClient.invalidateQueries({ queryKey: ['lms-courses'] });
    },
  });

  const handleComplete = useCallback(() => {
    if (!lesson?.isCompleted) {
      completeMutation.mutate();
    }
  }, [lesson, completeMutation]);

  const handleNext = useCallback(() => {
    if (lesson?.nextLessonId) {
      router.replace({
        pathname: '/lms/lesson',
        params: { lessonId: lesson.nextLessonId, courseId },
      });
    }
  }, [lesson, router, courseId]);

  const handlePrev = useCallback(() => {
    if (lesson?.prevLessonId) {
      router.replace({
        pathname: '/lms/lesson',
        params: { lessonId: lesson.prevLessonId, courseId },
      });
    }
  }, [lesson, router, courseId]);

  if (lessonQuery.isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={TFX.blue} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.retryText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient
        colors={[TFX.blueDeep, TFX.navy]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={22} color={TFX.white} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerLabel}>{t('lmsScreen.lessonContent')}</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {lesson.title}
              </Text>
            </View>
            {lesson.isCompleted && (
              <CheckCircle size={22} color={TFX.green} />
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Lesson content */}
      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Lesson type badge */}
        <View style={styles.typeBadgeRow}>
          <View style={styles.typeBadge}>
            <BookOpen size={12} color={TFX.blue} />
            <Text style={styles.typeBadgeText}>
              {lesson.type === 'video' ? 'Video' : lesson.type === 'interactive' ? 'Interactive' : 'Text'}
            </Text>
          </View>
          {lesson.estimatedMinutes && (
            <View style={styles.typeBadge}>
              <Clock size={12} color={TFX.slate} />
              <Text style={[styles.typeBadgeText, { color: TFX.slate }]}>
                {t('lmsScreen.estimatedTime', { minutes: lesson.estimatedMinutes })}
              </Text>
            </View>
          )}
        </View>

        {/* Video player for video lessons */}
        {lesson.type === 'video' && lesson.videoUrl && (
          <VideoPlayer
            url={lesson.videoUrl}
            onProgress={(percent) => {
              if (percent >= 90 && !lesson.isCompleted) {
                completeMutation.mutate();
              }
            }}
          />
        )}

        {/* Render content: HTML via WebView or plain text fallback */}
        <View style={styles.lessonBody}>
          {lesson.content ? (
            lesson.content.includes('<') ? (
              <HtmlContent html={lesson.content} baseUrl={config?.apiBaseUrl} />
            ) : (
              <Text style={styles.lessonContent}>{lesson.content}</Text>
            )
          ) : (
            <Text style={styles.lessonContent}>{t('common.loading')}</Text>
          )}
        </View>

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          {lesson.prevLessonId ? (
            <TouchableOpacity style={styles.navBtn} onPress={handlePrev} activeOpacity={0.8}>
              <ChevronLeft size={18} color={TFX.blue} />
              <Text style={styles.navBtnText}>{t('lmsScreen.prevLesson')}</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          {lesson.nextLessonId ? (
            <TouchableOpacity style={styles.navBtnNext} onPress={handleNext} activeOpacity={0.8}>
              <Text style={styles.navBtnNextText}>{t('lmsScreen.nextLesson')}</Text>
              <ChevronRight size={18} color={TFX.white} />
            </TouchableOpacity>
          ) : (
            <View />
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom action */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.completeBtn,
            lesson.isCompleted && styles.completedBtn,
          ]}
          onPress={handleComplete}
          activeOpacity={0.85}
          disabled={lesson.isCompleted || completeMutation.isPending}
        >
          {completeMutation.isPending ? (
            <ActivityIndicator size="small" color={TFX.white} />
          ) : (
            <>
              <CheckCircle
                size={20}
                color={lesson.isCompleted ? TFX.green : TFX.white}
              />
              <Text
                style={[
                  styles.completeBtnText,
                  lesson.isCompleted && styles.completedBtnText,
                ]}
              >
                {lesson.isCompleted
                  ? t('lmsScreen.alreadyCompleted')
                  : t('lmsScreen.markComplete')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TFX.white,
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
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily,
    color: TFX.danger,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily,
    color: TFX.blue,
    marginTop: 8,
  },
  headerGradient: {
    paddingBottom: 16,
  },
  headerSafe: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily,
    color: TFX.white,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: TFX.grayLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily,
    color: TFX.blue,
  },
  lessonBody: {
    marginBottom: 24,
  },
  lessonContent: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily,
    color: TFX.navy,
    lineHeight: 24,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: TFX.grayLight,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: TFX.grayLight,
    borderRadius: 10,
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily,
    color: TFX.blue,
  },
  navBtnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: TFX.blue,
    borderRadius: 10,
  },
  navBtnNextText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily,
    color: TFX.white,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TFX.grayLight,
    backgroundColor: TFX.white,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TFX.blue,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 4,
  },
  completedBtn: {
    backgroundColor: TFX.green + '18',
  },
  completeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily,
    color: TFX.white,
  },
  completedBtnText: {
    color: TFX.green,
  },
});

const lessonMediaStyles = StyleSheet.create({
  videoContainer: {
    width: SCREEN_WIDTH - 40,
    height: VIDEO_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 20,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
