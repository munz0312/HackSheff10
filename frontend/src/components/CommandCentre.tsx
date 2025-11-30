"use client"

import { useState, useEffect, useRef } from "react"
import { Send, User, Bot, ShieldAlert, Zap, Volume2 } from "lucide-react"

interface Message {
  type: "human" | "ai" | "system"
  role?: string
  content: string
  timestamp: number
}

interface QueueItem extends Message {}

interface CommandCenterProps {
  voyageType: string
}

const VOICES = {
  OUTFITTER: "21m00Tcm4TlvDq8ikWAM", // Rachel
  SAFETY: "ErXwobaYiN019PkySvjV",    // Antoni
}

export default function CommandCenter({ voyageType }: CommandCenterProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  
  // Visible Messages (What the user sees)
  const [messages, setMessages] = useState<Message[]>([])
  
  // Hidden Queue (AI messages waiting to be spoken)
  const [messageQueue, setMessageQueue] = useState<QueueItem[]>([])
  
  const [inputValue, setInputValue] = useState("")
  const [role, setRole] = useState<"Captain" | "Specialist" | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false) // Lock for the audio processor

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
        const voiceId = nextMsg.role === "Outfitter" ? VOICES.OUTFITTER : VOICES.SAFETY
        
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
          
          await audio.play()

          // When audio finishes, unlock processor and remove item from queue
          audio.onended = () => {
            setIsProcessing(false)
            setMessageQueue((prev) => prev.slice(1)) // Remove the item we just played
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

  const joinSession = (selectedRole: "Captain" | "Specialist") => {
    setRole(selectedRole)
    const clientId = Math.floor(Math.random() * 1000).toString()
    
    const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'
    const cleanUrl = wsBaseUrl.endsWith('/ws') ? wsBaseUrl : `${wsBaseUrl}/ws`
    
    const ws = new WebSocket(`${cleanUrl}/${clientId}/${selectedRole}`)

    ws.onopen = () => {
      setIsConnected(true)
      console.log("Connected to Command Center")
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const newMsg = { ...data, timestamp: Date.now() }
      if (data.type === "ai") {
        // If it's AI, put it in the HIDDEN queue. 
        // The useEffect above will handle revealing it.
        setMessageQueue((prev) => [...prev, newMsg])
      } else {
        // If it's Human or System, show it IMMEDIATELY.
        setMessages((prev) => [...prev, newMsg])
      }
    }

    ws.onclose = () => setIsConnected(false)
    setSocket(ws)
  }

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !socket) return
    socket.send(JSON.stringify({ content: inputValue }))
    setInputValue("")
  }

  if (!role) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-xl max-w-2xl mx-auto text-center border border-gray-100">
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Enter Voyage Command Center</h2>
        <p className="mb-8 text-gray-600">To enable multi-agent collaboration, please select your role in the squad.</p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => joinSession("Captain")}
            className="flex flex-col items-center gap-3 p-6 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all w-48 group"
          >
            <div className="p-4 bg-blue-100 rounded-full text-blue-600 group-hover:scale-110 transition-transform"><User size={32} /></div>
            <span className="font-bold text-lg text-gray-800">Captain</span>
          </button>
          <button 
            onClick={() => joinSession("Specialist")}
            className="flex flex-col items-center gap-3 p-6 border-2 border-purple-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all w-48 group"
          >
            <div className="p-4 bg-purple-100 rounded-full text-purple-600 group-hover:scale-110 transition-transform"><Zap size={32} /></div>
            <span className="font-bold text-lg text-gray-800">Specialist</span>
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
            ID: <span className="text-blue-400 font-bold">{role}</span>
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
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
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