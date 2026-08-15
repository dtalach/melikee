import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useAppStore, type Tab } from '@/store/useAppStore';

/**
 * Tapping a dock tab from a detail screen should land you on that tab, not
 * unwind one step of history. This sets the destination and dismisses back to
 * the shell in one move.
 */
export function useGoToTab() {
  const router = useRouter();
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      router.dismissTo('/');
    },
    [router, setActiveTab],
  );
}
