"use client"

import { ShoppingCart, Star, Wrench, Heart, Radio, Activity } from "lucide-react"

interface ShopItem {
  name: string
  description: string
  price: number
  image_url?: string
  category: string
}

interface ShopGridProps {
  items: ShopItem[]
  isLoading: boolean
}

const categoryIcons = {
  tools: <Wrench className="w-4 h-4" />,
  safety: <Heart className="w-4 h-4" />,
  navigation: <Radio className="w-4 h-4" />,
  communication: <Radio className="w-4 h-4" />,
  medical: <Activity className="w-4 h-4" />
}

const categoryColors = {
  tools: "bg-blue-100 text-blue-800",
  safety: "bg-red-100 text-red-800",
  navigation: "bg-green-100 text-green-800",
  communication: "bg-purple-100 text-purple-800",
  medical: "bg-emerald-100 text-emerald-800"
}

export default function ShopGrid({ items, isLoading }: ShopGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Generating Your Inventory</h3>
          <p className="text-gray-600">AI is creating custom survival items for your mission...</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-xl h-48 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Items Yet</h3>
        <p className="text-gray-600">Select a voyage type and describe your mission to generate custom survival items</p>
      </div>
    )
  }

  const totalPrice = items.reduce((sum, item) => sum + item.price, 0)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Custom Inventory</h3>
        <p className="text-gray-600">AI-generated survival items tailored for your mission</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden group"
          >
            {/* Item Image */}
            <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    // Fallback if image fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              ) : null}

              {/* Fallback placeholder */}
              <div className={`w-full h-full flex items-center justify-center ${item.image_url ? 'hidden' : ''}`}>
                <div className="text-center">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Item Image</p>
                </div>
              </div>

              {/* Category Badge */}
              <div className="absolute top-3 left-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${categoryColors[item.category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'}`}>
                  {categoryIcons[item.category as keyof typeof categoryIcons] || <Wrench className="w-4 h-4" />}
                  {item.category}
                </span>
              </div>

              {/* Rating Stars */}
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
                <span className="text-xs font-medium text-gray-700 ml-1">4.5</span>
              </div>
            </div>

            {/* Item Details */}
            <div className="p-5">
              <h4 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {item.name}
              </h4>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {item.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">{item.price}</span>
                  <span className="text-sm text-gray-500">credits</span>
                </div>

                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="text-sm font-medium">Add</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total Price Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Total Package Value</h4>
            <p className="text-sm text-gray-600">Complete survival kit for your mission</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{totalPrice.toLocaleString()}</div>
            <div className="text-sm text-gray-500">credits</div>
          </div>
        </div>
      </div>
    </div>
  )
}