/**
 * useNetworkStatus Hook
 *
 * Tracks network connectivity using @react-native-community/netinfo.
 */

import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,
    isInternetReachable: true,
    connectionType: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isOnline: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });
    });

    // Fetch initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setStatus({
        isOnline: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });
    });

    return () => unsubscribe();
  }, []);

  return status;
}
