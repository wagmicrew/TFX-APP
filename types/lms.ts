// LMS & Quiz types for TFX App

/** A course visible in the app */
export interface LmsCourse {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  category?: string;
  totalChapters: number;
  totalLessons: number;
  totalQuizzes: number;
  progress: number; // 0–100
  isCompleted: boolean;
  estimatedMinutes?: number;
  updatedAt: string;
}

export interface LmsCoursesResponse {
  success: boolean;
  data?: {
    courses: LmsCourse[];
  };
  error?: string;
}

/** A chapter inside a course */
export interface LmsChapter {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: LmsLessonMeta[];
  quiz?: LmsQuizMeta;
  progress: number; // 0–100
  isCompleted: boolean;
}

/** Lightweight lesson metadata (returned in course structure) */
export interface LmsLessonMeta {
  id: string;
  title: string;
  order: number;
  type: 'text' | 'video' | 'interactive';
  estimatedMinutes?: number;
  isCompleted: boolean;
  progress: number;
}

/** Lightweight quiz metadata (returned in course structure) */
export interface LmsQuizMeta {
  id: string;
  title: string;
  questionCount: number;
  passingScore: number; // percentage
  bestScore?: number;
  attempts: number;
  isCompleted: boolean;
}

export interface LmsCourseStructureResponse {
  success: boolean;
  data?: {
    courseId: string;
    title: string;
    chapters: LmsChapter[];
  };
  error?: string;
}

/** Full lesson content */
export interface LmsLessonContent {
  id: string;
  title: string;
  chapterId: string;
  courseId: string;
  type: 'text' | 'video' | 'interactive';
  content: string; // HTML or markdown
  videoUrl?: string;
  imageUrls?: string[];
  estimatedMinutes?: number;
  progress: number;
  isCompleted: boolean;
  nextLessonId?: string;
  prevLessonId?: string;
}

export interface LmsLessonResponse {
  success: boolean;
  data?: LmsLessonContent;
  error?: string;
}

/** Quiz question */
export interface QuizQuestion {
  id: string;
  text: string;
  imageUrl?: string;
  type: 'single' | 'multiple' | 'true-false';
  options: QuizOption[];
  explanation?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  imageUrl?: string;
}

/** Full quiz for taking */
export interface LmsQuiz {
  id: string;
  title: string;
  description?: string;
  chapterId: string;
  courseId: string;
  timeLimit?: number; // seconds
  passingScore: number;
  questions: QuizQuestion[];
}

export interface LmsQuizResponse {
  success: boolean;
  data?: LmsQuiz;
  error?: string;
}

/** Quiz submission */
export interface QuizAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

export interface QuizSubmission {
  quizId: string;
  answers: QuizAnswer[];
  timeSpent: number; // seconds
}

/** Quiz result after submission */
export interface QuizResult {
  quizId: string;
  score: number; // percentage
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  results: QuizQuestionResult[];
}

export interface QuizQuestionResult {
  questionId: string;
  correct: boolean;
  correctOptionIds: string[];
  selectedOptionIds: string[];
  explanation?: string;
}

export interface QuizResultResponse {
  success: boolean;
  data?: QuizResult;
  error?: string;
}

/** Practice quiz category */
export interface PracticeCategory {
  id: string;
  name: string;
  questionCount: number;
}

export interface PracticeCategoriesResponse {
  success: boolean;
  data?: {
    categories: PracticeCategory[];
    totalQuestions: number;
  };
  error?: string;
}
