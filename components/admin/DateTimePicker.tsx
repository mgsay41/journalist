"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/Input";
import type { ArabicTimezone } from "@/lib/publishing";

interface DateTimePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
  required?: boolean;
  disabled?: boolean;
  timezone?: ArabicTimezone;
}

const TIMEZONES = [
  { value: "Asia/Riyadh", label: "الرياض (GMT+3)" },
  { value: "Asia/Dubai", label: "دبي (GMT+4)" },
  { value: "Asia/Kuwait", label: "الكويت (GMT+3)" },
  { value: "Asia/Bahrain", label: "البحرين (GMT+3)" },
  { value: "Asia/Qatar", label: "قطر (GMT+3)" },
  { value: "Asia/Muscat", label: "مسقط (GMT+4)" },
  { value: "Africa/Cairo", label: "القاهرة (GMT+2)" },
  { value: "Asia/Amman", label: "عمان (GMT+2)" },
  { value: "Asia/Beirut", label: "بيروت (GMT+2)" },
] as const;

export function DateTimePicker({
  value,
  onChange,
  label = "تاريخ ووقت النشر",
  error,
  minDate,
  maxDate,
  required = false,
  disabled = false,
  timezone = "Asia/Riyadh",
}: DateTimePickerProps) {
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [selectedTimezone, setSelectedTimezone] = useState<ArabicTimezone>(timezone);

  // Format value to date and time inputs
  React.useEffect(() => {
    if (value) {
      // Convert to selected timezone for display
      const date = new Date(value);
      const iso = date.toISOString();
      setDateInput(iso.slice(0, 10)); // YYYY-MM-DD
      setTimeInput(iso.slice(11, 16)); // HH:MM
    } else {
      setDateInput("");
      setTimeInput("");
    }
  }, [value, selectedTimezone]);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDateInput(newDate);
    updateDateTime(newDate, timeInput);
  };

  // Handle time change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeInput(newTime);
    updateDateTime(dateInput, newTime);
  };

  // Combine date and time inputs into a Date object
  const updateDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) {
      onChange(null);
      return;
    }

    // Parse the inputs and create a Date in the selected timezone
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);

    // Create date in UTC to avoid timezone issues
    const date = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    // Validate against min/max dates
    if (minDate && date < minDate) {
      return;
    }
    if (maxDate && date > maxDate) {
      return;
    }

    onChange(date);
  };

  // Handle clear
  const handleClear = () => {
    setDateInput("");
    setTimeInput("");
    onChange(null);
  };

  // Format min/max dates for input attributes
  const minDateStr = minDate ? minDate.toISOString().slice(0, 10) : undefined;
  const maxDateStr = maxDate ? maxDate.toISOString().slice(0, 10) : undefined;

  // Get Arabic formatted date for display
  const formattedDisplay = useMemo(() => {
    if (!value) return "";
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: selectedTimezone,
    }).format(value);
  }, [value, selectedTimezone]);

  // Get min date formatted (should be at least 5 minutes from now)
  const defaultMinDate = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now;
  }, []);

  const effectiveMinDate = minDate || defaultMinDate;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-zinc-900">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Date Input */}
        <div>
          <Input
            type="date"
            value={dateInput}
            onChange={handleDateChange}
            min={minDateStr}
            max={maxDateStr}
            disabled={disabled}
            error={error}
            className="[color-scheme:light]"
          />
        </div>

        {/* Time Input */}
        <div>
          <Input
            type="time"
            value={timeInput}
            onChange={handleTimeChange}
            disabled={disabled}
            className="[color-scheme:light]"
          />
        </div>
      </div>

      {/* Timezone Selector */}
      <div>
        <select
          value={selectedTimezone}
          onChange={(e) => setSelectedTimezone(e.target.value as ArabicTimezone)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 bg-white"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Display formatted date in Arabic */}
      {value && formattedDisplay && (
        <p className="text-sm text-zinc-600 bg-zinc-50 px-3 py-2 rounded-md border border-zinc-200">
          {formattedDisplay}
        </p>
      )}

      {/* Clear Button */}
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="text-sm text-red-600 hover:text-red-700 underline"
        >
          مسح التاريخ
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
