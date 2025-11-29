"use client"

import { useState, useEffect } from "react"
import VoyageSelector from "@/components/VoyageSelector"
import MissionInput from "@/components/MissionInput"
import ShopGrid from "@/components/ShopGrid"
import { Rocket, Cpu } from "lucide-react"
import CommandCenter from "@/components/CommandCentre"

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
  const [missionDescription, setMissionDescription] = useState("")
  const [shopItems, setShopItems] = useState<ShopItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [activeTab, setActiveTab] = useState<'inventory' | 'chat'>('inventory');

  // Fetch system architecture info on component mount
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
      // For demo purposes, we can add some fallback items here
      setShopItems([
        {
          name: "Sample Item",
          description: "This is a sample item. Please check your backend connection.",
          price: 100,
          category: "tools"
        }
      ])
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
                <span className="text-gray-500">•</span>
                <span className="text-green-600 text-xs font-medium">
                  Powered by Arm64
                </span>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              activeTab === 'inventory' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Inventory Generator
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              activeTab === 'chat' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Voyage Command Center (Multi-Agent)
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        {activeTab === 'inventory' ? (
            // ... EXISTING INVENTORY CODE ...
            <div className="space-y-16">
                <div className="space-y-16">
                  {/* Step 1: Voyage Selection */}
                  <section>
                    <div className="mb-8">
                      <div className="flex items-center justify-center mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                            1
                          </div>
                          <span className="text-lg font-semibold text-gray-900">Choose Your Voyage Type</span>
                        </div>
                      </div>
                    </div>
                    <VoyageSelector
                      selectedVoyage={selectedVoyage}
                      onVoyageSelect={setSelectedVoyage}
                    />
                  </section>

                  {/* Step 2: Mission Input */}
                  {selectedVoyage && (
                    <section>
                      <div className="mb-8">
                        <div className="flex items-center justify-center mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                              2
                            </div>
                            <span className="text-lg font-semibold text-gray-900">Describe Your Mission</span>
                          </div>
                        </div>
                      </div>
                      <MissionInput
                        missionDescription={missionDescription}
                        onMissionChange={setMissionDescription}
                        onGenerateInventory={generateInventory}
                        isLoading={isLoading}
                        disabled={isLoading}
                      />
                    </section>
                  )}

                  {/* Step 3: Generated Inventory */}
                  {(shopItems.length > 0 || isLoading) && (
                    <section>
                      <div className="mb-8">
                        <div className="flex items-center justify-center mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                              3
                            </div>
                            <span className="text-lg font-semibold text-gray-900">Your Custom Inventory</span>
                          </div>
                        </div>
                      </div>
                      <ShopGrid
                        items={shopItems}
                        isLoading={isLoading}
                      />
                    </section>
                  )}
                </div>
            </div>
        ) : (
            <div className="max-w-4xl mx-auto">
                {!selectedVoyage ? (
                    <div className="text-center py-20">
                        <h3 className="text-xl text-gray-600">Please select a Voyage Type above to initialize the Command Center protocols.</h3>
                    </div>
                ) : (
                    <CommandCenter voyageType={selectedVoyage} />
                )}
            </div>
        )}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Survival Gear Generator
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select your voyage type and describe your mission to generate a custom inventory of survival items powered by artificial intelligence
          </p>
        </div>

      </main>

      {/* Footer */}
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
                <p>System: <span className="font-mono text-gray-700">{systemInfo.system}</span></p>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}