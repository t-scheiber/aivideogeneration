'use client'

// Better Auth doesn't require a provider wrapper
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
