import { useState, useEffect, useCallback } from 'react';
import type { HealthSummary, DateRange } from '../types';
import { getHealthSummary } from '../services/api';

interface UseHealthSummaryParams {
  date?: string;
  range: DateRange;
}

interface UseHealthSummaryResult {
  summary: HealthSummary | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useHealthSummary({ date, range }: UseHealthSummaryParams): UseHealthSummaryResult {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHealthSummary({ date, range });
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health summary');
    } finally {
      setIsLoading(false);
    }
  }, [date, range]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, isLoading, error, refresh: fetchSummary };
}
