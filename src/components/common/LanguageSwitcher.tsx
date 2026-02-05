"use client";

import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';

const SUPPORTED_LOCALES = ['en', 'sw', 'sheng'];

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  
  // Extract locale from pathname (e.g., /en/dashboard -> 'en')
  // If no locale in path or unsupported, default to 'en'
  const pathSegments = pathname.split('/').filter(Boolean);
  const currentLocale = SUPPORTED_LOCALES.includes(pathSegments[0]) 
    ? pathSegments[0] 
    : 'en';

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    
    // If current path has a locale prefix, replace it
    if (SUPPORTED_LOCALES.includes(pathSegments[0])) {
      pathSegments[0] = newLocale;
    } else {
      // If no locale prefix, add one at the beginning
      pathSegments.unshift(newLocale);
    }
    
    const newPath = '/' + pathSegments.join('/');
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

