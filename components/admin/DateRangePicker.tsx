'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';

export type DateRangePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'last90days'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom';

export interface DateRange {
  from?: string;
  to?: string;
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  align?: 'left' | 'right';
}

interface PresetOption {
  value: DateRangePreset;
  label: string;
  icon?: string;
}

const presets: PresetOption[] = [
  { value: 'all', label: 'كل الوقت' },
  { value: 'today', label: 'اليوم' },
  { value: 'yesterday', label: 'أمس' },
  { value: 'last7days', label: 'آخر 7 أيام' },
  { value: 'last30days', label: 'آخر 30 يوم' },
  { value: 'last90days', label: 'آخر 90 يوم' },
  { value: 'thisMonth', label: 'هذا الشهر' },
  { value: 'lastMonth', label: 'الشهر الماضي' },
  { value: 'thisYear', label: 'هذا العام' },
  { value: 'custom', label: 'نطاق مخصص' },
];

function getPresetRange(preset: DateRangePreset): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'all':
      return {};

    case 'today':
      return {
        from: formatDate(today),
        to: formatDate(today),
      };

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        from: formatDate(yesterday),
        to: formatDate(yesterday),
      };
    }

    case 'last7days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return {
        from: formatDate(start),
        to: formatDate(today),
      };
    }

    case 'last30days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return {
        from: formatDate(start),
        to: formatDate(today),
      };
    }

    case 'last90days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 89);
      return {
        from: formatDate(start),
        to: formatDate(today),
      };
    }

    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        from: formatDate(start),
        to: formatDate(today),
      };
    }

    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: formatDate(start),
        to: formatDate(end),
      };
    }

    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        from: formatDate(start),
        to: formatDate(today),
      };
    }

    default:
      return {};
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr));
}

function getCurrentPreset(value?: DateRange): DateRangePreset {
  if (!value || (!value.from && !value.to)) return 'all';

  for (const preset of presets) {
    if (preset.value === 'custom') continue;
    const range = getPresetRange(preset.value);
    if (range.from === value.from && range.to === value.to) {
      return preset.value;
    }
  }

  return 'custom';
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'اختر النطاق الزمني',
  align = 'right',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<DateRangePreset>(getCurrentPreset(value));
  const [customFrom, setCustomFrom] = useState(value?.from || '');
  const [customTo, setCustomTo] = useState(value?.to || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Update internal state when value prop changes
  useEffect(() => {
    const preset = getCurrentPreset(value);
    const from = value?.from || '';
    const to = value?.to || '';
    const timer = setTimeout(() => {
      setCurrentPreset(preset);
      setCustomFrom(from);
      setCustomTo(to);
    }, 0);
    return () => clearTimeout(timer);
  }, [value]);

  const handlePresetClick = (preset: DateRangePreset) => {
    setCurrentPreset(preset);

    if (preset === 'custom') {
      // Keep current custom dates
      return;
    }

    const range = getPresetRange(preset);
    onChange(range);
    setIsOpen(false);
  };

  const handleCustomDateChange = (field: 'from' | 'to', dateValue: string) => {
    if (field === 'from') {
      setCustomFrom(dateValue);
    } else {
      setCustomTo(dateValue);
    }
    setCurrentPreset('custom');
  };

  const handleApplyCustom = () => {
    const range: DateRange = {};
    if (customFrom) range.from = customFrom;
    if (customTo) range.to = customTo;
    onChange(range);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({});
    setCurrentPreset('all');
    setCustomFrom('');
    setCustomTo('');
    setIsOpen(false);
  };

  const getDisplayLabel = (): string => {
    if (!value || (!value.from && !value.to)) return placeholder;

    const preset = getCurrentPreset(value);
    if (preset !== 'custom') {
      const presetOption = presets.find(p => p.value === preset);
      return presetOption?.label || placeholder;
    }

    // Custom range display
    if (value.from && value.to && value.from === value.to) {
      return formatDisplayDate(value.from);
    }

    if (value.from && value.to) {
      return `${formatDisplayDate(value.from)} - ${formatDisplayDate(value.to)}`;
    }

    if (value.from) {
      return `من ${formatDisplayDate(value.from)}`;
    }

    if (value.to) {
      return `حتى ${formatDisplayDate(value.to)}`;
    }

    return placeholder;
  };

  const hasValue = value && (value.from || value.to);

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <Button
        ref={buttonRef}
        type="button"
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-right font-normal"
      >
        <span className="truncate">{getDisplayLabel()}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 w-full sm:w-80 mt-1 bg-card border rounded-lg shadow-lg p-2 ${
            align === 'left' ? 'start-0' : 'end-0'
          }`}
        >
          {/* Presets */}
          <div className="space-y-1 mb-2 pb-2 border-b">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">
              نطاقات سريعة
            </div>
            {presets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePresetClick(preset.value)}
                className={`w-full text-right px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                  currentPreset === preset.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <span>{preset.label}</span>
                {currentPreset === preset.value && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Custom Range */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-medium text-muted-foreground px-2">
              نطاق مخصص
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="dateFrom" className="block text-xs mb-1 text-muted-foreground">
                  من
                </label>
                <input
                  id="dateFrom"
                  type="date"
                  value={customFrom}
                  onChange={(e) => handleCustomDateChange('from', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="dateTo" className="block text-xs mb-1 text-muted-foreground">
                  إلى
                </label>
                <input
                  id="dateTo"
                  type="date"
                  value={customTo}
                  onChange={(e) => handleCustomDateChange('to', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleApplyCustom}
                className="flex-1"
              >
                تطبيق
              </Button>
              {hasValue && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="flex-1"
                >
                  مسح
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to sync DateRangePicker with URL search params
 * For use in client components that need URL-based filter persistence
 */
export function useDateRangeFromParams(
  searchParams: URLSearchParams,
  onUpdate: (params: Record<string, string>) => void
) {
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;

  const setDateRange = (range: DateRange) => {
    const params: Record<string, string> = {};

    if (range.from) {
      params.dateFrom = range.from;
    }
    if (range.to) {
      params.dateTo = range.to;
    }

    // Keep other params
    searchParams.forEach((value, key) => {
      if (key !== 'dateFrom' && key !== 'dateTo' && key !== 'page') {
        params[key] = value;
      }
    });

    // Reset to page 1 when date range changes
    params.page = '1';

    onUpdate(params);
  };

  return {
    dateRange: { from: dateFrom, to: dateTo },
    setDateRange,
  };
}
