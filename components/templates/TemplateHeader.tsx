"use client";

import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';

interface TemplateHeaderProps {
  isLoading: boolean;
  onCreateTemplate: () => void;
}

export default function TemplateHeader({ isLoading, onCreateTemplate }: TemplateHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Message Templates
        </h1>
        <p className="text-zinc-400 mt-2">Create and manage your message templates</p>
      </div>
      <button
        onClick={onCreateTemplate}
        className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-5 py-2 h-12 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
        disabled={isLoading}
      >
        <Plus className="h-5 w-5" />
        Add Template
      </button>
    </div>
  );
}