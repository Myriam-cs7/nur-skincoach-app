import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Sensitivity (patch) test state — purely local, never blocks the app.
 * "done" hides the reminder for good, "later" hides it for 24 h.
 */
const KEY = 'nur.patch_test';

export type PatchState = { status: 'none' | 'done' | 'later'; at?: string };

export async function getPatchState(): Promise<PatchState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { status: 'none' };
    return JSON.parse(raw) as PatchState;
  } catch {
    return { status: 'none' };
  }
}

export async function setPatchState(status: 'done' | 'later') {
  await AsyncStorage.setItem(KEY, JSON.stringify({ status, at: new Date().toISOString() }));
}

/** Should the reminder card be shown on the dashboard? */
export function patchReminderVisible(state: PatchState): boolean {
  if (state.status === 'done') return false;
  if (state.status === 'later' && state.at) {
    return Date.now() - new Date(state.at).getTime() > 24 * 3600 * 1000;
  }
  return true;
}
