export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  // Deep link routing for push notifications
  if (path.includes('/booking-detail')) return path;
  if (path.includes('/invoice-detail')) return path;
  if (path.includes('/notifications')) return '/notifications';
  if (path.includes('/lms/lesson')) return path;
  if (path.includes('/lms/course-detail')) return path;
  if (path.includes('/student-profile')) return '/student-profile';
  if (path.includes('/settings')) return '/settings';
  if (path.includes('/book-lesson')) return '/book-lesson';

  return '/';
}