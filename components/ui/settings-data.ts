export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  region?: string;
}

export const POPULAR_CURRENCIES: CurrencyOption[] = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", region: "Nigeria" },
  { code: "USD", name: "US Dollar", symbol: "$", region: "United States" },
  { code: "GBP", name: "British Pound", symbol: "£", region: "United Kingdom" },
  { code: "EUR", name: "Euro", symbol: "€", region: "European Union" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", region: "Ghana" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", region: "Kenya" },
  { code: "ZAR", name: "South African Rand", symbol: "R", region: "South Africa" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", region: "United Arab Emirates" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", region: "Saudi Arabia" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", region: "Canada" },
  { code: "AUD", name: "Australian Dollar", symbol: "AU$", region: "Australia" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", region: "Egypt" },
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw", region: "Rwanda" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", region: "Tanzania" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", region: "Uganda" },
  { code: "XOF", name: "West African CFA", symbol: "CFA", region: "West Africa" },
  { code: "XAF", name: "Central African CFA", symbol: "FCFA", region: "Central Africa" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", region: "China" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", region: "Japan" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", region: "India" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", region: "Switzerland" },
  { code: "QAR", name: "Qatari Riyal", symbol: "QR", region: "Qatar" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD", region: "Kuwait" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", region: "Brazil" },
];

export interface LocaleOption {
  code: string;
  name: string;
  nativeName?: string;
  region: string;
}

export const POPULAR_LOCALES: LocaleOption[] = [
  { code: "en-NG", name: "English (Nigeria)", nativeName: "English", region: "Nigeria" },
  { code: "en-US", name: "English (United States)", nativeName: "English", region: "United States" },
  { code: "en-GB", name: "English (United Kingdom)", nativeName: "English", region: "United Kingdom" },
  { code: "en", name: "English (Standard / Default)", nativeName: "English", region: "International" },
  { code: "fr-FR", name: "French (France)", nativeName: "Français", region: "France" },
  { code: "fr-SN", name: "French (Senegal)", nativeName: "Français", region: "West Africa" },
  { code: "fr", name: "French (Standard)", nativeName: "Français", region: "International" },
  { code: "ar-SA", name: "Arabic (Saudi Arabia)", nativeName: "العربية", region: "Middle East" },
  { code: "ar-AE", name: "Arabic (United Arab Emirates)", nativeName: "العربية", region: "Middle East" },
  { code: "ar-EG", name: "Arabic (Egypt)", nativeName: "العربية", region: "North Africa" },
  { code: "es-ES", name: "Spanish (Spain)", nativeName: "Español", region: "Spain" },
  { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português", region: "Brazil" },
  { code: "de-DE", name: "German (Germany)", nativeName: "Deutsch", region: "Germany" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文", region: "China" },
];

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  region: string;
}

export const POPULAR_TIMEZONES: TimezoneOption[] = [
  { value: "Africa/Lagos", label: "Lagos, Abuja (WAT)", offset: "UTC+01:00", region: "West Africa" },
  { value: "Africa/Accra", label: "Accra (GMT)", offset: "UTC+00:00", region: "West Africa" },
  { value: "Africa/Nairobi", label: "Nairobi (EAT)", offset: "UTC+03:00", region: "East Africa" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)", offset: "UTC+02:00", region: "Southern Africa" },
  { value: "Africa/Cairo", label: "Cairo (EET)", offset: "UTC+02:00", region: "North Africa" },
  { value: "Africa/Casablanca", label: "Casablanca (WET)", offset: "UTC+01:00", region: "North Africa" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)", offset: "UTC+00:00", region: "Universal" },
  { value: "Asia/Dubai", label: "Dubai, Abu Dhabi (GST)", offset: "UTC+04:00", region: "Middle East" },
  { value: "Asia/Riyadh", label: "Riyadh (AST)", offset: "UTC+03:00", region: "Middle East" },
  { value: "Asia/Qatar", label: "Doha (AST)", offset: "UTC+03:00", region: "Middle East" },
  { value: "Europe/London", label: "London (GMT/BST)", offset: "UTC+00:00", region: "Europe" },
  { value: "Europe/Paris", label: "Paris, Brussels (CET)", offset: "UTC+01:00", region: "Europe" },
  { value: "Europe/Berlin", label: "Berlin, Frankfurt (CET)", offset: "UTC+01:00", region: "Europe" },
  { value: "America/New_York", label: "New York (EST/EDT)", offset: "UTC-05:00", region: "Americas" },
  { value: "America/Chicago", label: "Chicago, Houston (CST/CDT)", offset: "UTC-06:00", region: "Americas" },
  { value: "America/Los_Angeles", label: "Los Angeles, SF (PST/PDT)", offset: "UTC-08:00", region: "Americas" },
  { value: "America/Toronto", label: "Toronto (EST/EDT)", offset: "UTC-05:00", region: "Americas" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", offset: "UTC+08:00", region: "Asia" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)", offset: "UTC+08:00", region: "Asia" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", offset: "UTC+09:00", region: "Asia" },
  { value: "Asia/Kolkata", label: "Mumbai, Delhi (IST)", offset: "UTC+05:30", region: "Asia" },
  { value: "Australia/Sydney", label: "Sydney (AEST)", offset: "UTC+10:00", region: "Australia" },
];
