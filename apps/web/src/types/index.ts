export interface Role {
  name: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  profileImageUrl: string | null;
  roles: Role[];
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  profile: {
    displayName?: string;
    useProviderImage: boolean;
    customImageUrl?: string | null;
  };
  updatedAt: string;
  version: number;
}

export interface SystemSettings {
  ui: {
    allowUserThemeOverride: boolean;
  };
  features: Record<string, boolean>;
  updatedAt: string;
  updatedBy: { id: string; email: string } | null;
  version: number;
}

export interface AuthProvider {
  name: string;
  authUrl: string;
}

export interface AllowedEmailEntry {
  id: string;
  email: string;
  addedBy: { id: string; email: string } | null;
  addedAt: string;
  claimedBy: { id: string; email: string } | null;
  claimedAt: string | null;
  notes: string | null;
}

export interface AllowlistResponse {
  items: AllowedEmailEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserListItem {
  id: string;
  email: string;
  displayName: string | null;
  providerDisplayName: string | null;
  profileImageUrl: string | null;
  providerProfileImageUrl?: string | null;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeviceActivationInfo {
  userCode: string;
  clientInfo: {
    deviceName?: string;
    userAgent?: string;
    ipAddress?: string;
  };
  expiresAt: string;
}

export interface DeviceAuthorizationResponse {
  success: boolean;
  message: string;
}

// Health data types
export type DateRange = 'today' | 'week' | '30d' | '90d' | 'year' | 'custom';

export interface DateRangeSelection {
  range: DateRange;
  customDays?: number;
}

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface HealthSummary {
  period: { from: string; to: string };
  steps: { total: number; average: number; latest: number | null };
  heartRate: {
    min: number | null;
    max: number | null;
    average: number | null;
    resting: number | null;
    latest: number | null;
  };
  sleep: { totalDurationMs: number; stages: Record<string, number> };
  weight: { latest: number | null };
  bloodPressure: {
    latest: { systolic: number; diastolic: number | null } | null;
  };
  activeCalories: { total: number };
  exercise: { sessions: number; totalDurationMs: number };
}

export interface HealthMetricRecord {
  id: string;
  timestamp: string;
  endTime?: string | null;
  metric: string;
  value: number;
  unit: string;
  source?: string | null;
  groupId?: string | null;
  tags?: Record<string, unknown> | null;
}

export interface GroupedMetricsResponse {
  groups: HealthMetricRecord[][];
}

export interface SleepSession {
  id: string;
  startTime: string;
  endTime: string;
  durationMs?: number | null;
  title?: string | null;
  notes?: string | null;
  source?: string | null;
  stages?: SleepStage[];
}

export interface SleepStage {
  stage: string;
  startTime: string;
  endTime: string;
}

export interface ExerciseSession {
  id: string;
  startTime: string;
  endTime: string;
  exerciseType: string;
  title?: string | null;
  attributes?: Record<string, unknown> | null;
  source?: string | null;
  notes?: string | null;
}

export interface NutritionEntry {
  id: string;
  startTime: string;
  endTime: string;
  mealType?: string | null;
  name?: string | null;
  nutrients?: Record<string, number> | null;
  source?: string | null;
}
