"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    
    // Replace the current locale in the pathname with the new one
    // e.g. /en/dashboard -> /sw/dashboard
    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPath = segments.join('/');

    router.push(newPath);
  };

  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm">
      <Globe className="h-4 w-4 text-gray-500" />
      <select 
        value={currentLocale} 
        onChange={handleLanguageChange}
        className="bg-transparent border-none focus:ring-0 text-gray-700 cursor-pointer font-medium"
      >
        <option value="en">English</option>
        <option value="sw">Kiswahili</option>
        <option value="sheng">Sheng</option>
      </select>
    </div>
  );
}
