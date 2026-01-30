'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';

/**
 * Admin Login Page
 *
 * Hidden login page for admin authentication.
 * Not linked from public pages for security.
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noAdmin = searchParams.get('no_admin') === 'true';
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.email) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صالح';
    }

    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          remember: formData.remember,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      // Redirect to dashboard on success
      router.push('/admin/dashboard');
      router.refresh();
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'حدث خطأ أثناء تسجيل الدخول',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">
            نظام إدارة المحتوى
          </h1>
          <p className="mt-2 text-sm text-secondary">
            تسجيل الدخول إلى لوحة التحكم
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* No Admin Warning */}
            {noAdmin && (
              <div className="bg-warning/10 border border-warning text-warning-foreground px-4 py-3 rounded-lg text-sm">
                <p className="font-semibold mb-1">لم يتم إعداد النظام بعد</p>
                <p>لا يوجد حساب مسؤول في النظام. يرجى إنشاء حساب مسؤول عبر قاعدة البيانات مباشرة.</p>
                <p className="mt-2 text-xs">راجع ملف <code className="bg-muted px-1 rounded">docs/ADMIN_SETUP.md</code> للتعليمات.</p>
              </div>
            )}

            {/* General Error */}
            {errors.general && (
              <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg text-sm">
                {errors.general}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                البريد الإلكتروني
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                className={errors.email ? 'border-danger' : ''}
                disabled={isLoading}
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-danger">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                كلمة المرور
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={errors.password ? 'border-danger' : ''}
                disabled={isLoading}
                required
              />
              {errors.password && (
                <p className="mt-1 text-sm text-danger">{errors.password}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={formData.remember}
                onChange={handleChange}
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                disabled={isLoading}
              />
              <label htmlFor="remember" className="mr-2 block text-sm text-secondary">
                تذكرني
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              disabled={isLoading}
              className="relative"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="ml-2" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </Button>
          </form>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-primary hover:text-primary-hover transition-colors"
            >
              ← العودة إلى الصفحة الرئيسية
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-secondary">
          <p>نظام إدارة المحتوى للصحفيين</p>
        </div>
      </div>
    </div>
  );
}
