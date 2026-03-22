import { useState, useEffect } from 'react';
import { Box, Chip, TextField, InputAdornment, Typography } from '@mui/material';
import type { DateRange, DateRangeSelection } from '../../types';

const STORAGE_KEY = 'health_date_range';

interface Preset {
  value: DateRange;
  label: string;
}

const PRESETS: Preset[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'year', label: '1 Year' },
  { value: 'custom', label: 'Custom' },
];

interface DateRangeSelectorProps {
  selection: DateRangeSelection;
  onSelectionChange: (selection: DateRangeSelection) => void;
}

export function DateRangeSelector({ selection, onSelectionChange }: DateRangeSelectorProps) {
  const [customInput, setCustomInput] = useState<string>(
    selection.customDays != null ? String(selection.customDays) : '',
  );

  // Sync customInput if the selection changes externally (e.g., from localStorage on mount)
  useEffect(() => {
    if (selection.range === 'custom' && selection.customDays != null) {
      setCustomInput(String(selection.customDays));
    }
  }, [selection.range, selection.customDays]);

  function handlePresetClick(value: DateRange) {
    if (value === 'custom') {
      const days = parseInt(customInput, 10);
      const next: DateRangeSelection = {
        range: 'custom',
        customDays: Number.isFinite(days) && days > 0 ? days : undefined,
      };
      persist(next);
      onSelectionChange(next);
    } else {
      const next: DateRangeSelection = { range: value };
      persist(next);
      onSelectionChange(next);
    }
  }

  function handleCustomInputChange(raw: string) {
    // Allow only digits
    const cleaned = raw.replace(/\D/g, '');
    setCustomInput(cleaned);
    const days = parseInt(cleaned, 10);
    if (Number.isFinite(days) && days > 0) {
      const next: DateRangeSelection = { range: 'custom', customDays: days };
      persist(next);
      onSelectionChange(next);
    }
  }

  function persist(value: DateRangeSelection) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // localStorage unavailable — ignore
    }
  }

  const isCustomSelected = selection.range === 'custom';

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
      {PRESETS.map((preset) => {
        const selected = selection.range === preset.value;
        return (
          <Chip
            key={preset.value}
            label={preset.label}
            onClick={() => handlePresetClick(preset.value)}
            color={selected ? 'primary' : 'default'}
            variant={selected ? 'filled' : 'outlined'}
            size="small"
            sx={{
              fontWeight: selected ? 600 : 400,
              transition: 'all 0.15s ease',
              cursor: 'pointer',
            }}
          />
        );
      })}

      {isCustomSelected && (
        <TextField
          size="small"
          value={customInput}
          onChange={(e) => handleCustomInputChange(e.target.value)}
          placeholder="30"
          inputProps={{
            inputMode: 'numeric',
            pattern: '[0-9]*',
            'aria-label': 'Number of days',
            style: { width: 52, textAlign: 'center', padding: '4px 6px' },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Typography variant="caption" color="text.secondary">
                  days
                </Typography>
              </InputAdornment>
            ),
            sx: { height: 32, fontSize: 13 },
          }}
          sx={{ width: 110 }}
        />
      )}
    </Box>
  );
}

/** Load a persisted DateRangeSelection from localStorage, or return a fallback. */
export function loadPersistedSelection(fallback: DateRangeSelection): DateRangeSelection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<DateRangeSelection>;
    const validRanges: DateRange[] = ['today', 'week', '30d', '90d', 'year', 'custom'];
    if (parsed.range && validRanges.includes(parsed.range)) {
      return {
        range: parsed.range,
        customDays: parsed.customDays,
      };
    }
  } catch {
    // Corrupt data — ignore
  }
  return fallback;
}
