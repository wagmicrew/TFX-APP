import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  FileQuestion,
  Trophy,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSchool } from '@/contexts/school-context';
import { useAuth } from '@/contexts/auth-context';
import { TFX } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import { fetchQuiz, submitQuiz } from '@/services/lms-api';
import type { QuizQuestion, QuizAnswer, QuizResult, QuizQuestionResult } from '@/types/lms';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type QuizPhase = 'taking' | 'results' | 'review';

export default function QuizScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { quizId, courseId } = useLocalSearchParams<{
    quizId: string;
    courseId: string;
  }>();
  const { config } = useSchool();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<QuizPhase>('taking');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const quizQuery = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => fetchQuiz(config!.apiBaseUrl, accessToken!, quizId!),
    enabled: !!config?.apiBaseUrl && !!accessToken && !!quizId,
  });

  const quiz = quizQuery.data?.data;
  const questions = quiz?.questions ?? [];
  const currentQuestion = questions[currentIndex];

  // Timer
  useEffect(() => {
    if (phase === 'taking') {
      timerRef.current = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Time limit check
  useEffect(() => {
    if (quiz?.timeLimit && timeSpent >= quiz.timeLimit && phase === 'taking') {
      handleSubmit();
    }
  }, [timeSpent, quiz?.timeLimit, phase]);

  const submitMutation = useMutation({
    mutationFn: () => {
      const submission = {
        quizId: quizId!,
        answers: Object.entries(answers).map(([questionId, selectedOptionIds]) => ({
          questionId,
          selectedOptionIds,
        })),
        timeSpent,
      };
      return submitQuiz(config!.apiBaseUrl, accessToken!, submission);
    },
    onSuccess: (data) => {
      if (data.data) {
        setResult(data.data);
        setPhase('results');
        if (timerRef.current) clearInterval(timerRef.current);
        queryClient.invalidateQueries({ queryKey: ['course-structure', courseId] });
        queryClient.invalidateQueries({ queryKey: ['lms-courses'] });
      }
    },
  });

  const handleSelectOption = useCallback(
    (questionId: string, optionId: string, type: QuizQuestion['type']) => {
      setAnswers(prev => {
        const current = prev[questionId] ?? [];
        if (type === 'multiple') {
          // Toggle selection
          if (current.includes(optionId)) {
            return { ...prev, [questionId]: current.filter(id => id !== optionId) };
          }
          return { ...prev, [questionId]: [...current, optionId] };
        }
        // Single / true-false: replace
        return { ...prev, [questionId]: [optionId] };
      });
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: -1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, questions.length, slideAnim]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, slideAnim]);

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  const handleSubmit = useCallback(() => {
    if (unansweredCount > 0) {
      Alert.alert(
        t('quizScreen.submitConfirm'),
        t('quizScreen.submitConfirmDesc', {
          answered: answeredCount,
          total: questions.length,
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('quizScreen.submit'),
            onPress: () => submitMutation.mutate(),
          },
        ],
      );
    } else {
      submitMutation.mutate();
    }
  }, [unansweredCount, answeredCount, questions.length, t, submitMutation]);

  const handleExit = useCallback(() => {
    if (phase === 'taking') {
      Alert.alert(
        t('quizScreen.exitConfirm'),
        t('quizScreen.exitConfirmDesc'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.yes'), style: 'destructive', onPress: () => router.back() },
        ],
      );
    } else {
      router.back();
    }
  }, [phase, t, router]);

  const handleRetake = useCallback(() => {
    setPhase('taking');
    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
    setTimeSpent(0);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (quizQuery.isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={TFX.blue} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  // ─── RESULTS PHASE ────────────────────────────
  if (phase === 'results' && result) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={result.passed ? [TFX.green, TFX.tealDark] : [TFX.danger, '#B91C1C']}
          style={styles.resultHeaderGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SafeAreaView edges={['top']} style={styles.resultHeaderSafe}>
            <Trophy size={48} color={TFX.white} />
            <Text style={styles.resultHeadline}>
              {result.passed ? t('quizScreen.passed') : t('quizScreen.failed')}
            </Text>
            <Text style={styles.resultSubline}>
              {result.passed ? t('quizScreen.passedDesc') : t('quizScreen.failedDesc')}
            </Text>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.resultContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Score circle */}
          <View style={styles.scoreCircle}>
            <View
              style={[
                styles.scoreCircleInner,
                { borderColor: result.passed ? TFX.green : TFX.danger },
              ]}
            >
              <Text
                style={[
                  styles.scoreValue,
                  { color: result.passed ? TFX.green : TFX.danger },
                ]}
              >
                {result.score}%
              </Text>
              <Text style={styles.scoreLabel}>{t('quizScreen.score')}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.resultStats}>
            <View style={styles.resultStatItem}>
              <CheckCircle size={20} color={TFX.green} />
              <Text style={styles.resultStatValue}>{result.correctAnswers}</Text>
              <Text style={styles.resultStatLabel}>
                {t('quizScreen.correct')}
              </Text>
            </View>
            <View style={styles.resultStatDivider} />
            <View style={styles.resultStatItem}>
              <XCircle size={20} color={TFX.danger} />
              <Text style={styles.resultStatValue}>{result.wrongAnswers}</Text>
              <Text style={styles.resultStatLabel}>{t('quizScreen.wrong')}</Text>
            </View>
            <View style={styles.resultStatDivider} />
            <View style={styles.resultStatItem}>
              <Clock size={20} color={TFX.blue} />
              <Text style={styles.resultStatValue}>{formatTime(timeSpent)}</Text>
              <Text style={styles.resultStatLabel}>{t('quizScreen.timeRemaining')}</Text>
            </View>
          </View>

          {/* Passing score info */}
          <View style={styles.passingInfo}>
            <Text style={styles.passingText}>
              {t('quizScreen.passingScore', { score: quiz?.passingScore ?? 0 })}
            </Text>
            <Text style={styles.passingText}>
              {t('quizScreen.yourScore', { score: result.score })}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => {
                setReviewIndex(0);
                setPhase('review');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.reviewBtnText}>{t('quizScreen.reviewAnswers')}</Text>
            </TouchableOpacity>

            {!result.passed && (
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={handleRetake}
                activeOpacity={0.85}
              >
                <RotateCcw size={18} color={TFX.white} />
                <Text style={styles.retakeBtnText}>{t('quizScreen.tryAgain')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.backCourseBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <ArrowLeft size={18} color={TFX.blue} />
              <Text style={styles.backCourseBtnText}>
                {t('quizScreen.backToCourse')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── REVIEW PHASE ─────────────────────────────
  if (phase === 'review' && result) {
    const reviewQuestion = questions[reviewIndex];
    const questionResult = result.results[reviewIndex];

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
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setPhase('results')}
              >
                <ChevronLeft size={22} color={TFX.white} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('quizScreen.reviewAnswers')}</Text>
              <Text style={styles.headerCounter}>
                {reviewIndex + 1}/{questions.length}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.questionContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Correct/Wrong badge */}
          <View
            style={[
              styles.reviewBadge,
              {
                backgroundColor: questionResult?.correct
                  ? TFX.green + '18'
                  : TFX.danger + '18',
              },
            ]}
          >
            {questionResult?.correct ? (
              <CheckCircle size={16} color={TFX.green} />
            ) : (
              <XCircle size={16} color={TFX.danger} />
            )}
            <Text
              style={[
                styles.reviewBadgeText,
                {
                  color: questionResult?.correct ? TFX.green : TFX.danger,
                },
              ]}
            >
              {questionResult?.correct
                ? t('quizScreen.correct')
                : t('quizScreen.wrong')}
            </Text>
          </View>

          <Text style={styles.questionText}>{reviewQuestion?.text}</Text>

          {reviewQuestion?.options.map(option => {
            const isSelected = questionResult?.selectedOptionIds?.includes(option.id);
            const isCorrect = questionResult?.correctOptionIds?.includes(option.id);

            let optionStyle = styles.option;
            let bgColor = TFX.white;
            if (isCorrect) bgColor = TFX.green + '12';
            else if (isSelected && !isCorrect) bgColor = TFX.danger + '12';

            return (
              <View
                key={option.id}
                style={[
                  styles.option,
                  {
                    backgroundColor: bgColor,
                    borderColor: isCorrect
                      ? TFX.green
                      : isSelected
                        ? TFX.danger
                        : TFX.grayMid,
                  },
                ]}
              >
                <View style={styles.optionLeft}>
                  {isCorrect ? (
                    <CheckCircle size={20} color={TFX.green} />
                  ) : isSelected ? (
                    <XCircle size={20} color={TFX.danger} />
                  ) : (
                    <View style={styles.optionCircle} />
                  )}
                  <Text
                    style={[
                      styles.optionText,
                      isCorrect && { color: TFX.green, fontWeight: '700' },
                      isSelected && !isCorrect && { color: TFX.danger },
                    ]}
                  >
                    {option.text}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Explanation */}
          {questionResult?.explanation && (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationLabel}>
                {t('quizScreen.explanation')}
              </Text>
              <Text style={styles.explanationText}>
                {questionResult.explanation}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom nav */}
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <View style={styles.reviewNav}>
            <TouchableOpacity
              style={[styles.navBtn, reviewIndex === 0 && styles.navBtnDisabled]}
              onPress={() => setReviewIndex(prev => Math.max(0, prev - 1))}
              disabled={reviewIndex === 0}
            >
              <ChevronLeft size={18} color={reviewIndex === 0 ? TFX.grayMid : TFX.blue} />
              <Text
                style={[
                  styles.navBtnText,
                  reviewIndex === 0 && styles.navBtnTextDisabled,
                ]}
              >
                {t('quizScreen.previous')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.navBtn,
                reviewIndex === questions.length - 1 && styles.navBtnDisabled,
              ]}
              onPress={() =>
                setReviewIndex(prev => Math.min(questions.length - 1, prev + 1))
              }
              disabled={reviewIndex === questions.length - 1}
            >
              <Text
                style={[
                  styles.navBtnText,
                  reviewIndex === questions.length - 1 && styles.navBtnTextDisabled,
                ]}
              >
                {t('quizScreen.next')}
              </Text>
              <ChevronRight
                size={18}
                color={
                  reviewIndex === questions.length - 1 ? TFX.grayMid : TFX.blue
                }
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── TAKING PHASE ─────────────────────────────
  const selectedOptions = answers[currentQuestion?.id] ?? [];
  const isLastQuestion = currentIndex === questions.length - 1;
  const remainingTime = quiz?.timeLimit
    ? Math.max(0, quiz.timeLimit - timeSpent)
    : null;

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
            <TouchableOpacity style={styles.backBtn} onPress={handleExit}>
              <ChevronLeft size={22} color={TFX.white} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {quiz?.title ?? t('quizScreen.title')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t('quizScreen.questionOf', {
                  current: currentIndex + 1,
                  total: questions.length,
                })}
              </Text>
            </View>
            {remainingTime !== null && (
              <View style={styles.timerBadge}>
                <Clock size={14} color={remainingTime < 60 ? TFX.danger : TFX.white} />
                <Text
                  style={[
                    styles.timerText,
                    remainingTime < 60 && { color: TFX.danger },
                  ]}
                >
                  {formatTime(remainingTime)}
                </Text>
              </View>
            )}
          </View>

          {/* Progress dots */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.progressDots}
          >
            {questions.map((q, i) => (
              <TouchableOpacity
                key={q.id}
                onPress={() => setCurrentIndex(i)}
                style={[
                  styles.progressDot,
                  i === currentIndex && styles.progressDotActive,
                  answers[q.id] && styles.progressDotAnswered,
                ]}
              />
            ))}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Question */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [
              {
                translateX: slideAnim.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-SCREEN_WIDTH * 0.3, 0, SCREEN_WIDTH * 0.3],
                }),
              },
            ],
            opacity: slideAnim.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [0.5, 1, 0.5],
            }),
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.questionContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Question type hint */}
          <View style={styles.questionTypeBadge}>
            <FileQuestion size={14} color={TFX.orange} />
            <Text style={styles.questionTypeText}>
              {currentQuestion?.type === 'multiple'
                ? t('quizScreen.selectAnswers')
                : currentQuestion?.type === 'true-false'
                  ? t('quizScreen.trueOrFalse')
                  : t('quizScreen.selectAnswer')}
            </Text>
          </View>

          <Text style={styles.questionText}>{currentQuestion?.text}</Text>

          {/* Options */}
          {currentQuestion?.options.map(option => {
            const isSelected = selectedOptions.includes(option.id);
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.option,
                  isSelected && styles.optionSelected,
                ]}
                onPress={() =>
                  handleSelectOption(
                    currentQuestion.id,
                    option.id,
                    currentQuestion.type,
                  )
                }
                activeOpacity={0.8}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={[
                      styles.optionCircle,
                      isSelected && styles.optionCircleSelected,
                    ]}
                  >
                    {isSelected && <CheckCircle size={18} color={TFX.white} />}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {option.text}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Bottom nav */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
            onPress={handlePrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft
              size={18}
              color={currentIndex === 0 ? TFX.grayMid : TFX.blue}
            />
            <Text
              style={[
                styles.navBtnText,
                currentIndex === 0 && styles.navBtnTextDisabled,
              ]}
            >
              {t('quizScreen.previous')}
            </Text>
          </TouchableOpacity>

          {isLastQuestion ? (
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator size="small" color={TFX.white} />
              ) : (
                <Text style={styles.submitBtnText}>{t('quizScreen.submit')}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>{t('quizScreen.next')}</Text>
              <ChevronRight size={18} color={TFX.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* Answered count */}
        <Text style={styles.answeredCount}>
          {answeredCount}/{questions.length} {t('quizScreen.question').toLowerCase()}
          {unansweredCount > 0 && ` · ${t('quizScreen.unanswered', { count: unansweredCount })}`}
        </Text>
      </SafeAreaView>
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily,
    color: TFX.white,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  headerCounter: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily,
    color: 'rgba(255,255,255,0.8)',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily,
    color: TFX.white,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 14,
    paddingHorizontal: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressDotActive: {
    backgroundColor: TFX.white,
    width: 20,
    borderRadius: 4,
  },
  progressDotAnswered: {
    backgroundColor: TFX.teal,
  },
  content: {
    flex: 1,
  },
  questionContent: {
    padding: 20,
  },
  questionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TFX.orange + '14',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  questionTypeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily,
    color: TFX.orange,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily,
    color: TFX.navy,
    lineHeight: 26,
    marginBottom: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TFX.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: TFX.grayMid,
    padding: 16,
    marginBottom: 10,
  },
  optionSelected: {
    borderColor: TFX.blue,
    backgroundColor: TFX.blue + '08',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  optionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: TFX.grayMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCircleSelected: {
    borderColor: TFX.blue,
    backgroundColor: TFX.blue,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily,
    color: TFX.navy,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: TFX.blue,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TFX.grayMid,
    backgroundColor: TFX.white,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: TFX.grayLight,
    borderRadius: 12,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily,
    color: TFX.blue,
  },
  navBtnTextDisabled: {
    color: TFX.grayMid,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: TFX.blue,
    borderRadius: 12,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily,
    color: TFX.white,
  },
  submitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: TFX.green,
    borderRadius: 12,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily,
    color: TFX.white,
  },
  answeredCount: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    fontFamily,
    color: TFX.slate,
    marginTop: 8,
    marginBottom: 4,
  },
  reviewNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  reviewBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily,
  },
  explanationBox: {
    backgroundColor: TFX.blue + '0A',
    borderLeftWidth: 3,
    borderLeftColor: TFX.blue,
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily,
    color: TFX.blue,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  explanationText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily,
    color: TFX.navy,
    lineHeight: 20,
  },

  // Results phase
  resultHeaderGradient: {
    paddingBottom: 30,
  },
  resultHeaderSafe: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    gap: 10,
  },
  resultHeadline: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily,
    color: TFX.white,
  },
  resultSubline: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  resultContent: {
    padding: 20,
    alignItems: 'center',
  },
  scoreCircle: {
    marginVertical: 20,
  },
  scoreCircleInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TFX.white,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily,
    color: TFX.slate,
  },
  resultStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TFX.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  resultStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  resultStatValue: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily,
    color: TFX.navy,
  },
  resultStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily,
    color: TFX.slate,
  },
  resultStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: TFX.grayMid,
  },
  passingInfo: {
    backgroundColor: TFX.grayLight,
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 20,
    gap: 4,
  },
  passingText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily,
    color: TFX.slate,
    textAlign: 'center',
  },
  resultActions: {
    width: '100%',
    gap: 10,
  },
  reviewBtn: {
    backgroundColor: TFX.white,
    borderWidth: 2,
    borderColor: TFX.blue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  reviewBtnText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily,
    color: TFX.blue,
  },
  retakeBtn: {
    flexDirection: 'row',
    backgroundColor: TFX.orange,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retakeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily,
    color: TFX.white,
  },
  backCourseBtn: {
    flexDirection: 'row',
    backgroundColor: TFX.grayLight,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backCourseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily,
    color: TFX.blue,
  },
});
