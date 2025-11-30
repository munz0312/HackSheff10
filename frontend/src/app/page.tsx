"use client"

import { useState, useEffect } from "react"
import VoyageSelector from "@/components/VoyageSelector"
import MissionInput from "@/components/MissionInput"
import ShopGrid from "@/components/ShopGrid"
import CommandCenter from "@/components/CommandCentre"
import { Rocket, Cpu, MessageSquare, ShoppingBag } from "lucide-react"

interface ShopItem {
  name: string
  description: string
  price: number
  image_url?: string
  category: string
}

interface SystemInfo {
  architecture: string
  system: string
  processor?: string
  python_version?: string
}

export default function Home() {
  const [selectedVoyage, setSelectedVoyage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'inventory' | 'chat'>('inventory')
  
  const [missionDescription, setMissionDescription] = useState("")
  const [shopItems, setShopItems] = useState<ShopItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)

  useEffect(() => {
    fetchSystemInfo()
  }, [])

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/architecture`)
      if (response.ok) {
        const data = await response.json()
        setSystemInfo(data)
      }
    } catch (error) {
      console.error("Failed to fetch system info:", error)
    }
  }

  const generateInventory = async () => {
    if (!selectedVoyage || !missionDescription.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/generate-inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voyage_type: selectedVoyage,
          mission_description: missionDescription,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate inventory')
      }

      const items = await response.json()
      setShopItems(items)
    } catch (error) {
      console.error('Error generating inventory:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Voyage AI Outfitter</h1>
            </div>

            {systemInfo && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
                <Cpu className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700 font-medium">
                  {systemInfo.architecture}
                </span>
                <span className="text-green-600 text-xs font-medium">
                  Powered by Arm64
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 1. Voyage Selection (Always Visible) */}
        <section className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Start Your Adventure
            </h2>
            <p className="text-xl text-gray-600">
              Step 1: Select the type of world you are exploring
            </p>
          </div>
          <VoyageSelector
            selectedVoyage={selectedVoyage}
            onVoyageSelect={(id) => {
              setSelectedVoyage(id);
              setShopItems([]); // Clear previous inventory if switching worlds
            }}
          />
        </section>

        {/* 2. Action Area (Only visible after selection) */}
        {selectedVoyage && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Tab Switcher */}
            <div className="flex justify-center mb-12">
              <div className="bg-white p-1.5 rounded-full shadow-lg border border-gray-200 flex gap-2">
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                    activeTab === 'inventory'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Inventory Generator
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                    activeTab === 'chat'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Multi-Agent Command Center
                </button>
              </div>
            </div>

            {/* Content Area */}
            {activeTab === 'inventory' ? (
              <div className="space-y-16 max-w-4xl mx-auto">
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                  <MissionInput
                    missionDescription={missionDescription}
                    onMissionChange={setMissionDescription}
                    onGenerateInventory={generateInventory}
                    isLoading={isLoading}
                    disabled={isLoading}
                  />
                </section>

                {(shopItems.length > 0 || isLoading) && (
                  <section>
                    <ShopGrid
                      items={shopItems}
                      isLoading={isLoading}
                    />
                  </section>
                )}
              </div>
            ) : (
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Mission Command Center</h3>
                  <p className="text-gray-600">Collaborate with AI agents to plan your {selectedVoyage} mission</p>
                </div>
                {/* We use the voyage type as a key to force the chat to reset if the user changes worlds */}
                <CommandCenter 
                    key={selectedVoyage} 
                    voyageType={selectedVoyage} 
                />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="text-gray-600">
              <p className="font-medium">Voyage AI Outfitter</p>
              <p className="text-sm">Hackathon project • Next.js + FastAPI + Google Gemini</p>
            </div>
            {systemInfo && (
              <div className="text-right text-sm text-gray-500">
                <p>Server Architecture: <span className="font-mono text-gray-700">{systemInfo.architecture}</span></p>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}