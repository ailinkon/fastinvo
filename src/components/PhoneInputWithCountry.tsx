import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { COUNTRY_CODES, CountryCode } from '../utils/countryCodes';

interface PhoneInputWithCountryProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export default function PhoneInputWithCountry({
  value = '',
  onChange,
  id,
  required = false,
  placeholder = 'Phone number',
  className = '',
  error = false,
}: PhoneInputWithCountryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Split phone number into country dialCode and remaining digits
  const { selectedCountry, restNumber } = useMemo(() => {
    let bestMatch: CountryCode = COUNTRY_CODES[0]; // Default is Bangladesh (+880)
    let bestLen = 0;
    
    const cleanVal = value.trim();
    
    // Find the longest matching dial code prefix
    for (const country of COUNTRY_CODES) {
      if (cleanVal.startsWith(country.dialCode)) {
        if (country.dialCode.length > bestLen) {
          bestMatch = country;
          bestLen = country.dialCode.length;
        }
      }
    }

    const rest = bestLen > 0 ? cleanVal.slice(bestLen).trim() : cleanVal;
    return { selectedCountry: bestMatch, restNumber: rest };
  }, [value]);

  // Filter countries by search query (name or dial code)
  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.toLowerCase().includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleCountrySelect = (country: CountryCode) => {
    setIsOpen(false);
    setSearchQuery('');
    onChange(`${country.dialCode}${restNumber}`);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    // Normalize numeric input (strip non-digits and leading zeros/special chars if they just typed digits)
    const cleanedDigits = inputVal.replace(/[^\d\s\-()]/g, '');
    onChange(`${selectedCountry.dialCode}${cleanedDigits}`);
  };

  return (
    <div className={`relative flex items-center rounded border transition-all ${
      error
        ? 'border-red-300 bg-red-50/10 focus-within:ring-1 focus-within:ring-red-500 focus-within:border-red-500'
        : 'border-slate-200 dark:border-slate-700 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500'
    } bg-white dark:bg-slate-900 ${className}`} ref={dropdownRef}>
      {/* Country Selector Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 h-full border-r border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-l text-slate-700 dark:text-slate-300 min-h-[38px] select-none"
        title={`${selectedCountry.name} (${selectedCountry.dialCode})`}
      >
        <span className="text-base leading-none select-none" role="img" aria-label={selectedCountry.name}>
          {selectedCountry.flag}
        </span>
        <span className="text-xs font-mono font-semibold tracking-tight">
          {selectedCountry.dialCode}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
      </button>

      {/* Actual Phone Input Field */}
      <input
        type="text"
        id={id}
        required={required}
        value={restNumber}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        className="flex-1 px-3 py-1.5 text-sm bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 w-full"
      />

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 max-h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 animate-fadeIn flex flex-col">
          {/* Search Bar */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/40 shrink-0">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country or dial code..."
              className="w-full text-xs bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 py-1"
            />
          </div>

          {/* Countries list */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100/60 dark:divide-slate-800/60 max-h-56">
            {filteredCountries.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic p-3 text-center">
                No matching countries found
              </p>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = selectedCountry.iso === country.iso;
                return (
                  <button
                    key={`${country.iso}-${country.dialCode}`}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      isSelected
                        ? 'bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-base select-none leading-none shrink-0">
                        {country.flag}
                      </span>
                      <span className="truncate">{country.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 font-semibold pl-2 shrink-0">
                      {country.dialCode}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
