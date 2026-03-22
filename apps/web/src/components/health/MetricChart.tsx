import React from 'react';
import { useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

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

  const commonAxisProps = {
    tick: { fill: theme.palette.text.secondary, fontSize: 12 },
    axisLine: { stroke: theme.palette.divider },
    tickLine: { stroke: theme.palette.divider },
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 4,
      color: theme.palette.text.primary,
    },
  };

  if (config.type === 'bar' || config.type === 'stacked-bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis dataKey="date" {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip {...tooltipStyle} />
          {lines.length > 1 && <Legend />}
          {lines.map((line) => (
            <Bar
              key={line.dataKey}
              dataKey={line.dataKey}
              name={line.name}
              fill={line.color}
              radius={[4, 4, 0, 0]}
              stackId={config.type === 'stacked-bar' ? 'stack' : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis dataKey="date" {...commonAxisProps} />
        <YAxis {...commonAxisProps} />
        <Tooltip {...tooltipStyle} />
        {lines.length > 1 && <Legend />}
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={line.dataKey === 'avg' || lines.length === 1 ? 2 : 1}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
});

export default MetricChart;
