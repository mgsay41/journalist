'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Loading } from '@/components/ui/Loading';
import { gooeyToast } from 'goey-toast';

// Types
interface Settings {
  siteName: string;
  siteTagline: string | null;
  adminEmail: string | null;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  defaultMetaTitle: string | null;
  defaultMetaDescription: string | null;
  siteKeywords: string | null;
  googleAnalyticsId: string | null;
  googleSearchConsole: string | null;
  facebookHandle: string | null;
  twitterHandle: string | null;
  instagramHandle: string | null;
  youtubeHandle: string | null;
  maxUploadSize: number;
  imageQuality: number;
  storageProvider: string;
  defaultArticleStatus: string;
  autoPublishEnabled: boolean;
  defaultCategories: string | null;
  notifyOnPublish: boolean;
  aiModelPreference: string;
  aiResponseLimit: number;
  aiFeaturesEnabled: boolean;
  breakingNewsEnabled: boolean;
  breakingNewsText: string | null;
  breakingNewsUrl: string | null;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  bio: string | null;
  authorTitle: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface SettingsTabsProps {
  initialSettings: Settings;
  initialProfile: UserProfile;
  categories: Category[];
}

// Tab names
type TabName = 'general' | 'profile' | 'seo' | 'media' | 'publishing' | 'ai';

// Constants
const TIMEZONES = [
  { value: 'Asia/Riyadh', label: 'الرياض (السعودية)' },
  { value: 'Asia/Dubai', label: 'دبي (الإمارات)' },
  { value: 'Asia/Kuwait', label: 'الكويت' },
  { value: 'Asia/Bahrain', label: 'البحرين' },
  { value: 'Asia/Qatar', label: 'قطر' },
  { value: 'Asia/Oman', label: 'عُمان' },
  { value: 'Asia/Jerusalem', label: 'القدس' },
  { value: 'Asia/Amman', label: 'عمّان (الأردن)' },
  { value: 'Asia/Beirut', label: 'بيروت (لبنان)' },
  { value: 'Asia/Cairo', label: 'القاهرة (مصر)' },
  { value: 'Africa/Casablanca', label: 'الدار البيضاء (المغرب)' },
  { value: 'Africa/Tunis', label: 'تونس' },
  { value: 'Africa/Algiers', label: 'الجزائر' },
  { value: 'Africa/Tripoli', label: 'طرابلس (ليبيا)' },
  { value: 'Asia/Baghdad', label: 'بغداد (العراق)' },
  { value: 'Asia/Damascus', label: 'دمشق (سوريا)' },
  { value: 'Asia/Sanaa', label: 'صنعاء (اليمن)' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'يوم/شهر/سنة (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'شهر/يوم/سنة (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'سنة-شهر-يوم (2024-12-31)' },
];

const STORAGE_PROVIDERS = [
  { value: 'cloudinary', label: 'Cloudinary' },
  { value: 'vercel-blob', label: 'Vercel Blob Storage' },
];

const AI_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (موصى به)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

const AI_RESPONSE_LIMITS = [
  { value: '256', label: '256 رمز' },
  { value: '512', label: '512 رمز' },
  { value: '1024', label: '1024 رمز' },
  { value: '2048', label: '2048 رمز' },
  { value: '4096', label: '4096 رمز (موصى به)' },
  { value: '8192', label: '8192 رمز' },
];

export function SettingsTabs({ initialSettings, initialProfile, categories }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabName>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const tabs = [
    { id: 'general' as TabName, label: 'عام', icon: '⚙️' },
    { id: 'profile' as TabName, label: 'الملف الشخصي', icon: '👤' },
    { id: 'seo' as TabName, label: 'تحسين محركات البحث', icon: '🔍' },
    { id: 'media' as TabName, label: 'الوسائط', icon: '🖼️' },
    { id: 'publishing' as TabName, label: 'النشر', icon: '📤' },
    { id: 'ai' as TabName, label: 'الذكاء الاصطناعي', icon: '🤖' },
  ];

  const handleSaveSettings = async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل حفظ الإعدادات');
      }

      gooeyToast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
      gooeyToast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل حفظ الملف الشخصي');
      }

      gooeyToast.success('تم حفظ الملف الشخصي بنجاح');
    } catch (error) {
      console.error('Error saving profile:', error);
      gooeyToast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ الملف الشخصي');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('كلمات المرور غير متطابقة');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل تغيير كلمة المرور');
      }

      gooeyToast.success('تم تغيير كلمة المرور بنجاح');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError(error instanceof Error ? error.message : 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateProfile = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="hidden sm:inline ml-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold mb-4">الإعدادات العامة</h2>
              <div className="space-y-4">
                <Input
                  label="اسم الموقع"
                  value={settings.siteName}
                  onChange={(e) => updateSetting('siteName', e.target.value)}
                  helperText="الاسم الذي سيظهر في عنوان الموقع"
                />

                <Textarea
                  label="شعار الموقع"
                  value={settings.siteTagline || ''}
                  onChange={(e) => updateSetting('siteTagline', e.target.value || null)}
                  rows={2}
                  helperText="وصف قصير للموقع"
                />

                <Input
                  label="البريد الإلكتروني للمدير"
                  type="email"
                  value={settings.adminEmail || ''}
                  onChange={(e) => updateSetting('adminEmail', e.target.value || null)}
                  helperText="سيتم استلام الإشعارات على هذا البريد"
                />

                <Select
                  label="المنطقة الزمنية"
                  options={TIMEZONES}
                  value={settings.timezone}
                  onChange={(e) => updateSetting('timezone', e.target.value)}
                  helperText="المنطقة الزمنية الافتراضية للموقع"
                />

                <Select
                  label="تنسيق التاريخ"
                  options={DATE_FORMATS}
                  value={settings.dateFormat}
                  onChange={(e) => updateSetting('dateFormat', e.target.value)}
                />

                <Select
                  label="تنسيق الوقت"
                  options={[
                    { value: '12', label: '12 ساعة (AM/PM)' },
                    { value: '24', label: '24 ساعة' },
                  ]}
                  value={settings.timeFormat}
                  onChange={(e) => updateSetting('timeFormat', e.target.value)}
                />
              </div>
            </div>

            {/* Breaking News Section */}
            <div className="pt-6 border-t">
              <h3 className="text-base font-semibold mb-4">الخبر العاجل</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.breakingNewsEnabled}
                    onChange={(e) => updateSetting('breakingNewsEnabled', e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm font-medium">تفعيل شريط الأخبار العاجلة</span>
                </label>

                {settings.breakingNewsEnabled && (
                  <>
                    <Input
                      label="نص الخبر العاجل"
                      value={settings.breakingNewsText || ''}
                      onChange={(e) => updateSetting('breakingNewsText', e.target.value || null)}
                      placeholder="اكتب نص الخبر العاجل هنا..."
                      helperText="يظهر في شريط أحمر أعلى الموقع"
                    />
                    <Input
                      label="رابط الخبر (اختياري)"
                      type="url"
                      value={settings.breakingNewsUrl || ''}
                      onChange={(e) => updateSetting('breakingNewsUrl', e.target.value || null)}
                      placeholder="https://..."
                      helperText="رابط المقال المتعلق بالخبر العاجل"
                    />
                  </>
                )}

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    variant="primary"
                  >
                    {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Settings Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold mb-4">الملف الشخصي</h2>
              <div className="space-y-4">
                <Input
                  label="الاسم"
                  value={profile.name}
                  onChange={(e) => updateProfile('name', e.target.value)}
                  helperText="اسمك كصاحب الموقع"
                />

                <Input
                  label="البريد الإلكتروني"
                  type="email"
                  value={profile.email}
                  onChange={(e) => updateProfile('email', e.target.value)}
                  helperText="البريد الإلكتروني لتسجيل الدخول"
                />

                <Input
                  label="رابط الصورة الشخصية"
                  type="url"
                  value={profile.image || ''}
                  onChange={(e) => updateProfile('image', e.target.value || null)}
                  helperText="رابط صورة الملف الشخصي (اختياري)"
                />

                <Input
                  label="المسمى الوظيفي"
                  value={profile.authorTitle || ''}
                  onChange={(e) => updateProfile('authorTitle', e.target.value || null)}
                  placeholder="مثال: محرر أول، مراسل صحفي..."
                  helperText="يظهر أسفل اسمك في صفحات المقالات"
                />

                <Textarea
                  label="نبذة شخصية"
                  value={profile.bio || ''}
                  onChange={(e) => updateProfile('bio', e.target.value || null)}
                  rows={3}
                  placeholder="اكتب نبذة مختصرة عنك..."
                  helperText="تظهر في نهاية كل مقال (حتى 500 حرف)"
                />

                <Input
                  label="رابط تويتر / X"
                  type="url"
                  value={profile.twitterUrl || ''}
                  onChange={(e) => updateProfile('twitterUrl', e.target.value || null)}
                  placeholder="https://x.com/username"
                />

                <Input
                  label="رابط لينكدإن"
                  type="url"
                  value={profile.linkedinUrl || ''}
                  onChange={(e) => updateProfile('linkedinUrl', e.target.value || null)}
                  placeholder="https://linkedin.com/in/username"
                />

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    variant="primary"
                  >
                    {isSaving ? 'جاري الحفظ...' : 'حفظ الملف الشخصي'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Password Change Section */}
            <div className="pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4">تغيير كلمة المرور</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <Input
                  label="كلمة المرور الحالية"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />

                <Input
                  label="كلمة المرور الجديدة"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  helperText="يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم"
                />

                <Input
                  label="تأكيد كلمة المرور الجديدة"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />

                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800 text-sm">{passwordError}</p>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isSaving || !passwordForm.currentPassword || !passwordForm.newPassword}
                    variant="primary"
                  >
                    {isSaving ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SEO Settings Tab */}
        {activeTab === 'seo' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold mb-4">إعدادات تحسين محركات البحث</h2>
              <div className="space-y-4">
                <Input
                  label="قالب عنوان الصفحة الافتراضي"
                  value={settings.defaultMetaTitle || ''}
                  onChange={(e) => updateSetting('defaultMetaTitle', e.target.value || null)}
                  helperText="قالب عنوان الصفحة للمقالات الجديدة (60 حرف كحد أقصى)"
                />

                <Textarea
                  label="قالب وصف الصفحة الافتراضي"
                  value={settings.defaultMetaDescription || ''}
                  onChange={(e) => updateSetting('defaultMetaDescription', e.target.value || null)}
                  rows={3}
                  helperText="قالب وصف الصفحة للمقالات الجديدة (160 حرف كحد أقصى)"
                />

                <Textarea
                  label="الكلمات المفتاحية للموقع"
                  value={settings.siteKeywords || ''}
                  onChange={(e) => updateSetting('siteKeywords', e.target.value || null)}
                  rows={2}
                  helperText="كلمات مفتاحية افتراضية للموقع (مفصولة بفواصل)"
                />

                <Input
                  label="معرف Google Analytics"
                  value={settings.googleAnalyticsId || ''}
                  onChange={(e) => updateSetting('googleAnalyticsId', e.target.value || null)}
                  helperText="معرف تتبع Google Analytics (مثل: G-XXXXXXXXXX)"
                />

                <Input
                  label="رمز التحقق من Google Search Console"
                  value={settings.googleSearchConsole || ''}
                  onChange={(e) => updateSetting('googleSearchConsole', e.target.value || null)}
                  helperText="رمز التحقق للملكية في Google Search Console"
                />

                <h3 className="text-md font-medium pt-4">وسائل التواصل الاجتماعي</h3>

                <Input
                  label="فيسبوك"
                  value={settings.facebookHandle || ''}
                  onChange={(e) => updateSetting('facebookHandle', e.target.value || null)}
                  helperText="اسم مستخدم فيسبوك أو رابط الصفحة"
                />

                <Input
                  label="تويتر (X)"
                  value={settings.twitterHandle || ''}
                  onChange={(e) => updateSetting('twitterHandle', e.target.value || null)}
                  helperText="اسم مستخدم تويتر (بدون @)"
                />

                <Input
                  label="إنستغرام"
                  value={settings.instagramHandle || ''}
                  onChange={(e) => updateSetting('instagramHandle', e.target.value || null)}
                  helperText="اسم مستخدم إنستغرام"
                />

                <Input
                  label="يوتيوب"
                  value={settings.youtubeHandle || ''}
                  onChange={(e) => updateSetting('youtubeHandle', e.target.value || null)}
                  helperText="اسم مستخدم أو معرف قناة يوتيوب"
                />

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    variant="primary"
                  >
                    {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Media Settings Tab */}
        {activeTab === 'media' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold mb-4">إعدادات الوسائط</h2>
              <div className="space-y-4">
                <Select
                  label="موفر التخزين"
                  options={STORAGE_PROVIDERS}
                  value={settings.storageProvider}
                  onChange={(e) => updateSetting('storageProvider', e.target.value)}
                  helperText="الخدمة المستخدمة لتخزين الصور والملفات"
                />

                <Input
                  label="الحد الأقصى لحجم الملف"
                  type="number"
                  value={settings.maxUploadSize}
                  onChange={(e) => updateSetting('maxUploadSize', parseInt(e.target.value) || 10)}
                  helperText="الحد الأقصى لحجم الملف بالميجابايت (1-100)"
                  min={1}
                  max={100}
                />

                <Input
                  label="جودة الصورة المضغوطة"
                  type="number"
                  value={settings.imageQuality}
                  onChange={(e) => updateSetting('imageQuality', parseInt(e.target.value) || 85)}
                  helperText="جودة الصورة عند الضغط (1-100، 85 موصى به)"
                  min={1}
                  max={100}
                />

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>ملاحظة:</strong> تغيير هذه الإعدادات سيؤثر فقط على الملفات الجديدة التي يتم رفعها.
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    variant="primary"
                  >
                    {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Publishing Settings Tab */}
        {activeTab === 'publishing' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold mb-4">إعدادات النشر</h2>
              <div className="space-y-4">
                <Select
                  label="الحالة الافتراضية للمقالات"
                  options={[
                    { value: 'draft', label: 'مسودة' },
                    { value: 'published', label: 'منشور' },
                  ]}
                  value={settings.defaultArticleStatus}
                  onChange={(e) => updateSetting('defaultArticleStatus', e.target.value)}
                  helperText="الحالة الافتراضية عند إنشاء مقال جديد"
                />

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoPublishEnabled}
                      onChange={(e) => updateSetting('autoPublishEnabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">تمكين النشر التلقائي</span>
                  </label>
                  <p className="text-sm text-muted-foreground pr-6">
                    نشر المقالات المجدولة تلقائياً في الوقت المحدد
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyOnPublish}
                      onChange={(e) => updateSetting('notifyOnPublish', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">إشعاري عند نشر مقال</span>
                  </label>
                  <p className="text-sm text-muted-foreground pr-6">
                    إرسال إشعار عند نشر مقال جديد
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    variant="primary"
                  >
                    {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Settings Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold mb-4">إعدادات الذكاء الاصطناعي</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.aiFeaturesEnabled}
                      onChange={(e) => updateSetting('aiFeaturesEnabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">تمكين ميزات الذكاء الاصطناعي</span>
                  </label>
                  <p className="text-sm text-muted-foreground pr-6">
                    تفعيل أو تعطيل جميع ميزات AI في الموقع
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>ملاحظة:</strong> مفتاح Gemini API يجب تعيينه في متغيرات البيئة (GEMINI_API_KEY) لضمان الأمان.
                  </p>
                </div>

                <Select
                  label="نموذج الذكاء الاصطناعي المفضل"
                  options={AI_MODELS}
                  value={settings.aiModelPreference}
                  onChange={(e) => updateSetting('aiModelPreference', e.target.value)}
                  helperText="اختر النموذج المستخدم لميزات الذكاء الاصطناعي"
                />

                <Select
                  label="الحد الأقصى للرد"
                  options={AI_RESPONSE_LIMITS}
                  value={settings.aiResponseLimit.toString()}
                  onChange={(e) => updateSetting('aiResponseLimit', parseInt(e.target.value) || 4096)}
                  helperText="الحد الأقصى لعدد الرموز في الردود"
                />

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>تلميح:</strong> يُنصح باستخدام نموذج Gemini 3 Flash للحصول على أفضل توازن بين الأداء والتكلفة.
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    variant="primary"
                  >
                    {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
