"use client"

import { Rocket, Compass, TreePine, Cpu, Globe, Plane } from "lucide-react"

interface VoyageType {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
}

const voyageTypes: VoyageType[] = [
  {
    id: "space",
    name: "Space Exploration",
    description: "Journey through the cosmos and explore distant planets",
    icon: <Rocket className="w-8 h-8" />,
    color: "from-purple-500 to-blue-600"
  },
  {
    id: "pirate",
    name: "Pirate Adventure",
    description: "Sail the high seas in search of treasure and glory",
    icon: <Compass className="w-8 h-8" />,
    color: "from-blue-500 to-teal-600"
  },
  {
    id: "jungle",
    name: "Jungle Expedition",
    description: "Navigate through dense jungles and ancient ruins",
    icon: <TreePine className="w-8 h-8" />,
    color: "from-green-500 to-emerald-600"
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Mission",
    description: "Navigate neon-lit cities and hack the system",
    icon: <Cpu className="w-8 h-8" />,
    color: "from-pink-500 to-purple-600"
  },
  {
    id: "steampunk",
    name: "Steampunk Quest",
    description: "Journey through Victorian-era mechanical marvels",
    icon: <Globe className="w-8 h-8" />,
    color: "from-amber-500 to-orange-600"
  },
  {
    id: "post-apocalyptic",
    name: "Wasteland Survival",
    description: "Navigate through ruins of the old world",
    icon: <Plane className="w-8 h-8" />,
    color: "from-gray-500 to-red-600"
  }
]

interface VoyageSelectorProps {
  selectedVoyage: string | null
  onVoyageSelect: (voyageType: string) => void
}

export default function VoyageSelector({ selectedVoyage, onVoyageSelect }: VoyageSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Voyage</h2>
        <p className="text-lg text-gray-600">Select the type of adventure you're embarking on</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {voyageTypes.map((voyage) => (
          <div
            key={voyage.id}
            onClick={() => onVoyageSelect(voyage.id)}
            className={`relative cursor-pointer rounded-xl p-6 transition-all duration-300 hover:scale-105 ${
              selectedVoyage === voyage.id
                ? "ring-4 ring-blue-500 ring-offset-2"
                : ""
            }`}
          >
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${voyage.color} opacity-10`}></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${voyage.color} text-white`}>
                  {voyage.icon}
                </div>
                {selectedVoyage === voyage.id && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{voyage.name}</h3>
              <p className="text-gray-600 text-sm">{voyage.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}