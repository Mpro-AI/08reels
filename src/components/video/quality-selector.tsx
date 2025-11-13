'use client';

import { QualityOption } from "@/lib/types";

interface QualitySelectorProps {
  qualities: QualityOption[];
  currentUrl: string;
  onQualityChange: (newUrl: string) => void;
}

export function QualitySelector({
  qualities,
  currentUrl,
  onQualityChange,
}: QualitySelectorProps) {

  // 如果沒有額外的畫質選項，則不渲染此組件
  if (!qualities || qualities.length <= 1) {
    return null;
  }

  return (
    <select
      value={currentUrl}
      onChange={(e) => onQualityChange(e.target.value)}
      className="bg-transparent text-white text-xs md:text-sm border border-white/20 rounded px-1 md:px-2 py-1 appearance-none"
      aria-label="選擇影片畫質"
    >
      {qualities.map((q) => (
        <option key={q.url} value={q.url} className="text-black">
          {q.label}
        </option>
      ))}
    </select>
  );
}
