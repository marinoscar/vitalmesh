import { useState, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  IconButton,
  Alert,
  Button,
  Skeleton,
  Card,
  CardContent,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useHealthMetrics } from '../hooks/useHealthMetrics';
import { DateRangeSelector, loadPersistedSelection } from '../components/health/DateRangeSelector';
import { StatsRow } from '../components/health/StatsRow';
import { RecordList } from '../components/health/RecordList';
import type { DateRangeSelection, HealthMetricRecord, SleepSession, ExerciseSession } from '../types';

const MetricChart = lazy(() => import('../components/health/MetricChart'));

const METRIC_LABELS: Record<string, string> = {
  steps: 'Steps',
  heart_rate: 'Heart Rate',
  sleep: 'Sleep',
  weight: 'Weight',
  systolic_bp: 'Blood Pressure',
  active_calories: 'Active Calories',
  exercise: 'Exercise',
};

const METRIC_UNITS: Record<string, string> = {
  steps: 'steps',
  heart_rate: 'bpm',
  weight: 'kg',
  systolic_bp: 'mmHg',
  active_calories: 'kcal',
};

const SHORT_MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateLabel(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${SHORT_MONTH[date.getMonth()]} ${date.getDate()}`;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getDateRange(selection: DateRangeSelection): { from: string; to: string } {
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

function getChartConfig(metric: string) {
  switch (metric) {
    case 'steps':
      return { type: 'bar' as const, lines: [{ dataKey: 'value', name: 'Steps' }] };
    case 'heart_rate':
      return {
        type: 'line' as const,
        lines: [
          { dataKey: 'min', name: 'Min' },
          { dataKey: 'avg', name: 'Avg' },
          { dataKey: 'max', name: 'Max' },
        ],
      };
    case 'sleep':
      return {
        type: 'stacked-bar' as const,
        lines: [
          { dataKey: 'deep', name: 'Deep' },
          { dataKey: 'light', name: 'Light' },
          { dataKey: 'rem', name: 'REM' },
          { dataKey: 'awake', name: 'Awake' },
        ],
      };
    case 'weight':
      return { type: 'line' as const, lines: [{ dataKey: 'value', name: 'Weight' }] };
    case 'systolic_bp':
      return {
        type: 'line' as const,
        lines: [
          { dataKey: 'systolic', name: 'Systolic' },
          { dataKey: 'diastolic', name: 'Diastolic' },
        ],
      };
    case 'active_calories':
      return { type: 'bar' as const, lines: [{ dataKey: 'value', name: 'Calories' }] };
    case 'exercise':
      return { type: 'bar' as const, lines: [{ dataKey: 'value', name: 'Duration (min)' }] };
    default:
      return { type: 'bar' as const, lines: [{ dataKey: 'value', name: 'Value' }] };
  }
}

export default function HealthDetailPage() {
  const { metric = 'steps' } = useParams<{ metric: string }>();
  const navigate = useNavigate();
  const [selection, setSelection] = useState<DateRangeSelection>(() =>
    loadPersistedSelection({ range: 'week' }),
  );
  const { from, to } = useMemo(() => getDateRange(selection), [selection]);

  const { records, isLoading, error, refresh } = useHealthMetrics({
    metric,
    from,
    to,
    pageSize: 100,
  });

  // Compute stats from records
  const stats = useMemo(() => {
    if (metric === 'sleep') {
      const sessions = records as SleepSession[];
      const durations = sessions.filter((s) => s.durationMs).map((s) => s.durationMs!);
      if (durations.length === 0) return [];
      return [
        { label: 'Min', value: formatDuration(Math.min(...durations)) },
        { label: 'Max', value: formatDuration(Math.max(...durations)) },
        { label: 'Avg', value: formatDuration(Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)) },
        { label: 'Sessions', value: String(sessions.length) },
      ];
    }
    if (metric === 'exercise') {
      const sessions = records as ExerciseSession[];
      const durations = sessions.map((s) => new Date(s.endTime).getTime() - new Date(s.startTime).getTime());
      if (durations.length === 0) return [];
      return [
        { label: 'Min', value: formatDuration(Math.min(...durations)) },
        { label: 'Max', value: formatDuration(Math.max(...durations)) },
        { label: 'Avg', value: formatDuration(Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)) },
        { label: 'Sessions', value: String(sessions.length) },
      ];
    }
    // Numeric metrics
    const metricRecords = records as HealthMetricRecord[];
    const values = metricRecords.map((r) => r.value);
    if (values.length === 0) return [];
    const unit = METRIC_UNITS[metric] || '';
    return [
      { label: 'Min', value: `${Math.min(...values).toLocaleString()} ${unit}`.trim() },
      { label: 'Max', value: `${Math.max(...values).toLocaleString()} ${unit}`.trim() },
      { label: 'Avg', value: `${Math.round(values.reduce((a, b) => a + b, 0) / values.length).toLocaleString()} ${unit}`.trim() },
      { label: 'Latest', value: `${values[values.length - 1].toLocaleString()} ${unit}`.trim() },
    ];
  }, [records, metric]);

  // Transform records for chart
  const chartData = useMemo(() => {
    if (metric === 'sleep') {
      return (records as SleepSession[]).map((s) => {
        const stageMap: Record<string, number> = { deep: 0, light: 0, rem: 0, awake: 0 };
        s.stages?.forEach((stage) => {
          const dur = new Date(stage.endTime).getTime() - new Date(stage.startTime).getTime();
          const key = stage.stage.toLowerCase();
          if (key in stageMap) stageMap[key] += dur / 60000; // minutes
        });
        return { date: formatDateLabel(s.startTime), ...stageMap };
      });
    }
    if (metric === 'exercise') {
      return (records as ExerciseSession[]).map((s) => ({
        date: formatDateLabel(s.startTime),
        value: Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000),
      }));
    }
    if (metric === 'systolic_bp') {
      // Group BP records by groupId or timestamp
      const grouped = new Map<string, { systolic?: number; diastolic?: number }>();
      (records as HealthMetricRecord[]).forEach((r) => {
        const key = r.groupId || r.timestamp;
        if (!grouped.has(key)) grouped.set(key, {});
        const entry = grouped.get(key)!;
        if (r.metric === 'systolic_bp') entry.systolic = r.value;
        if (r.metric === 'diastolic_bp') entry.diastolic = r.value;
      });
      return Array.from(grouped.entries()).map(([, v]) => ({
        date: '',
        systolic: v.systolic || 0,
        diastolic: v.diastolic || 0,
      }));
    }
    if (metric === 'heart_rate') {
      // Aggregate by day
      const byDay = new Map<string, number[]>();
      (records as HealthMetricRecord[]).forEach((r) => {
        const day = formatDateLabel(r.timestamp);
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day)!.push(r.value);
      });
      return Array.from(byDay.entries()).map(([date, values]) => ({
        date,
        min: Math.min(...values),
        avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        max: Math.max(...values),
      }));
    }
    // Default: aggregate by day or week for bar charts
    if (metric === 'steps' || metric === 'active_calories') {
      const useWeekly = selection.range === '90d' || selection.range === 'year' ||
        (selection.range === 'custom' && (selection.customDays ?? 0) > 30);
      const bucket = new Map<string, number>();
      (records as HealthMetricRecord[]).forEach((r) => {
        const d = new Date(r.timestamp);
        let key: string;
        if (useWeekly) {
          const day = new Date(d);
          const dayOfWeek = day.getDay();
          const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          day.setDate(day.getDate() + diff);
          key = formatDateLabel(day);
        } else {
          key = formatDateLabel(r.timestamp);
        }
        bucket.set(key, (bucket.get(key) || 0) + r.value);
      });
      return Array.from(bucket.entries()).map(([date, value]) => ({ date, value }));
    }
    // Line chart metrics (weight, etc.)
    return (records as HealthMetricRecord[]).map((r) => ({
      date: formatDateLabel(r.timestamp),
      value: r.value,
    }));
  }, [records, metric, selection]);

  // Transform records for the list
  const recordItems = useMemo(() => {
    if (metric === 'sleep') {
      return (records as SleepSession[]).map((s) => ({
        id: s.id,
        title: new Date(s.startTime).toLocaleDateString(),
        subtitle: s.stages?.map((st) => st.stage).filter((v, i, a) => a.indexOf(v) === i).join(', ') || '',
        value: s.durationMs ? formatDuration(s.durationMs) : 'N/A',
        source: s.source,
      }));
    }
    if (metric === 'exercise') {
      return (records as ExerciseSession[]).map((s) => ({
        id: s.id,
        title: s.title || s.exerciseType,
        subtitle: new Date(s.startTime).toLocaleDateString(),
        value: formatDuration(new Date(s.endTime).getTime() - new Date(s.startTime).getTime()),
        source: s.source,
      }));
    }
    const unit = METRIC_UNITS[metric] || '';
    return (records as HealthMetricRecord[]).map((r) => ({
      id: r.id,
      title: new Date(r.timestamp).toLocaleString(),
      subtitle: r.metric,
      value: `${r.value.toLocaleString()} ${unit}`.trim(),
      source: r.source,
    }));
  }, [records, metric]);

  const chartConfig = getChartConfig(metric);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1, flexWrap: 'wrap' }}>
          <IconButton onClick={() => navigate('/')} edge="start">
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ flex: 1 }}>
            {METRIC_LABELS[metric] || metric}
          </Typography>
          <DateRangeSelector selection={selection} onSelectionChange={setSelection} />
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} action={<Button onClick={refresh} size="small">Retry</Button>}>
            {error}
          </Alert>
        )}

        {/* Stats */}
        {stats.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <StatsRow stats={stats} isLoading={isLoading} />
          </Box>
        )}

        {/* Chart */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {METRIC_LABELS[metric] || metric} Trend
            </Typography>
            {isLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : chartData.length > 0 ? (
              <Suspense fallback={<Skeleton variant="rectangular" height={300} />}>
                <MetricChart data={chartData} config={chartConfig} />
              </Suspense>
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">No data for this period</Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Records */}
        <RecordList
          title="Records"
          records={recordItems}
          isLoading={isLoading}
        />
      </Box>
    </Container>
  );
}
