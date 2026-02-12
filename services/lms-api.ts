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
  return apiGet<LmsCourseStructureResponse>(
    `${apiBaseUrl}/lms/courses/${courseId}/structure?locale=${locale}`,
  );
}

/** Fetch full lesson content */
export async function fetchLesson(
  apiBaseUrl: string,
  accessToken?: string,
  lessonId: string = '',
): Promise<LmsLessonResponse> {
  return apiGet<LmsLessonResponse>(`${apiBaseUrl}/lms/lessons/${lessonId}`);
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
