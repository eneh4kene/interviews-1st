"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@interview-me/ui";
import { Search } from "lucide-react";

interface SearchInputProps {
  onSearchChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({ onSearchChange, placeholder = "Search...", className = "" }: SearchInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, onSearchChange]);

  // Restore focus after any re-renders
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      const cursorPosition = inputRef.current.selectionStart;
      inputRef.current.focus();
      if (cursorPosition !== null) {
        inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }
  });

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
