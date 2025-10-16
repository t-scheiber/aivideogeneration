'use client'

import { useSession, signOut } from 'next-auth/react'
import VideoGenerator from '@/components/VideoGenerator'

export default function Home() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header with user info */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Generate Videos with AI
            </h1>
            <p className="text-gray-300 text-lg">
              Create stunning AI-generated videos with advanced control
            </p>
          </div>
          
          {session && (
            <div className="flex items-center space-x-4 bg-gray-800/50 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {session.user?.name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{session.user?.name}</p>
                  <p className="text-xs text-gray-400">{session.user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 text-sm px-4 py-2 rounded-lg border border-red-600/30 hover:border-red-600/50 transition-all duration-200 font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
        
        {/* Main content card */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl">
          <div className="p-8">
            <VideoGenerator />
          </div>
        </div>
      </div>
    </div>
  )
}
