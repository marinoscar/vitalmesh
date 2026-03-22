import React from 'react';
import { Card, CardActionArea, CardContent, Typography, Box, Skeleton } from '@mui/material';

interface HealthSummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  onClick?: () => void;
  isLoading?: boolean;
}

export const HealthSummaryCard = React.memo(function HealthSummaryCard({
  title,
  value,
  subtitle,
  icon,
  color,
  onClick,
  isLoading,
}: HealthSummaryCardProps) {
  const content = (
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          borderRadius: 2,
          bgcolor: color ? `${color}20` : 'action.hover',
          color: color || 'primary.main',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" color="text.secondary" noWrap>
          {title}
        </Typography>
        {isLoading ? (
          <>
            <Skeleton width={80} height={32} />
            {subtitle !== undefined && <Skeleton width={60} height={20} />}
          </>
        ) : (
          <>
            <Typography variant="h5" component="div" fontWeight="bold" noWrap>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {subtitle}
              </Typography>
            )}
          </>
        )}
      </Box>
    </CardContent>
  );

  if (onClick) {
    return (
      <Card>
        <CardActionArea onClick={onClick}>{content}</CardActionArea>
      </Card>
    );
  }

  return <Card>{content}</Card>;
});
