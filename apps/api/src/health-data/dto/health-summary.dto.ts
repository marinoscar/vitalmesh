export interface SleepStages {
  deep: number;
  light: number;
  rem: number;
  awake: number;
}

export interface BloodPressureReading {
  systolic: number;
  diastolic: number | null;
}

export interface HealthSummaryDto {
  period: {
    from: Date;
    to: Date;
  };
  steps: {
    total: number;
    average: number;
    latest: number | null;
  };
  heartRate: {
    min: number | null;
    max: number | null;
    average: number | null;
    resting: number | null;
    latest: number | null;
  };
  sleep: {
    totalDurationMs: number;
    stages: SleepStages;
  };
  weight: {
    latest: number | null;
  };
  bloodPressure: {
    latest: BloodPressureReading | null;
  };
  activeCalories: {
    total: number;
  };
  exercise: {
    sessions: number;
    totalDurationMs: number;
  };
}
