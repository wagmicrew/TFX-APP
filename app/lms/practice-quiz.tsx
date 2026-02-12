/**
 * Practice Quiz Screen
 *
 * Standalone theory practice quiz using q_questions / q_answers bank.
 * Two phases:
 *   1. Setup — pick category, question count → start
 *   2. Taking / Results / Review — reuses full quiz UI logic
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  BookOpen,
  Zap,
  Filter,
  Hash,
  Eye,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSchool } from '@/contexts/school-context';
import { useAuth } from '@/contexts/auth-context';
import { TFX } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import {
  fetchPracticeCategories,
  fetchPracticeQuiz,
  submitPracticeQuiz,
} from '@/services/lms-api';
import type {
  QuizQuestion,
  QuizResult,
  QuizQuestionResult,
  PracticeCategory,
} from '@/types/lms';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Phase = 'setup' | 'taking' | 'results' | 'review';

const QUESTION_COUNTS = [10, 20, 30, 50];

export default function PracticeQuizScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { config } = useSchool();
  const { accessToken } = useAuth();

  // Setup state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(20);

  // Quiz state
  const [phase, setPhase] = useState<Phase>('setup');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Fetch categories
  const categoriesQuery = useQuery({
    queryKey: ['practice-categories'],
    queryFn: () => fetchPracticeCategories(config!.apiBaseUrl, 'sv'),
    enabled: !!config?.apiBaseUrl,
  });

  const categories = categoriesQuery.data?.data?.categories ?? [];
  const totalQuestions = categoriesQuery.data?.data?.totalQuestions ?? 0;

  // Fetch practice quiz (only when started)
  const quizQuery = useQuery({
    queryKey: ['practice-quiz', selectedCategory, questionCount],
    queryFn: () =>
      fetchPracticeQuiz(config!.apiBaseUrl, {
        count: questionCount,
        category: selectedCategory ?? undefined,
        locale: 'sv',
      }),
    enabled: false, // manual trigger
  });

  const quiz = quizQuery.data?.data;
  const questions = quiz?.questions ?? [];
  const currentQuestion = questions[currentIndex];

  // Timer
  useEffect(() => {
    if (phase === 'taking') {
      timerRef.current = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: () => {
      const submission = {
        quizId: 'practice',
        answers: Object.entries(answers).map(([questionId, selectedOptionIds]) => ({
          questionId,
          selectedOptionIds,
        })),
        timeSpent,
      };
      return submitPracticeQuiz(config!.apiBaseUrl, submission);
    },
    onSuccess: (data) => {
      if (data.data) {
        setResult(data.data);
        setPhase('results');
        if (timerRef.current) clearInterval(timerRef.current);
      }
    },
  });

  const handleStart = useCallback(async () => {
    const res = await quizQuery.refetch();
    if (res.data?.data?.questions?.length) {
      setPhase('taking');
      setCurrentIndex(0);
      setAnswers({});
      setResult(null);
      setTimeSpent(0);
    }
  }, [quizQuery]);

  const handleSelectOption = useCallback(
    (questionId: string, optionId: string, type: QuizQuestion['type']) => {
      setAnswers((prev) => {
        const current = prev[questionId] ?? [];
        if (type === 'multiple') {
          const updated = current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId];
          return { ...prev, [questionId]: updated };
        }
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
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentIndex((prev) => prev + 1);
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
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, slideAnim]);

  const handleSubmit = useCallback(() => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      Alert.alert(
        t('quizScreen.submitIncomplete', 'Ofullständigt'),
        t('quizScreen.submitIncompleteDesc', 'Du har inte svarat på alla frågor. Vill du skicka in ändå?'),
        [
          { text: t('common.cancel', 'Avbryt'), style: 'cancel' },
          { text: t('quizScreen.submit', 'Skicka in'), onPress: () => submitMutation.mutate() },
        ],
      );
    } else {
      submitMutation.mutate();
    }
  }, [answers, questions.length, submitMutation, t]);

  const handleRetake = useCallback(() => {
    setPhase('setup');
    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
    setTimeSpent(0);
  }, []);

  const handleNewQuiz = useCallback(async () => {
    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
    setTimeSpent(0);
    const res = await quizQuery.refetch();
    if (res.data?.data?.questions?.length) {
      setPhase('taking');
    }
  }, [quizQuery]);

  const handleBack = useCallback(() => {
    if (phase === 'taking') {
      Alert.alert(
        t('quizScreen.quitTitle', 'Avsluta quiz?'),
        t('quizScreen.quitMessage', 'Dina svar kommer att gå förlorade.'),
        [
          { text: t('common.cancel', 'Avbryt'), style: 'cancel' },
          {
            text: t('quizScreen.quit', 'Avsluta'),
            style: 'destructive',
            onPress: () => {
              if (timerRef.current) clearInterval(timerRef.current);
              setPhase('setup');
            },
          },
        ],
      );
    } else if (phase === 'review') {
      setPhase('results');
    } else {
      router.back();
    }
  }, [phase, t, router]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;

  // ─── SETUP PHASE ──────────────────────────────
  if (phase === 'setup') {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={[TFX.teal, TFX.tealDark]}
          style={styles.setupHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SafeAreaView edges={['top']} style={styles.setupHeaderSafe}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={22} color={TFX.white} />
            </TouchableOpacity>
            <View style={styles.setupHeaderContent}>
              <Zap size={36} color={TFX.white} />
              <Text style={styles.setupTitle}>
                {t('practiceQuiz.title', 'Övningsprov')}
              </Text>
              <Text style={styles.setupSubtitle}>
                {t('practiceQuiz.subtitle', 'Testa dina teorikunskaper med slumpmässiga frågor')}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.setupContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Question count selector */}
          <View style={styles.setupSection}>
            <View style={styles.setupSectionHeader}>
              <Hash size={18} color={TFX.navy} />
              <Text style={styles.setupSectionTitle}>
                {t('practiceQuiz.questionCount', 'Antal frågor')}
              </Text>
            </View>
            <View style={styles.countRow}>
              {QUESTION_COUNTS.map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.countBtn,
                    questionCount === count && styles.countBtnActive,
                  ]}
                  onPress={() => setQuestionCount(count)}
                >
                  <Text
                    style={[
                      styles.countBtnText,
                      questionCount === count && styles.countBtnTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category filter */}
          <View style={styles.setupSection}>
            <View style={styles.setupSectionHeader}>
              <Filter size={18} color={TFX.navy} />
              <Text style={styles.setupSectionTitle}>
                {t('practiceQuiz.category', 'Kategori')}
              </Text>
            </View>

            {categoriesQuery.isLoading ? (
              <ActivityIndicator size="small" color={TFX.teal} style={{ marginTop: 12 }} />
            ) : (
              <View style={styles.categoryList}>
                {/* All categories option */}
                <TouchableOpacity
                  style={[
                    styles.categoryBtn,
                    selectedCategory === null && styles.categoryBtnActive,
                  ]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <View style={styles.categoryBtnContent}>
                    <Text
                      style={[
                        styles.categoryBtnText,
                        selectedCategory === null && styles.categoryBtnTextActive,
                      ]}
                    >
                      {t('practiceQuiz.allCategories', 'Alla kategorier')}
                    </Text>
                    <Text
                      style={[
                        styles.categoryCount,
                        selectedCategory === null && styles.categoryCountActive,
                      ]}
                    >
                      {totalQuestions}
                    </Text>
                  </View>
                </TouchableOpacity>

                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryBtn,
                      selectedCategory === cat.id && styles.categoryBtnActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <View style={styles.categoryBtnContent}>
                      <Text
                        style={[
                          styles.categoryBtnText,
                          selectedCategory === cat.id && styles.categoryBtnTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                      <Text
                        style={[
                          styles.categoryCount,
                          selectedCategory === cat.id && styles.categoryCountActive,
                        ]}
                      >
                        {cat.questionCount}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Start button */}
        <SafeAreaView edges={['bottom']} style={styles.setupFooter}>
          <TouchableOpacity
            style={[styles.startBtn, quizQuery.isFetching && styles.startBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleStart}
            disabled={quizQuery.isFetching}
          >
            <LinearGradient
              colors={[TFX.teal, TFX.tealDark]}
              style={styles.startBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {quizQuery.isFetching ? (
                <ActivityIndicator size="small" color={TFX.white} />
              ) : (
                <>
                  <Zap size={20} color={TFX.white} />
                  <Text style={styles.startBtnText}>
                    {t('practiceQuiz.start', 'Starta övningsprov')}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // ─── LOADING ──────────────────────────────
  if (quizQuery.isLoading || quizQuery.isFetching) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={TFX.teal} />
        <Text style={styles.loadingText}>{t('common.loading', 'Laddar...')}</Text>
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
              {result.passed
                ? t('quizScreen.passed', 'Godkänt!')
                : t('quizScreen.failed', 'Inte godkänt')}
            </Text>
            <Text style={styles.resultSubline}>
              {result.passed
                ? t('practiceQuiz.passedDesc', 'Bra jobbat! Du klarade övningsprovet.')
                : t('practiceQuiz.failedDesc', 'Fortsätt öva så klarar du det nästa gång!')}
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
              <Text style={styles.scoreLabel}>
                {t('quizScreen.score', 'Poäng')}
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: TFX.green + '15' }]}>
              <CheckCircle size={20} color={TFX.green} />
              <Text style={[styles.statValue, { color: TFX.green }]}>
                {result.correctAnswers}
              </Text>
              <Text style={styles.statLabel}>{t('quizScreen.correct', 'Rätt')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: TFX.danger + '15' }]}>
              <XCircle size={20} color={TFX.danger} />
              <Text style={[styles.statValue, { color: TFX.danger }]}>
                {result.wrongAnswers}
              </Text>
              <Text style={styles.statLabel}>{t('quizScreen.wrong', 'Fel')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: TFX.blue + '15' }]}>
              <Clock size={20} color={TFX.blue} />
              <Text style={[styles.statValue, { color: TFX.blue }]}>
                {formatTime(timeSpent)}
              </Text>
              <Text style={styles.statLabel}>{t('quizScreen.time', 'Tid')}</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => {
                setReviewIndex(0);
                setPhase('review');
              }}
            >
              <Eye size={18} color={TFX.teal} />
              <Text style={styles.reviewBtnText}>
                {t('quizScreen.reviewAnswers', 'Granska svar')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.retakeBtn} onPress={handleNewQuiz}>
              <LinearGradient
                colors={[TFX.teal, TFX.tealDark]}
                style={styles.retakeBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <RotateCcw size={18} color={TFX.white} />
                <Text style={styles.retakeBtnText}>
                  {t('practiceQuiz.newQuiz', 'Nytt prov')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backToSetupBtn} onPress={handleRetake}>
              <Text style={styles.backToSetupBtnText}>
                {t('practiceQuiz.changeSettings', 'Ändra inställningar')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── REVIEW PHASE ────────────────────────────
  if (phase === 'review' && result) {
    const reviewQuestion = questions[reviewIndex];
    const reviewResult = result.results.find(
      (r) => r.questionId === reviewQuestion?.id,
    );

    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.quizHeaderSafe}>
          <View style={styles.quizHeaderRow}>
            <TouchableOpacity onPress={() => setPhase('results')} style={styles.backBtn}>
              <ArrowLeft size={22} color={TFX.navy} />
            </TouchableOpacity>
            <Text style={styles.quizHeaderTitle}>
              {t('quizScreen.review', 'Granska')} {reviewIndex + 1}/{questions.length}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.questionContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.questionText}>{reviewQuestion?.text}</Text>

          {reviewQuestion?.options.map((option) => {
            const isSelected = reviewResult?.selectedOptionIds.includes(option.id);
            const isCorrect = reviewResult?.correctOptionIds.includes(option.id);
            const bgColor = isCorrect
              ? TFX.green + '18'
              : isSelected
                ? TFX.danger + '18'
                : TFX.grayLight;
            const borderColor = isCorrect
              ? TFX.green
              : isSelected
                ? TFX.danger
                : TFX.grayMid;

            return (
              <View
                key={option.id}
                style={[styles.optionCard, { backgroundColor: bgColor, borderColor }]}
              >
                <View style={styles.optionContent}>
                  {isCorrect && <CheckCircle size={18} color={TFX.green} />}
                  {isSelected && !isCorrect && <XCircle size={18} color={TFX.danger} />}
                  {!isCorrect && !isSelected && <View style={{ width: 18 }} />}
                  <Text
                    style={[
                      styles.optionText,
                      isCorrect && { color: TFX.green, fontWeight: '600' },
                      isSelected && !isCorrect && { color: TFX.danger },
                    ]}
                  >
                    {option.text}
                  </Text>
                </View>
              </View>
            );
          })}

          {reviewResult?.explanation && (
            <View style={styles.explanationBox}>
              <BookOpen size={16} color={TFX.teal} />
              <Text style={styles.explanationText}>{reviewResult.explanation}</Text>
            </View>
          )}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.navFooter}>
          <TouchableOpacity
            style={[styles.navBtn, reviewIndex === 0 && styles.navBtnDisabled]}
            onPress={() => setReviewIndex((i) => Math.max(0, i - 1))}
            disabled={reviewIndex === 0}
          >
            <ChevronLeft size={20} color={reviewIndex === 0 ? TFX.grayMid : TFX.navy} />
            <Text
              style={[
                styles.navBtnText,
                reviewIndex === 0 && styles.navBtnTextDisabled,
              ]}
            >
              {t('quizScreen.previous', 'Föregående')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.navCounter}>
            {reviewIndex + 1} / {questions.length}
          </Text>

          <TouchableOpacity
            style={[
              styles.navBtn,
              reviewIndex === questions.length - 1 && styles.navBtnDisabled,
            ]}
            onPress={() => setReviewIndex((i) => Math.min(questions.length - 1, i + 1))}
            disabled={reviewIndex === questions.length - 1}
          >
            <Text
              style={[
                styles.navBtnText,
                reviewIndex === questions.length - 1 && styles.navBtnTextDisabled,
              ]}
            >
              {t('quizScreen.next', 'Nästa')}
            </Text>
            <ChevronRight
              size={20}
              color={reviewIndex === questions.length - 1 ? TFX.grayMid : TFX.navy}
            />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // ─── TAKING PHASE ────────────────────────────
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.quizHeaderSafe}>
        <View style={styles.quizHeaderRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ArrowLeft size={22} color={TFX.navy} />
          </TouchableOpacity>
          <Text style={styles.quizHeaderTitle} numberOfLines={1}>
            {t('practiceQuiz.title', 'Övningsprov')}
          </Text>
          <View style={styles.timerBadge}>
            <Clock size={14} color={TFX.slate} />
            <Text style={styles.timerText}>{formatTime(timeSpent)}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((currentIndex + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.questionContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.questionCounter}>
          {t('quizScreen.questionOf', 'Fråga {{current}} av {{total}}', {
            current: currentIndex + 1,
            total: questions.length,
          })}
        </Text>

        <Animated.View
          style={{
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
          }}
        >
          <Text style={styles.questionText}>{currentQuestion?.text}</Text>

          {currentQuestion?.options.map((option) => {
            const isSelected = (answers[currentQuestion.id] ?? []).includes(option.id);
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
                activeOpacity={0.7}
                onPress={() =>
                  handleSelectOption(
                    currentQuestion.id,
                    option.id,
                    currentQuestion.type,
                  )
                }
              >
                <View style={styles.optionContent}>
                  <View
                    style={[
                      currentQuestion.type === 'multiple'
                        ? styles.checkbox
                        : styles.radio,
                      isSelected &&
                        (currentQuestion.type === 'multiple'
                          ? styles.checkboxSelected
                          : styles.radioSelected),
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={
                          currentQuestion.type === 'multiple'
                            ? styles.checkboxInner
                            : styles.radioInner
                        }
                      />
                    )}
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

          {currentQuestion?.type === 'multiple' && (
            <Text style={styles.multiHint}>
              {t('quizScreen.multipleHint', 'Välj alla rätta svar')}
            </Text>
          )}
        </Animated.View>
      </ScrollView>

      {/* Navigation footer */}
      <SafeAreaView edges={['bottom']} style={styles.navFooter}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          onPress={handlePrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={20} color={currentIndex === 0 ? TFX.grayMid : TFX.navy} />
          <Text
            style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}
          >
            {t('quizScreen.previous', 'Föregående')}
          </Text>
        </TouchableOpacity>

        <Text style={styles.navCounter}>
          {answeredCount}/{questions.length}
        </Text>

        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitMutation.isPending}
          >
            <LinearGradient
              colors={[TFX.teal, TFX.tealDark]}
              style={styles.submitBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator size="small" color={TFX.white} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {t('quizScreen.submit', 'Skicka in')}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navBtn} onPress={handleNext}>
            <Text style={styles.navBtnText}>{t('quizScreen.next', 'Nästa')}</Text>
            <ChevronRight size={20} color={TFX.navy} />
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TFX.white },
  content: { flex: 1 },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: TFX.white },
  loadingText: { fontSize: 14, fontFamily, color: TFX.slate, marginTop: 12 },

  // Setup phase
  setupHeader: { paddingBottom: 24 },
  setupHeaderSafe: { paddingHorizontal: 20, paddingTop: 8 },
  setupHeaderContent: { alignItems: 'center', marginTop: 16 },
  setupTitle: { fontSize: 26, fontWeight: '800', fontFamily, color: TFX.white, marginTop: 12, letterSpacing: -0.5 },
  setupSubtitle: { fontSize: 14, fontFamily, color: 'rgba(255,255,255,0.75)', marginTop: 6, textAlign: 'center' },
  setupContent: { padding: 20 },
  setupSection: { marginBottom: 28 },
  setupSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  setupSectionTitle: { fontSize: 16, fontWeight: '700', fontFamily, color: TFX.navy },
  countRow: { flexDirection: 'row', gap: 10 },
  countBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: TFX.grayLight,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  countBtnActive: { backgroundColor: TFX.teal + '15', borderColor: TFX.teal },
  countBtnText: { fontSize: 18, fontWeight: '700', fontFamily, color: TFX.slate },
  countBtnTextActive: { color: TFX.teal },
  categoryList: { gap: 8 },
  categoryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: TFX.grayLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryBtnActive: { backgroundColor: TFX.teal + '15', borderColor: TFX.teal },
  categoryBtnContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryBtnText: { fontSize: 15, fontWeight: '500', fontFamily, color: TFX.navy, flex: 1 },
  categoryBtnTextActive: { fontWeight: '700', color: TFX.teal },
  categoryCount: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily,
    color: TFX.slate,
    backgroundColor: TFX.grayMid,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  categoryCountActive: { backgroundColor: TFX.teal + '25', color: TFX.teal },
  setupFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: TFX.white,
    borderTopWidth: 1,
    borderTopColor: TFX.grayMid,
  },
  startBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  startBtnDisabled: { opacity: 0.6 },
  startBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  startBtnText: { fontSize: 17, fontWeight: '700', fontFamily, color: TFX.white },

  // Quiz taking
  quizHeaderSafe: { backgroundColor: TFX.white, borderBottomWidth: 1, borderBottomColor: TFX.grayMid },
  quizHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quizHeaderTitle: { fontSize: 17, fontWeight: '700', fontFamily, color: TFX.navy, flex: 1, textAlign: 'center' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: TFX.grayLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  timerText: { fontSize: 13, fontWeight: '600', fontFamily, color: TFX.slate },
  progressBarBg: { height: 3, backgroundColor: TFX.grayMid },
  progressBarFill: { height: 3, backgroundColor: TFX.teal, borderRadius: 2 },

  questionContent: { padding: 20, paddingBottom: 40 },
  questionCounter: { fontSize: 13, fontWeight: '600', fontFamily, color: TFX.slate, marginBottom: 8 },
  questionText: { fontSize: 18, fontWeight: '700', fontFamily, color: TFX.navy, lineHeight: 26, marginBottom: 24 },

  optionCard: {
    borderWidth: 2,
    borderColor: TFX.grayMid,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: TFX.white,
  },
  optionCardSelected: { borderColor: TFX.teal, backgroundColor: TFX.teal + '08' },
  optionContent: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  optionText: { fontSize: 15, fontFamily, color: TFX.navy, flex: 1, lineHeight: 22 },
  optionTextSelected: { fontWeight: '600', color: TFX.teal },

  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: TFX.grayMid, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: TFX.teal },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: TFX.teal },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: TFX.grayMid, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: TFX.teal, backgroundColor: TFX.teal },
  checkboxInner: { width: 10, height: 10, borderRadius: 2, backgroundColor: TFX.white },

  multiHint: { fontSize: 13, fontFamily, color: TFX.slate, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },

  // Navigation
  navFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: TFX.grayMid,
    backgroundColor: TFX.white,
  },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 4 },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 15, fontWeight: '600', fontFamily, color: TFX.navy },
  navBtnTextDisabled: { color: TFX.grayMid },
  navCounter: { fontSize: 14, fontWeight: '600', fontFamily, color: TFX.slate },
  submitBtn: { borderRadius: 10, overflow: 'hidden' },
  submitBtnGradient: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { fontSize: 15, fontWeight: '700', fontFamily, color: TFX.white },

  // Results
  resultHeaderGradient: { paddingBottom: 32 },
  resultHeaderSafe: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 },
  resultHeadline: { fontSize: 28, fontWeight: '800', fontFamily, color: TFX.white, marginTop: 16 },
  resultSubline: { fontSize: 15, fontFamily, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center' },
  resultContent: { padding: 20, alignItems: 'center' },
  scoreCircle: { marginVertical: 20 },
  scoreCircleInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TFX.white,
  },
  scoreValue: { fontSize: 36, fontWeight: '800', fontFamily },
  scoreLabel: { fontSize: 13, fontFamily, color: TFX.slate, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%' },
  statCard: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 14, gap: 6 },
  statValue: { fontSize: 22, fontWeight: '800', fontFamily },
  statLabel: { fontSize: 12, fontFamily, color: TFX.slate },

  resultActions: { width: '100%', gap: 12 },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: TFX.teal,
    backgroundColor: TFX.teal + '08',
  },
  reviewBtnText: { fontSize: 16, fontWeight: '600', fontFamily, color: TFX.teal },
  retakeBtn: { borderRadius: 14, overflow: 'hidden' },
  retakeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retakeBtnText: { fontSize: 16, fontWeight: '700', fontFamily, color: TFX.white },
  backToSetupBtn: { alignItems: 'center', paddingVertical: 12 },
  backToSetupBtnText: { fontSize: 14, fontWeight: '600', fontFamily, color: TFX.slate, textDecorationLine: 'underline' },

  // Explanation
  explanationBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: TFX.teal + '10',
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: TFX.teal,
  },
  explanationText: { fontSize: 14, fontFamily, color: TFX.navy, flex: 1, lineHeight: 20 },
});
