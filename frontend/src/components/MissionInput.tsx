"use client"

import { Send } from "lucide-react"

interface MissionInputProps {
  missionDescription: string
  onMissionChange: (description: string) => void
  onGenerateInventory: () => void
  isLoading: boolean
  disabled: boolean
}

export default function MissionInput({
  missionDescription,
  onMissionChange,
  onGenerateInventory,
  isLoading,
  disabled
}: MissionInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (missionDescription.trim() && !isLoading && !disabled) {
      onGenerateInventory()
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Describe Your Mission</h3>
        <p className="text-gray-600">Tell us about your specific mission or adventure</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="relative">
          <textarea
            value={missionDescription}
            onChange={(e) => onMissionChange(e.target.value)}
            disabled={disabled}
            placeholder="e.g., We are traveling to Mars to rescue a lost research team and need supplies for the harsh Martian environment..."
            className="w-full px-4 py-4 text-gray-900 bg-white border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none transition-colors duration-200 disabled:bg-gray-100 disabled:text-gray-500"
            rows={4}
          />
          <div className="absolute bottom-4 right-4">
            <button
              type="submit"
              disabled={!missionDescription.trim() || isLoading || disabled}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  Generate Inventory
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {missionDescription && (
          <div className="mt-2 text-sm text-gray-500 text-center">
            {missionDescription.length} characters
          </div>
        )}
      </form>

      {/* Example mission prompts for inspiration */}
      <div className="max-w-2xl mx-auto mt-6">
        <p className="text-sm text-gray-500 text-center mb-3">Need inspiration? Try these examples:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => onMissionChange("We are exploring an ancient alien ruin on a distant moon and need archaeological tools")}
            disabled={disabled}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
          >
            Ancient Alien Ruins
          </button>
          <button
            onClick={() => onMissionChange("Sailing through the Bermuda Triangle in search of lost pirate treasure")}
            disabled={disabled}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
          >
            Bermuda Triangle
          </button>
          <button
            onClick={() => onMissionChange("Establishing a colony in the Amazon rainforest after a climate catastrophe")}
            disabled={disabled}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
          >
            Rainforest Colony
          </button>
          <button
            onClick={() => onMissionChange("Infiltrating a corporate megatower to expose corruption in a cyberpunk city")}
            disabled={disabled}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
          >
            Corporate Tower
          </button>
        </div>
      </div>
    </div>
  )
}