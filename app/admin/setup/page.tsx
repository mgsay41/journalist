'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';

/**
 * First-Time Admin Setup Page
 *
 * This page is only shown when no admin users exist in the database.
 * Once the first admin is created, this page becomes inaccessible.
 */
export default function SetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAlreadySetup, setIsAlreadySetup] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [success, setSuccess] = useState(false);

  // Check if setup is already complete
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await fetch('/api/auth/check-setup');
        const data = await response.json();

        if (data.hasAdmin) {
          setIsAlreadySetup(true);
          // Redirect to login after a short delay
          setTimeout(() => {
            router.push('/admin/login');
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to check setup status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSetup();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'الاسم مطلوب';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'الاسم يجب أن يكون حرفين على الأقل';
    }

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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'تأكيد كلمة المرور مطلوب';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء الحساب');
      }

      setSuccess(true);

      // Redirect to login after success
      setTimeout(() => {
        router.push('/admin/login');
      }, 2000);
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الحساب',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking setup status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-secondary">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  // Show redirect message if already setup
  if (isAlreadySetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="text-center">
          <div className="bg-card rounded-lg shadow-lg p-8 border border-border max-w-md">
            <div className="text-success mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              تم الإعداد بالفعل
            </h2>
            <p className="text-secondary mb-4">
              تم إنشاء حساب المسؤول مسبقاً. جاري تحويلك إلى صفحة تسجيل الدخول...
            </p>
            <Spinner size="sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mb-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            الإعداد الأولي
          </h1>
          <p className="mt-2 text-sm text-secondary">
            قم بإنشاء حساب المسؤول للنظام
          </p>
          <p className="mt-1 text-xs text-secondary/70">
            هذه الصفحة ستظهر مرة واحدة فقط
          </p>
        </div>

        {/* Setup Form */}
        <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
          {success ? (
            <div className="text-center py-8">
              <div className="text-success mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                تم الإنشاء بنجاح!
              </h2>
              <p className="text-secondary mb-4">
                تم إنشاء حساب المسؤول بنجاح. جاري تحويلك إلى صفحة تسجيل الدخول...
              </p>
              <Spinner size="sm" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* General Error */}
              {errors.general && (
                <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg text-sm">
                  {errors.general}
                </div>
              )}

              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  الاسم الكامل
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="أدخل اسمك الكامل"
                  className={errors.name ? 'border-danger' : ''}
                  disabled={isSubmitting}
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-danger">{errors.name}</p>
                )}
              </div>

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
                  disabled={isSubmitting}
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
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={errors.password ? 'border-danger' : ''}
                  disabled={isSubmitting}
                  required
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-danger">{errors.password}</p>
                )}
                <p className="mt-1 text-xs text-secondary/60">
                  يجب أن تكون 6 أحرف على الأقل
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                  تأكيد كلمة المرور
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={errors.confirmPassword ? 'border-danger' : ''}
                  disabled={isSubmitting}
                  required
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-danger">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                disabled={isSubmitting}
                className="relative"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="ml-2" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    إنشاء حساب المسؤول
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Security Notice */}
          {!success && (
            <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-primary mt-0.5 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-secondary">
                  <p className="font-medium text-foreground mb-1">ملاحظة أمنية</p>
                  <p>هذه الصفحة ستظهر مرة واحدة فقط. بعد إنشاء الحساب، لن تتمكن من الوصول إليها مرة أخرى. احفظ بياناتك في مكان آمن.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-secondary">
          <p>نظام إدارة المحتوى للصحفيين</p>
        </div>
      </div>
    </div>
  );
}
