/**
 * LMS API service for TFX App
 * Now uses centralized apiClient.
 */

import { apiGet, apiPost, apiPut } from './api-client';
import type {
  LmsCoursesResponse,
  LmsCourseStructureResponse,
  LmsLessonResponse,
  LmsQuizResponse,
  QuizSubmission,
  QuizResultResponse,
  PracticeCategoriesResponse,
} from '@/types/lms';

/** Fetch all courses visible to the student */
export async function fetchLmsCourses(
  apiBaseUrl: string,
  accessToken?: string,
  locale: string = 'sv-SE',
): Promise<LmsCoursesResponse> {
  return apiGet<LmsCoursesResponse>(`${apiBaseUrl}/lms/courses?locale=${locale}`);
}

/** Fetch a course's structure (chapters + lesson/quiz metadata) */
export async function fetchCourseStructure(
  apiBaseUrl: string,
  accessToken?: string,
  courseId: string = '',
  locale: string = 'sv-SE',
): Promise<LmsCourseStructureResponse> {
  const response = await apiGet<
    LmsCourseStructureResponse | { success: boolean; data?: { structure?: LmsCourseStructureResponse['data'] } }
  >(`${apiBaseUrl}/lms/courses/${courseId}/structure?locale=${locale}`);

  if (response?.data && typeof (response as any).data.structure !== 'undefined') {
    return { ...response, data: (response as any).data.structure } as LmsCourseStructureResponse;
  }

  return response as LmsCourseStructureResponse;
}

/** Fetch full lesson content */
export async function fetchLesson(
  apiBaseUrl: string,
  accessToken?: string,
  lessonId: string = '',
): Promise<LmsLessonResponse> {
  const response = await apiGet<
    LmsLessonResponse | { success: boolean; data?: { lesson?: LmsLessonResponse['data'] } }
  >(`${apiBaseUrl}/lms/lessons/${lessonId}`);

  if (response?.data && typeof (response as any).data.lesson !== 'undefined') {
    return { ...response, data: (response as any).data.lesson } as LmsLessonResponse;
  }

  return response as LmsLessonResponse;
}

/** Mark a lesson as completed / update progress */
export async function updateLessonProgress(
  apiBaseUrl: string,
  accessToken?: string,
  lessonId: string = '',
  progress: number = 0,
  extra?: {
    watchPercentage?: number;
    lastPosition?: number;
  },
): Promise<{ success: boolean }> {
  return apiPut<{ success: boolean }>(`${apiBaseUrl}/lms/lessons/${lessonId}/progress`, {
    progress,
    ...extra,
  });
}

/** Fetch a quiz for taking */
export async function fetchQuiz(
  apiBaseUrl: string,
  accessToken?: string,
  quizId: string = '',
): Promise<LmsQuizResponse> {
  return apiGet<LmsQuizResponse>(`${apiBaseUrl}/lms/quizzes/${quizId}`);
}

/** Submit quiz answers */
export async function submitQuiz(
  apiBaseUrl: string,
  accessToken?: string,
  submission?: QuizSubmission,
): Promise<QuizResultResponse> {
  if (!submission) throw new Error('Submission required');
  return apiPost<QuizResultResponse>(
    `${apiBaseUrl}/lms/quizzes/${submission.quizId}/submit`,
    submission,
  );
}

// ─── Practice Quiz (standalone q_questions bank) ─────────────

/** Fetch practice quiz categories */
export async function fetchPracticeCategories(
  apiBaseUrl: string,
  locale: string = 'sv',
): Promise<PracticeCategoriesResponse> {
  return apiGet<PracticeCategoriesResponse>(
    `${apiBaseUrl}/lms/quizzes/practice/categories?locale=${locale}`,
  );
}

/** Fetch a random practice quiz */
export async function fetchPracticeQuiz(
  apiBaseUrl: string,
  options?: {
    count?: number;
    category?: string;
    locale?: string;
  },
): Promise<LmsQuizResponse> {
  const params = new URLSearchParams();
  if (options?.count) params.set('count', String(options.count));
  if (options?.category) params.set('category', options.category);
  if (options?.locale) params.set('locale', options.locale);
  return apiGet<LmsQuizResponse>(
    `${apiBaseUrl}/lms/quizzes/practice?${params.toString()}`,
  );
}

/** Submit practice quiz answers */
export async function submitPracticeQuiz(
  apiBaseUrl: string,
  submission: QuizSubmission,
): Promise<QuizResultResponse> {
  return apiPost<QuizResultResponse>(
    `${apiBaseUrl}/lms/quizzes/practice/submit`,
    submission,
  );
}
