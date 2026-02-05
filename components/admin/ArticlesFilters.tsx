'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DateRangePicker, type DateRange } from '@/components/admin/DateRangePicker';
import { Button } from '@/components/ui/Button';

export interface ArticlesFiltersProps {
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
}

export function ArticlesFilters({ categories, tags }: ArticlesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [tagId, setTagId] = useState(searchParams.get('tagId') || '');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: searchParams.get('dateFrom') || undefined,
    to: searchParams.get('dateTo') || undefined,
  });

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams();

    // Add all non-empty values
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '') {
        params.set(key, value);
      }
    });

    // Reset to page 1 when filters change
    if (updates.page === undefined) {
      params.set('page', '1');
    }

    const queryString = params.toString();
    router.push(`/admin/articles${queryString ? `?${queryString}` : ''}`);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);

    startTransition(() => {
      updateFilters({
        search,
        status,
        categoryId,
        tagId,
        dateFrom: range.from || '',
        dateTo: range.to || '',
      });
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(() => {
      updateFilters({
        search,
        status,
        categoryId,
        tagId,
        dateFrom: dateRange.from || '',
        dateTo: dateRange.to || '',
      });
    });
  };

  const handleClear = () => {
    setSearch('');
    setStatus('');
    setCategoryId('');
    setTagId('');
    setDateRange({});
    router.push('/admin/articles');
  };

  const hasFilters = search || status || categoryId || tagId || dateRange.from || dateRange.to;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Row - Search and Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium mb-1">البحث</label>
            <Input
              id="search"
              type="search"
              placeholder="البحث في المقالات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-1">الحالة</label>
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: '', label: 'جميع الحالات' },
                { value: 'draft', label: 'مسودة' },
                { value: 'published', label: 'منشورة' },
                { value: 'scheduled', label: 'مجدولة' },
                { value: 'archived', label: 'مؤرشفة' },
              ]}
            />
          </div>

          {/* Category Filter */}
          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium mb-1">التصنيف</label>
            <Select
              id="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
                { value: '', label: 'جميع التصنيفات' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name })),
              ]}
            />
          </div>
        </div>

        {/* Second Row - Tag, Date Range, and Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Tag Filter */}
          <div>
            <label htmlFor="tagId" className="block text-sm font-medium mb-1">الوسم</label>
            <Select
              id="tagId"
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
              options={[
                { value: '', label: 'جميع الوسوم' },
                ...tags.map(tag => ({ value: tag.id, label: tag.name })),
              ]}
            />
          </div>

          {/* Date Range Picker */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">النطاق الزمني</label>
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder="كل الوقت"
              align="left"
            />
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <Button
              type="submit"
              variant="secondary"
              className="flex-1"
              disabled={isPending}
            >
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              بحث
            </Button>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClear}
                className="px-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
