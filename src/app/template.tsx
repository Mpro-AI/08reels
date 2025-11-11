'use client';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in w-full h-full">
      {children}
    </div>
  )
}
