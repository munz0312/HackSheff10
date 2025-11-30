"use client"

import { useState, useEffect, useRef } from "react"
import { Send, User, Bot, ShieldAlert, Zap, Volume2, AlertTriangle } from "lucide-react"

interface Message {
  type: "human" | "ai" | "system" | "role_status"
  role?: string
  content: string
  timestamp: number
  data?: RoleStatus
}

interface RoleStatus {
    captain: boolean
    scavenger: boolean
    mechanic: boolean
}


interface QueueItem extends Message {}

interface ShopItem {
  name: string
  description: string
  price: number
  category: string
}

interface CommandCenterProps {
  voyageType: string
  inventory: ShopItem[]
}

const VOICES = {
  NAVIGATOR: "21m00Tcm4TlvDq8ikWAM", // Rachel
  WATCHMAN: "ErXwobaYiN019PkySvjV",    // Antoni
}

export default function CommandCenter({ voyageType, inventory }: CommandCenterProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  
  // Visible Messages (What the user sees)
  const [messages, setMessages] = useState<Message[]>([])
  
  // Hidden Queue (AI messages waiting to be spoken)
  const [messageQueue, setMessageQueue] = useState<QueueItem[]>([])
  
  const [inputValue, setInputValue] = useState("")
  const [role, setRole] = useState<"Captain" | "Scavenger" | "Mechanic" | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false) // Lock for the audio processor

  const [clientId, setClientId] = useState<string | null>(null)
  const [isCaptainOccupied, setIsCaptainOccupied] = useState(false)
  const [isScavengerOccupied, setIsScavengerOccupied] = useState(false)
  const [isMechanicOccupied, setIsMechanicOccupied] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    // If we are already playing audio OR there is nothing in the queue, stop.
    if (isProcessing || messageQueue.length === 0) return

    const processNextMessage = async () => {
      setIsProcessing(true)
      const nextMsg = messageQueue[0] // Peek at the next message

      try {
        const voiceId = nextMsg.role === "Navigator" ? VOICES.NAVIGATOR : VOICES.WATCHMAN
        
        // Fetch Audio (Text is still hidden)
        const response = await fetch('/api/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: nextMsg.content, voiceId }),
        })

        if (response.ok) {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)

          // Audio is ready. Reveal text and play audio.
          setMessages((prev) => [...prev, nextMsg])
          setMessageQueue((prev) => prev.slice(1))
          
          await audio.play()

          // When audio finishes, unlock processor and remove item from queue
          audio.onended = () => {
            setIsProcessing(false)
            URL.revokeObjectURL(url)
          }
        } else {
          // Fallback: If audio fails, just show the text and move on
          console.error("Audio generation failed")
          setMessages((prev) => [...prev, nextMsg])
          setIsProcessing(false)
          setMessageQueue((prev) => prev.slice(1))
        }

      } catch (error) {
        // Fallback: If network error, show text and move on
        console.error("Playback error", error)
        setMessages((prev) => [...prev, nextMsg])
        setIsProcessing(false)
        setMessageQueue((prev) => prev.slice(1))
      }
    }

    processNextMessage()
  }, [messageQueue, isProcessing])

  const handleDisabledClick = (targetRole: string) => {
        setWarning(`${targetRole} slot is currently occupied. Please wait or join as the other role.`)

  }

  const joinSession = (selectedRole: "Captain" | "Scavenger" | "Mechanic") => {
      if (selectedRole === 'Captain' && isCaptainOccupied) {
          handleDisabledClick('Captain');
          return;
      }
      if (selectedRole === 'Scavenger' && isScavengerOccupied) {
          handleDisabledClick('Scavenger');
          return;
      }
      if (selectedRole === 'Mechanic' && isMechanicOccupied) {
          handleDisabledClick('Mechanic');
          return
      }

    setRole(selectedRole)
    setWarning(null)

    const id_short = Math.random().toString(36).substring(2, 10)
    setClientId(id_short)
    
    const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'
    const cleanUrl = wsBaseUrl.endsWith('/ws') ? wsBaseUrl : `${wsBaseUrl}/ws`
    
   const ws = new WebSocket(`${cleanUrl}/${voyageType}/${id_short}/${selectedRole}`)
    ws.onopen = () => {
      setIsConnected(true)
      console.log("Connected to Command Center")
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const newMsg = { ...data, timestamp: Date.now() }
      if (data.type === 'role_status' && data.data) {
          setIsCaptainOccupied(data.data.captain)
          setIsScavengerOccupied(data.data.scavenger)
          setIsMechanicOccupied(data.data.mechanic)
          return; // Don't process this as a chat message
      }
      
      if (data.type === "ai") {
        // If it's AI, put it in the HIDDEN queue. 
        // The useEffect above will handle revealing it.
        setMessageQueue((prev) => [...prev, newMsg])
      } else {
        // If it's Human or System, show it IMMEDIATELY.
        setMessages((prev) => [...prev, newMsg])
      }
    }

    ws.onclose = (event) => {
        setIsConnected(false)
        setRole(null) // Reset role on disconnect
        
        // ✨ MERGED: Handle specific backend rejection codes
        if (event.code === 4000) {
            const reason = event.reason || "This role is already occupied."
            setWarning(`Connection Failed: ${reason}`)
        } else {
            console.log("Disconnected")
        }
    }

    ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        setWarning("Connection error. Check server status.")
    }
    setSocket(ws)
  }

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !socket) return

    // Create a payload object with context
    const payload = {
      content: inputValue,
      context: {
        voyageType: voyageType,
        inventory: inventory.map(item => item.name).join(", ") // Send names as a comma-separated string
      }
    }

    socket.send(JSON.stringify(payload))
    setInputValue("")
  }

  if (!role) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-xl max-w-2xl mx-auto text-center border border-gray-100">
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Enter Voyage Command Center</h2>
        <p className="mb-8 text-gray-600">To enable multi-agent collaboration, please select your role in the squad.</p>
        {warning && (
            <div className="flex items-center justify-center p-3 mb-6 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle className="w-5 h-5 mr-2" />
                {warning}
            </div>
        )}
        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => joinSession("Captain")}
            disabled={isCaptainOccupied}
            className={`flex flex-col items-center gap-3 p-6 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all w-48 group${
                isCaptainOccupied 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
                : 'border-blue-100 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            <div className="p-4 bg-blue-100 rounded-full text-blue-600 group-hover:scale-110 transition-transform"><User size={32} /></div>
            <span className="font-bold text-lg text-gray-800">Captain {isCaptainOccupied && <span className="block text-xs text-red-500 mt-1">(Occupied)</span>}</span>
          </button>
          <button 
            onClick={() => joinSession("Scavenger")}
            className={`flex flex-col items-center gap-3 p-6 border-2 border-purple-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all w-48 group ${
                isScavengerOccupied 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
                : 'border-purple-100 hover:border-purple-500 hover:bg-purple-50'
            }`}
          >
            <div className="p-4 bg-purple-100 rounded-full text-purple-600 group-hover:scale-110 transition-transform"><Zap size={32} /></div>
            <span className="font-bold text-lg text-gray-800">Scavenger
                {isScavengerOccupied && <span className="block text-xs text-red-500 mt-1">(Occupied)</span>}
            </span>
          </button>
            <button
              onClick={() => joinSession("Mechanic")}
              className={`flex flex-col items-center gap-3 p-6 border-2 border-green-100 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all w-48 group ${
                  isMechanicOccupied
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                      : 'border-green-100 hover:border-green-500 hover:bg-green-50'
              }`}
            >
              <div className="p-4 bg-green-100 rounded-full text-green-600 group-hover:scale-110 transition-transform"><Zap size={32} /></div>
              <span className="font-bold text-lg text-gray-800">Mechanic
                  {isMechanicOccupied && <span className="block text-xs text-red-500 mt-1">(Occupied)</span>}
              </span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 h-[600px] flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <div>
            <span className="font-mono font-bold block leading-none">CMD_CENTER // {voyageType.toUpperCase()}</span>
            <span className="text-xs text-gray-400 font-mono">SECURE CONNECTION ESTABLISHED</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isProcessing && (
            <div className="flex items-center gap-1 text-green-400 text-xs font-mono bg-gray-800 px-2 py-1 rounded">
              <Volume2 size={12} className="animate-pulse" />
              INCOMING TRANSMISSION...
            </div>
          )}
          <div className="text-xs bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
            ID: <span className="text-blue-400 font-bold">{role} ({clientId})</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map((msg, idx) => {
          const isMe = msg.role === role
          const isSystem = msg.type === "system"

          if (isSystem) {
            return (
              <div key={idx} className="flex justify-center my-4">
                <span className="text-xs text-gray-500 font-mono bg-gray-200/60 px-3 py-1 rounded-full border border-gray-200">
                  SYSTEM: {msg.content}
                </span>
              </div>
            )
          }

          return (
            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex gap-3 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border
                  ${msg.role === 'Outfitter' ? 'bg-orange-100 text-orange-600 border-orange-200' : 
                    msg.role === 'Safety Officer' ? 'bg-red-100 text-red-600 border-red-200' : 
                    'bg-blue-100 text-blue-600 border-blue-200'}`}>
                  {msg.role === 'Outfitter' ? <Bot size={18} /> : 
                   msg.role === 'Safety Officer' ? <ShieldAlert size={18} /> : 
                   <User size={18} />}
                </div>

                {/* Bubble */}
                <div>
                  <div className={`text-xs mb-1 font-medium ${isMe ? 'text-right text-blue-600' : 'text-left text-gray-500'}`}>
                    {msg.role}
                  </div>
                  <div className={`p-3.5 rounded-2xl text-sm shadow-sm leading-relaxed
                    ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 
                      msg.role === 'Outfitter' ? 'bg-white border-l-4 border-orange-500 text-gray-800' :
                      msg.role === 'Safety Officer' ? 'bg-white border-l-4 border-red-500 text-gray-800' :
                      'bg-white text-gray-800 border border-gray-100'}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {/* Typing Indicator for Queue */}
        {messageQueue.length > 0 && (
          <div className="flex justify-start animate-in fade-in">
             <div className="flex gap-3 max-w-[80%] flex-row">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center animate-pulse">
                   <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
                <div className="p-3 bg-gray-100 rounded-2xl text-xs text-gray-500 italic">
                   {messageQueue[0].role} is preparing transmission...
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Transmitting as ${role}...`}
            className="flex-1 px-4 py-3 text-gray-900 bg-white placeholder-gray-500 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
          />
          <button 
            type="submit" 
            disabled={!isConnected || !inputValue.trim()}
            className="bg-blue-600 text-white px-6 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  )
}