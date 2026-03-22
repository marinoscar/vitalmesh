import React from 'react';
import { useTheme } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';

interface LineConfig {
  dataKey: string;
  name: string;
  color: string;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'stacked-bar';
  lines?: LineConfig[];
}

interface MetricChartProps {
  data: Array<Record<string, unknown>>;
  config: ChartConfig;
}

const MetricChart = React.memo(function MetricChart({ data, config }: MetricChartProps) {
  const theme = useTheme();

  const lines = config.lines || [
    { dataKey: 'value', name: 'Value', color: theme.palette.primary.main },
  ];

  const xLabels = data.map((d) => (d.date as string) || '');

  if (config.type === 'bar' || config.type === 'stacked-bar') {
    const series = lines.map((line) => ({
      data: data.map((d) => (d[line.dataKey] as number) ?? 0),
      label: line.name,
      color: line.color,
      stack: config.type === 'stacked-bar' ? 'stack' : undefined,
    }));

    return (
      <BarChart
        height={300}
        series={series}
        xAxis={[{ data: xLabels, scaleType: 'band' as const }]}
        slotProps={{
          legend: { hidden: lines.length <= 1 },
        }}
      />
    );
  }

  const series = lines.map((line) => ({
    data: data.map((d) => (d[line.dataKey] as number) ?? null),
    label: line.name,
    color: line.color,
    showMark: false,
  }));

  return (
    <LineChart
      height={300}
      series={series}
      xAxis={[{ data: xLabels, scaleType: 'point' as const }]}
      slotProps={{
        legend: { hidden: lines.length <= 1 },
      }}
    />
  );
});

export default MetricChart;
