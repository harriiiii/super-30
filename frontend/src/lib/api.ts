import type {
  AutoCoachReport,
  CoachSessionInput,
  Drill,
  FixedReference,
  MatchPerformance,
  Player,
  PlayerPracticeQuestion,
  PracticeLog,
} from '../types';

const BASE = '/api';

function getToken() {
  return localStorage.getItem('auth_token');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.reload();
    return undefined as T;
  }
  if (!res.ok) throw new Error(`API ${options?.method ?? 'GET'} ${path} failed: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface AuthUser {
  role: 'coach' | 'player';
  id: string;
  name: string;
  email: string;
  playerId?: string;
}

export interface UploadedVideo {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

export interface VideoLibraryItem {
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
}

export function uploadVideo(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadedVideo> {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/uploads/video');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).error)); }
        catch { reject(new Error('Upload failed')); }
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

export const api = {
  auth: {
    coachRegister: (name: string, email: string, password: string) =>
      request<{ token: string; user: AuthUser }>('/auth/coach/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),
    updateProfile: (name: string, email: string) =>
      request<{ token: string; user: AuthUser }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, email }),
      }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ message: string }>('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },
  players: {
    list: () => request<Player[]>('/players'),
    create: (data: Omit<Player, 'id'>) =>
      request<Player & { defaultPassword: string }>('/players', { method: 'POST', body: JSON.stringify(data) }),
  },
  drills: {
    list: () => request<Drill[]>('/drills'),
    create: (data: Drill) => request<Drill>('/drills', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/drills/${id}`, { method: 'DELETE' }),
  },
  sessions: {
    list: () => request<CoachSessionInput[]>('/sessions'),
    create: (data: CoachSessionInput) => request<CoachSessionInput>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  },
  practiceLogs: {
    list: () => request<PracticeLog[]>('/practice-logs'),
    create: (data: PracticeLog) => request<PracticeLog>('/practice-logs', { method: 'POST', body: JSON.stringify(data) }),
  },
  questions: {
    list: () => request<PlayerPracticeQuestion[]>('/questions'),
    create: (data: PlayerPracticeQuestion) => request<PlayerPracticeQuestion>('/questions', { method: 'POST', body: JSON.stringify(data) }),
    answer: (id: string, payload: { coachResponse: string; isFixed?: boolean }) =>
      request<PlayerPracticeQuestion>(`/questions/${id}/answer`, { method: 'PATCH', body: JSON.stringify(payload) }),
  },
  fixedReferences: {
    list: () => request<FixedReference[]>('/fixed-references'),
    create: (data: FixedReference) => request<FixedReference>('/fixed-references', { method: 'POST', body: JSON.stringify(data) }),
  },
  matches: {
    list: () => request<MatchPerformance[]>('/matches'),
    create: (data: MatchPerformance) => request<MatchPerformance>('/matches', { method: 'POST', body: JSON.stringify(data) }),
  },
  autoReports: {
    list: () => request<AutoCoachReport[]>('/auto-reports'),
    create: (data: AutoCoachReport) => request<AutoCoachReport>('/auto-reports', { method: 'POST', body: JSON.stringify(data) }),
  },
  uploads: {
    listVideos: () => request<VideoLibraryItem[]>('/uploads/videos'),
    deleteVideo: (filename: string) => request<void>(`/uploads/videos/${filename}`, { method: 'DELETE' }),
  },
  presets: {
    listFields: () => request<{ id: string; name: string; fielders: { name: string; angle: number; distance: number }[] }[]>('/presets/fields'),
    saveField: (name: string, fielders: { name: string; angle: number; distance: number }[]) =>
      request<{ id: string; name: string; fielders: unknown }>('/presets/fields', { method: 'POST', body: JSON.stringify({ name, fielders }) }),
    deleteField: (id: string) => request<void>(`/presets/fields/${id}`, { method: 'DELETE' }),

    listShots: () => request<{ id: string; name: string; shotType: string; angle: number; power: number }[]>('/presets/shots'),
    saveShot: (name: string, shotType: string, angle: number, power: number) =>
      request<{ id: string; name: string; shotType: string; angle: number; power: number }>('/presets/shots', { method: 'POST', body: JSON.stringify({ name, shotType, angle, power }) }),
    deleteShot: (id: string) => request<void>(`/presets/shots/${id}`, { method: 'DELETE' }),
  },
};
