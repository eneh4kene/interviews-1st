"use client";

import { useState, useRef, useCallback, memo } from "react";
import { Input } from "@interview-me/ui";
import { Search } from "lucide-react";

interface SearchInputProps {
  onSearchChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchInput = memo(function SearchInput({ onSearchChange, placeholder = "Search...", className = "" }: SearchInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSearchChangeRef = useRef(onSearchChange);

  // Keep the callback ref up to date
  onSearchChangeRef.current = onSearchChange;

  // Handle input change with debouncing
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      onSearchChangeRef.current(value);
    }, 300);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        className="pl-10"
      />
    </div>
  );
});

export default SearchInput;
