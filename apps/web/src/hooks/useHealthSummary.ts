import { useState, useEffect, useCallback } from 'react';
import type { HealthSummary, DateRangeSelection } from '../types';
import { getHealthSummary } from '../services/api';

interface UseHealthSummaryParams {
  selection: DateRangeSelection;
}

interface UseHealthSummaryResult {
  summary: HealthSummary | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Compute ISO from/to strings from a DateRangeSelection. */
function resolveDates(selection: DateRangeSelection): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now);

  switch (selection.range) {
    case 'today':
      from.setHours(0, 0, 0, 0);
      break;
    case 'week':
      from.setDate(from.getDate() - 7);
      break;
    case '30d':
      from.setDate(from.getDate() - 30);
      break;
    case '90d':
      from.setDate(from.getDate() - 90);
      break;
    case 'year':
      from.setDate(from.getDate() - 365);
      break;
    case 'custom': {
      const days = selection.customDays ?? 30;
      from.setDate(from.getDate() - days);
      break;
    }
  }

  return { from: from.toISOString(), to };
}

export function useHealthSummary({ selection }: UseHealthSummaryParams): UseHealthSummaryResult {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable key so useCallback only re-fires when the resolved dates change
  const { from, to } = resolveDates(selection);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHealthSummary({ from, to });
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health summary');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, isLoading, error, refresh: fetchSummary };
}
