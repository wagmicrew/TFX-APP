import { Stack } from 'expo-router';
import React from 'react';

export default function LmsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="course-detail" />
      <Stack.Screen name="lesson" />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="practice-quiz" />
    </Stack>
  );
}
