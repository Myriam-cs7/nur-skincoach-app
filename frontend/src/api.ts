import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
export const API_BASE = `${BACKEND}/api`;

const USER_KEY = 'nur.user_id';
const CODE_KEY = 'nur.activation_code';
const TOKEN_KEY = 'nur.session_token';

// SecureStore is unavailable on web; the browser preview falls back to AsyncStorage
const secureAvailable = Platform.OS !== 'web';

async function saveToken(token: string) {
  if (secureAvailable) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await AsyncStorage.setItem(TOKEN_KEY, token);
}
async function readToken(): Promise<string | null> {
  try {
    return secureAvailable ? await SecureStore.getItemAsync(TOKEN_KEY) : await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
async function deleteToken() {
  try {
    if (secureAvailable) await SecureStore.deleteItemAsync(TOKEN_KEY);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing stored
  }
}

export async function getStoredUserId(): Promise<string | null> {
  return AsyncStorage.getItem(USER_KEY);
}
export async function setStoredUser(userId: string, code: string) {
  await AsyncStorage.setItem(USER_KEY, userId);
  await AsyncStorage.setItem(CODE_KEY, code);
}
export async function clearStoredUser() {
  await AsyncStorage.multiRemove([USER_KEY, CODE_KEY]);
  await deleteToken();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await readToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    if (res.status === 401) await clearStoredUser(); // session expired → re-activation
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export type ActivateResponse = {
  user_id: string;
  activation_code: string;
  has_intake: boolean;
  has_diagnosis: boolean;
  session_token?: string;
};
export type IntakePayload = {
  name?: string;
  age_range: string;
  gender?: string;
  skin_type: string;
  location: string;
  climate: string;
  sun_exposure: string;
  lifestyle: string;
  sleep_hours: string;
  stress_level: string;
  water_intake: string;
  concerns: string[];
  current_routine?: string[];
};
export type LedColor = {
  id: string;
  color_hex: string;
  name: string;
  wavelength: string;
  tagline: string;
  benefits: string[];
  best_for: string[];
  session_minutes: number;
};
export type ProtocolDay = {
  day: number;
  led_color_id: string | null;
  session_minutes: number | null;
  intensity?: 'faible' | 'moyenne' | 'forte' | null;
  notes?: string | null;
};
export type DiagnosisData = {
  scores: Record<string, number>;
  primary_concerns: string[];
  summary: string;
  routine_advice: string[];
  lifestyle_advice: string[];
  protocol: {
    weekly_schedule: ProtocolDay[];
    total_weeks: number;
    expected_results: string;
  };
};
export type DiagnosisRecord = {
  id: string;
  user_id: string;
  created_at: string;
  data: DiagnosisData;
};

export type AccessResponse = {
  user_id: string;
  activation_code: string;
  has_intake: boolean;
  has_diagnosis: boolean;
  email?: string | null;
  first_name?: string | null;
  order_ref?: string | null;
  access_status: 'verified' | 'trial' | 'paused';
  trial_days_left?: number | null;
  session_token?: string;
};
export type ProgressData = {
  daily: { date: string; sessions: number }[];
  weekly: { label: string; sessions: number; target: number }[];
  per_color_minutes: Record<string, number>;
  score_history: { created_at: string; scores: Record<string, number> }[];
  total_sessions: number;
  total_minutes: number;
  target_per_week: number;
};

async function adminRequest<T>(path: string, adminKey: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminKey, ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export type AdminOverview = {
  counts: {
    users: number; verified: number; trial: number; paused: number;
    sessions: number; diagnoses: number; order_codes: number; order_codes_used: number; leads: number;
  };
  users: {
    id: string; email?: string | null; first_name?: string | null; activation_code?: string | null;
    order_ref?: string | null; access_status: 'verified' | 'trial' | 'paused';
    trial_days_left?: number | null; created_at?: string; has_intake: boolean; has_diagnosis: boolean;
  }[];
  partner_codes: { code: string; label?: string; kind?: string; multi_use?: boolean; active?: boolean; uses?: number }[];
  order_codes: { code: string; order_name: string; email: string; first_name?: string | null; created_at: string; used: boolean }[];
  requests: { email: string; created_at: string; last_try?: string }[];
  allowed: { email: string; label?: string; created_at?: string }[];
  shopify: { configured: boolean; webhook: boolean; store?: string | null };
};

export const admin = {
  overview: (key: string) => adminRequest<AdminOverview>('/admin/overview', key),
  allowEmail: (key: string, email: string, label?: string) =>
    adminRequest<{ ok: boolean }>('/admin/allow-email', key, { method: 'POST', body: JSON.stringify({ email, label }) }),
  partnerCode: (key: string, code: string, label?: string) =>
    adminRequest<{ ok: boolean }>('/admin/partner-code', key, { method: 'POST', body: JSON.stringify({ code, label, multi_use: true }) }),
  codeState: (key: string, code: string, active: boolean) =>
    adminRequest<{ ok: boolean }>('/admin/code-state', key, { method: 'POST', body: JSON.stringify({ code, active }) }),
  resendCodes: (key: string, email: string) =>
    adminRequest<{ ok: boolean; codes: string[] }>('/admin/resend-codes', key, { method: 'POST', body: JSON.stringify({ email }) }),
  simulateOrder: (key: string, email: string, quantity: number, order_name?: string) =>
    adminRequest<{ ok: boolean; order: string; codes: string[]; already_issued: boolean }>('/admin/simulate-order', key, {
      method: 'POST',
      body: JSON.stringify({ email, quantity, order_name, lang: 'fr' }),
    }),
};

export const api = {
  requestCode: (email: string, lang = 'fr') =>
    request<{ ok: boolean; expires_in: number; resend_after: number; masked_email: string }>('/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email, lang }),
    }),
  verifyCode: async (email: string, code: string, lang = 'fr') => {
    const r = await request<AccessResponse>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code, lang }),
    });
    if (r.session_token) await saveToken(r.session_token);
    return r;
  },
  getAccess: (id: string) => request<AccessResponse>(`/users/${id}/access`),
  linkOrder: (id: string, body: { email?: string; order_number?: string }) =>
    request<AccessResponse>(`/users/${id}/link-order`, { method: 'POST', body: JSON.stringify(body) }),
  progress: (id: string) => request<ProgressData>(`/users/${id}/progress`),
  activate: async (code: string) => {
    const r = await request<ActivateResponse>('/activate', {
      method: 'POST',
      body: JSON.stringify({ activation_code: code }),
    });
    if (r.session_token) await saveToken(r.session_token);
    return r;
  },
  getUser: (id: string) => request<any>(`/users/${id}`),
  saveIntake: (id: string, intake: IntakePayload) =>
    request<{ ok: boolean }>(`/users/${id}/intake`, {
      method: 'POST',
      body: JSON.stringify(intake),
    }),
  diagnose: (id: string, photoB64?: string, mime = 'image/jpeg', lang = 'fr') =>
    request<{ ok: boolean; diagnosis: DiagnosisRecord }>(`/users/${id}/diagnose`, {
      method: 'POST',
      body: JSON.stringify({ photo_base64: photoB64 || null, mime_type: mime, lang }),
    }),
  getDiagnosis: (id: string) => request<DiagnosisRecord>(`/users/${id}/diagnosis`),
  ledLibrary: () => request<{ colors: LedColor[] }>('/led-library'),
  listSessions: (id: string) => request<{ sessions: any[] }>(`/users/${id}/sessions`),
  logSession: (id: string, body: { led_color_id: string; duration_minutes: number; notes?: string }) =>
    request<any>(`/users/${id}/sessions`, { method: 'POST', body: JSON.stringify(body) }),
  resetUser: (id: string) => request<any>(`/users/${id}`, { method: 'DELETE' }),
  chat: (
    id: string,
    message: string,
    lang: string,
    photoB64?: string,
  ) =>
    request<{ reply: string; blocked: boolean; ask_photo: boolean }>(`/users/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, lang, photo_base64: photoB64 || null, mime_type: 'image/jpeg' }),
    }),
  leadPrescription: (body: { email: string; name?: string; age_range?: string; answers: { q1: string; q2: string; q3: string }; lang: string }) =>
    request<{ ok: boolean; lead_id: string; prescription: { headline: string; diagnosis: string; axes: string[]; protocol_summary: string; cta_text: string }; shop: { url: string; promo_code: string; discount: number } }>('/lead-prescription', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
