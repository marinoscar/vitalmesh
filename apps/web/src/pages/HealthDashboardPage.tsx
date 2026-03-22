import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Grid,
  Alert,
  Button,
  Card,
  CardContent,
  Skeleton,
} from '@mui/material';
import {
  DirectionsWalk,
  FavoriteBorder,
  Bedtime,
  MonitorWeight,
  Bloodtype,
  LocalFireDepartment,
  FitnessCenter,
} from '@mui/icons-material';
import { useHealthSummary } from '../hooks/useHealthSummary';
import { DateRangeSelector, loadPersistedSelection } from '../components/health/DateRangeSelector';
import { HealthSummaryCard } from '../components/health/HealthSummaryCard';
import type { DateRangeSelection, HealthMetricRecord, SleepSession, ExerciseSession } from '../types';
import { getHealthMetrics, getSleepSessions, getExerciseSessions } from '../services/api';

const MetricChart = lazy(() => import('../components/health/MetricChart'));

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

export default function HealthDashboardPage() {
  const [selection, setSelection] = useState<DateRangeSelection>(() =>
    loadPersistedSelection({ range: 'week' }),
  );
  const { summary, isLoading, error, refresh } = useHealthSummary({ selection });
  const navigate = useNavigate();

  // Chart data state
  const [stepsData, setStepsData] = useState<Array<{ date: string; value: number }>>([]);
  const [hrData, setHrData] = useState<Array<{ date: string; min: number; avg: number; max: number }>>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  // Recent activity state
  const [recentSleep, setRecentSleep] = useState<SleepSession[]>([]);
  const [recentExercise, setRecentExercise] = useState<ExerciseSession[]>([]);

  const fetchChartData = useCallback(async () => {
    setChartsLoading(true);
    const { from, to } = getDateRange(selection);
    try {
      const [stepsResult, hrResult] = await Promise.all([
        getHealthMetrics({ metric: 'steps', from, to, pageSize: 100, sortOrder: 'asc' }),
        getHealthMetrics({ metric: 'heart_rate', from, to, pageSize: 100, sortOrder: 'asc' }),
      ]);

      // Aggregate steps by day
      const stepsByDay = new Map<string, number>();
      (stepsResult as HealthMetricRecord[]).forEach((r) => {
        const day = r.timestamp.slice(0, 10);
        stepsByDay.set(day, (stepsByDay.get(day) || 0) + r.value);
      });
      setStepsData(
        Array.from(stepsByDay.entries()).map(([date, value]) => ({ date, value })),
      );

      // Aggregate HR by day (min/max/avg)
      const hrByDay = new Map<string, number[]>();
      (hrResult as HealthMetricRecord[]).forEach((r) => {
        const day = r.timestamp.slice(0, 10);
        if (!hrByDay.has(day)) hrByDay.set(day, []);
        hrByDay.get(day)!.push(r.value);
      });
      setHrData(
        Array.from(hrByDay.entries()).map(([date, values]) => ({
          date,
          min: Math.min(...values),
          avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          max: Math.max(...values),
        })),
      );
    } catch {
      // Chart data is non-critical, summary cards are the priority
    } finally {
      setChartsLoading(false);
    }
  }, [selection]);

  const fetchRecentActivity = useCallback(async () => {
    const { from, to } = getDateRange(selection);
    try {
      const [sleepResult, exerciseResult] = await Promise.all([
        getSleepSessions({ from, to, pageSize: 5 }),
        getExerciseSessions({ from, to, pageSize: 5 }),
      ]);
      setRecentSleep(sleepResult as SleepSession[]);
      setRecentExercise(exerciseResult as ExerciseSession[]);
    } catch {
      // Non-critical
    }
  }, [selection]);

  useEffect(() => {
    fetchChartData();
    fetchRecentActivity();
  }, [fetchChartData, fetchRecentActivity]);

  const hasNoData =
    !isLoading &&
    summary &&
    summary.steps.total === 0 &&
    summary.heartRate.latest === null &&
    summary.sleep.totalDurationMs === 0 &&
    summary.weight.latest === null &&
    summary.exercise.sessions === 0;

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" component="h1">
            Health Dashboard
          </Typography>
          <DateRangeSelector selection={selection} onSelectionChange={setSelection} />
        </Box>

        {/* Error state */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} action={<Button onClick={refresh} size="small">Retry</Button>}>
            {error}
          </Alert>
        )}

        {/* Empty state */}
        {hasNoData && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No health data yet. Sync from the VitalMesh Android app to see your dashboard.
          </Alert>
        )}

        {/* Summary Cards Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <HealthSummaryCard
              title="Steps"
              value={summary ? summary.steps.total.toLocaleString() : '—'}
              subtitle={summary ? `Avg ${summary.steps.average.toLocaleString()}/day` : undefined}
              icon={<DirectionsWalk />}
              color="#4caf50"
              onClick={() => navigate('/health/steps')}
              isLoading={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <HealthSummaryCard
              title="Heart Rate"
              value={summary?.heartRate.latest != null ? `${summary.heartRate.latest} bpm` : '—'}
              subtitle={
                summary?.heartRate.min != null && summary?.heartRate.max != null
                  ? `${summary.heartRate.min}–${summary.heartRate.max} bpm`
                  : undefined
              }
              icon={<FavoriteBorder />}
              color="#f44336"
              onClick={() => navigate('/health/heart_rate')}
              isLoading={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <HealthSummaryCard
              title="Sleep"
              value={summary ? formatDuration(summary.sleep.totalDurationMs) : '—'}
              subtitle={
                summary?.sleep.stages
                  ? Object.entries(summary.sleep.stages)
                      .filter(([, v]) => v > 0)
                      .map(([k, v]) => `${k}: ${formatDuration(v)}`)
                      .join(', ')
                  : undefined
              }
              icon={<Bedtime />}
              color="#9c27b0"
              onClick={() => navigate('/health/sleep')}
              isLoading={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <HealthSummaryCard
              title="Weight"
              value={summary?.weight.latest != null ? `${summary.weight.latest} kg` : '—'}
              icon={<MonitorWeight />}
              color="#ff9800"
              onClick={() => navigate('/health/weight')}
              isLoading={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <HealthSummaryCard
              title="Blood Pressure"
              value={
                summary?.bloodPressure.latest
                  ? `${summary.bloodPressure.latest.systolic}/${summary.bloodPressure.latest.diastolic ?? '—'}`
                  : '—'
              }
              subtitle="mmHg"
              icon={<Bloodtype />}
              color="#e91e63"
              onClick={() => navigate('/health/systolic_bp')}
              isLoading={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <HealthSummaryCard
              title="Active Calories"
              value={summary ? `${summary.activeCalories.total.toLocaleString()} kcal` : '—'}
              icon={<LocalFireDepartment />}
              color="#ff5722"
              onClick={() => navigate('/health/active_calories')}
              isLoading={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <HealthSummaryCard
              title="Exercise"
              value={summary ? `${summary.exercise.sessions} sessions` : '—'}
              subtitle={summary ? formatDuration(summary.exercise.totalDurationMs) : undefined}
              icon={<FitnessCenter />}
              color="#2196f3"
              onClick={() => navigate('/health/exercise')}
              isLoading={isLoading}
            />
          </Grid>
        </Grid>

        {/* Trend Charts */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Steps
                </Typography>
                {chartsLoading ? (
                  <Skeleton variant="rectangular" height={300} />
                ) : stepsData.length > 0 ? (
                  <Suspense fallback={<Skeleton variant="rectangular" height={300} />}>
                    <MetricChart
                      data={stepsData}
                      config={{
                        type: 'bar',
                        lines: [{ dataKey: 'value', name: 'Steps' }],
                      }}
                    />
                  </Suspense>
                ) : (
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">No step data for this period</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Heart Rate
                </Typography>
                {chartsLoading ? (
                  <Skeleton variant="rectangular" height={300} />
                ) : hrData.length > 0 ? (
                  <Suspense fallback={<Skeleton variant="rectangular" height={300} />}>
                    <MetricChart
                      data={hrData}
                      config={{
                        type: 'line',
                        lines: [
                          { dataKey: 'min', name: 'Min' },
                          { dataKey: 'avg', name: 'Avg' },
                          { dataKey: 'max', name: 'Max' },
                        ],
                      }}
                    />
                  </Suspense>
                ) : (
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">No heart rate data for this period</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recent Activity */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Sleep
                </Typography>
                {recentSleep.length === 0 ? (
                  <Typography color="text.secondary">No recent sleep data</Typography>
                ) : (
                  recentSleep.map((session) => (
                    <Box key={session.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2">
                        {new Date(session.startTime).toLocaleDateString()} — {session.durationMs ? formatDuration(session.durationMs) : 'N/A'}
                      </Typography>
                      {session.stages && session.stages.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {session.stages.map((s) => s.stage).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                        </Typography>
                      )}
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Exercise
                </Typography>
                {recentExercise.length === 0 ? (
                  <Typography color="text.secondary">No recent exercise data</Typography>
                ) : (
                  recentExercise.map((session) => (
                    <Box key={session.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" fontWeight="medium">
                        {session.title || session.exerciseType}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(session.startTime).toLocaleDateString()} — {formatDuration(new Date(session.endTime).getTime() - new Date(session.startTime).getTime())}
                      </Typography>
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
