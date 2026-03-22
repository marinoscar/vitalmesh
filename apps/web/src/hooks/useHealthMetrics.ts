import { useState, useEffect, useCallback } from 'react';
import type { HealthMetricRecord, SleepSession, ExerciseSession, NutritionEntry, PaginatedMeta } from '../types';
import { getHealthMetrics, getGroupedMetrics, getSleepSessions, getExerciseSessions, getNutritionEntries } from '../services/api';

type HealthRecord = HealthMetricRecord | SleepSession | ExerciseSession | NutritionEntry;

interface UseHealthMetricsParams {
  metric?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

interface UseHealthMetricsResult {
  records: HealthRecord[];
  meta: PaginatedMeta | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useHealthMetrics({ metric, from, to, page = 1, pageSize = 20 }: UseHealthMetricsParams): UseHealthMetricsResult {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (metric === 'sleep') {
        const result = await getSleepSessions({ from, to, page, pageSize });
        setRecords(result.data);
        setMeta(result.meta);
      } else if (metric === 'exercise') {
        const result = await getExerciseSessions({ from, to, page, pageSize });
        setRecords(result.data);
        setMeta(result.meta);
      } else if (metric === 'nutrition') {
        const result = await getNutritionEntries({ from, to, page, pageSize });
        setRecords(result.data);
        setMeta(result.meta);
      } else if (metric === 'systolic_bp') {
        const result = await getGroupedMetrics({ metric: 'systolic_bp', from, to });
        // Flatten groups into individual records for display
        const flattened = result.groups.flat();
        setRecords(flattened);
        setMeta(null);
      } else {
        const result = await getHealthMetrics({ metric, from, to, page, pageSize, sortOrder: 'asc' });
        setRecords(result.data);
        setMeta(result.meta);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health data');
    } finally {
      setIsLoading(false);
    }
  }, [metric, from, to, page, pageSize]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { records, meta, isLoading, error, refresh: fetchRecords };
}
