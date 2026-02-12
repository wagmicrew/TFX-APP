/**
 * Offline Banner Component
 *
 * Persistent banner shown when the device is offline.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTheme } from '@/contexts/theme-context';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const { colors } = useTheme();

  if (isOnline) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.warning }]}>
      <WifiOff size={16} color={colors.white} />
      <Text style={[styles.text, { color: colors.white }]}>
        Du är offline – data sparad lokalt
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
