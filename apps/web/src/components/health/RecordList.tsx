import {
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Typography,
  Button,
  Skeleton,
  Chip,
  Box,
} from '@mui/material';

interface RecordItem {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  source?: string | null;
}

interface RecordListProps {
  title: string;
  records: RecordItem[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function RecordList({ title, records, isLoading, hasMore, onLoadMore }: RecordListProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {isLoading && records.length === 0 ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={56} sx={{ mb: 0.5 }} />
          ))
        ) : records.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No records found
          </Typography>
        ) : (
          <>
            <List disablePadding>
              {records.map((record) => (
                <ListItem key={record.id} divider sx={{ px: 0 }}>
                  <ListItemText
                    primary={record.title}
                    secondary={record.subtitle}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2, flexShrink: 0 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {record.value}
                    </Typography>
                    {record.source && (
                      <Chip label={record.source} size="small" variant="outlined" />
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
            {hasMore && onLoadMore && (
              <Button
                onClick={onLoadMore}
                fullWidth
                sx={{ mt: 1 }}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
