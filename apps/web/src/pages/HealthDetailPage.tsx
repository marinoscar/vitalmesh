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
import { DateRangeSelector } from '../components/health/DateRangeSelector';
import { StatsRow } from '../components/health/StatsRow';
import { RecordList } from '../components/health/RecordList';
import type { DateRange, HealthMetricRecord, SleepSession, ExerciseSession } from '../types';

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

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now);
  if (range === 'day') {
    from.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    from.setDate(from.getDate() - 7);
  } else {
    from.setDate(from.getDate() - 30);
  }
  return { from: from.toISOString(), to };
}

function getChartConfig(metric: string) {
  switch (metric) {
    case 'steps':
      return { type: 'bar' as const, lines: [{ dataKey: 'value', name: 'Steps', color: '#4caf50' }] };
    case 'heart_rate':
      return {
        type: 'line' as const,
        lines: [
          { dataKey: 'min', name: 'Min', color: '#ef9a9a' },
          { dataKey: 'avg', name: 'Avg', color: '#f44336' },
          { dataKey: 'max', name: 'Max', color: '#ef9a9a' },
        ],
      };
    case 'sleep':
      return {
        type: 'stacked-bar' as const,
        lines: [
          { dataKey: 'deep', name: 'Deep', color: '#1a237e' },
          { dataKey: 'light', name: 'Light', color: '#7986cb' },
          { dataKey: 'rem', name: 'REM', color: '#9c27b0' },
          { dataKey: 'awake', name: 'Awake', color: '#ffab91' },
        ],
      };
    case 'weight':
      return { type: 'line' as const, lines: [{ dataKey: 'value', name: 'Weight', color: '#ff9800' }] };
    case 'systolic_bp':
      return {
        type: 'line' as const,
        lines: [
          { dataKey: 'systolic', name: 'Systolic', color: '#f44336' },
          { dataKey: 'diastolic', name: 'Diastolic', color: '#2196f3' },
        ],
      };
    case 'active_calories':
      return { type: 'bar' as const, lines: [{ dataKey: 'value', name: 'Calories', color: '#ff5722' }] };
    case 'exercise':
      return { type: 'bar' as const, lines: [{ dataKey: 'value', name: 'Duration (min)', color: '#2196f3' }] };
    default:
      return { type: 'bar' as const, lines: [{ dataKey: 'value', name: 'Value', color: '#1976d2' }] };
  }
}

export default function HealthDetailPage() {
  const { metric = 'steps' } = useParams<{ metric: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>('week');
  const { from, to } = getDateRange(range);

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
        return { date: new Date(s.startTime).toLocaleDateString(), ...stageMap };
      });
    }
    if (metric === 'exercise') {
      return (records as ExerciseSession[]).map((s) => ({
        date: new Date(s.startTime).toLocaleDateString(),
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
        const day = r.timestamp.slice(0, 10);
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
    // Default: aggregate by day for bar charts
    if (metric === 'steps' || metric === 'active_calories') {
      const byDay = new Map<string, number>();
      (records as HealthMetricRecord[]).forEach((r) => {
        const day = r.timestamp.slice(0, 10);
        byDay.set(day, (byDay.get(day) || 0) + r.value);
      });
      return Array.from(byDay.entries()).map(([date, value]) => ({ date, value }));
    }
    // Line chart metrics (weight, etc.)
    return (records as HealthMetricRecord[]).map((r) => ({
      date: new Date(r.timestamp).toLocaleDateString(),
      value: r.value,
    }));
  }, [records, metric]);

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
          <DateRangeSelector value={range} onChange={setRange} />
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
