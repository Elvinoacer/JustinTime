"use client";

import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
  { code: 'sheng', name: 'Sheng', flag: '🇰🇪' },
];

const LANGUAGE_STORAGE_KEY = 'justintime-language';

export default function LanguageSwitcher() {
  const [currentLocale, setCurrentLocale] = useState('en');
  const [mounted, setMounted] = useState(false);

  // Load saved language preference on mount
  useEffect(() => {
    setMounted(true);
    const savedLocale = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLocale && SUPPORTED_LOCALES.some(l => l.code === savedLocale)) {
      setCurrentLocale(savedLocale);
    }
  }, []);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    setCurrentLocale(newLocale);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
    
    // Dispatch a custom event for components that need to react to language changes
    window.dispatchEvent(new CustomEvent('languageChange', { detail: newLocale }));
    
    // Show a toast notification (optional - you can remove this if you don't have toast)
    // For now, we'll just log it - actual translations would be implemented separately
    console.log(`Language changed to: ${newLocale}`);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm">
        <Globe className="h-4 w-4 text-gray-500" />
        <div className="w-20 h-5 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const currentLang = SUPPORTED_LOCALES.find(l => l.code === currentLocale);

  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-100 transition-colors">
      <span className="text-base" aria-hidden="true">{currentLang?.flag}</span>
      <select 
        value={currentLocale} 
        onChange={handleLanguageChange}
        className="bg-transparent border-none focus:ring-0 text-gray-700 cursor-pointer font-medium pr-6"
        aria-label="Select language"
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale.code} value={locale.code}>
            {locale.flag} {locale.name}
          </option>
        ))}
      </select>
    </div>
  );
}

