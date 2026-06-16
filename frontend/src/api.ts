import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
export const API_BASE = `${BACKEND}/api`;

const USER_KEY = 'nur.user_id';
const CODE_KEY = 'nur.activation_code';

export async function getStoredUserId(): Promise<string | null> {
  return AsyncStorage.getItem(USER_KEY);
}
export async function setStoredUser(userId: string, code: string) {
  await AsyncStorage.setItem(USER_KEY, userId);
  await AsyncStorage.setItem(CODE_KEY, code);
}
export async function clearStoredUser() {
  await AsyncStorage.multiRemove([USER_KEY, CODE_KEY]);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
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

export const api = {
  activate: (code: string) =>
    request<ActivateResponse>('/activate', {
      method: 'POST',
      body: JSON.stringify({ activation_code: code }),
    }),
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
  chat: (id: string, message: string, history: { role: string; content: string }[], lang: string) =>
    request<{ reply: string; blocked: boolean }>(`/users/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, history, lang }),
    }),
  leadPrescription: (body: { email: string; name?: string; age_range?: string; answers: { q1: string; q2: string; q3: string }; lang: string }) =>
    request<{ ok: boolean; lead_id: string; prescription: { headline: string; diagnosis: string; axes: string[]; protocol_summary: string; cta_text: string }; shop: { url: string; promo_code: string; discount: number } }>('/lead-prescription', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
