import { Card, CardContent, Box, Typography, Skeleton } from '@mui/material';

interface StatsRowProps {
  stats: Array<{
    label: string;
    value: string | null;
  }>;
  isLoading?: boolean;
}

export function StatsRow({ stats, isLoading }: StatsRowProps) {
  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          {stats.map((stat) => (
            <Box
              key={stat.label}
              sx={{
                flex: { xs: '1 1 40%', sm: '1 1 0' },
                textAlign: 'center',
                minWidth: 80,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
              {isLoading ? (
                <Skeleton width={60} height={28} sx={{ mx: 'auto' }} />
              ) : (
                <Typography variant="h6" fontWeight="bold">
                  {stat.value ?? '—'}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
