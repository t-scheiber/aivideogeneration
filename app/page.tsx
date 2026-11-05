'use client'

import { useSession, signOut } from '@/lib/auth-client'
import VideoGenerator from '@/components/VideoGenerator'

export default function Home() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header with user info */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="motion-hero-lead text-4xl font-bold text-white mb-2">
              Generate Videos with AI
            </h1>
            <p className="motion-hero-sub text-gray-300 text-lg">
              Create stunning AI-generated videos with advanced control
            </p>
          </div>
          
          {session && (
            <div className="flex min-w-0 items-center justify-between gap-4 self-stretch bg-gray-800/50 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-700 sm:self-auto">
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-10 h-10 shrink-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {session.user?.name?.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{session.user?.name}</p>
                  <p className="truncate text-xs text-gray-400">{session.user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="shrink-0 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 text-sm px-4 py-2 rounded-lg border border-red-600/30 hover:border-red-600/50 transition-[color,background-color,border-color,scale] duration-(--motion-fast) ease-out active:scale-(--press-scale) font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
        
        {/* Main content card */}
        <div className="motion-hero-card bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl">
          <div className="p-8">
            <VideoGenerator />
          </div>
        </div>
      </div>
    </div>
  )
}
