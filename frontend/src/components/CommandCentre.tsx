"use client"

import { useState, useEffect, useRef } from "react"
import { Send, User, Bot, ShieldAlert, Zap } from "lucide-react"

interface Message {
  type: "human" | "ai" | "system"
  role?: string
  content: string
  timestamp: number
}

interface CommandCenterProps {
  voyageType: string
}

export default function CommandCenter({ voyageType }: CommandCenterProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [role, setRole] = useState<"Captain" | "Specialist" | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const joinSession = (selectedRole: "Captain" | "Specialist") => {
    setRole(selectedRole)
    const clientId = Math.floor(Math.random() * 1000).toString()
    // Connect to Backend WebSocket
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/${clientId}/${selectedRole}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setIsConnected(true)
      console.log("Connected to Command Center")
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setMessages((prev) => [...prev, { ...data, timestamp: Date.now() }])
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

  // 1. Role Selection Screen
  if (!role) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-xl max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-6">Enter Voyage Command Center</h2>
        <p className="mb-8 text-gray-600">To enable multi-agent collaboration, please select your role in the squad.</p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => joinSession("Captain")}
            className="flex flex-col items-center gap-2 p-6 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <div className="p-4 bg-blue-100 rounded-full text-blue-600"><User size={32} /></div>
            <span className="font-bold text-lg">Join as Captain</span>
          </button>
          <button 
            onClick={() => joinSession("Specialist")}
            className="flex flex-col items-center gap-2 p-6 border-2 border-purple-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all"
          >
            <div className="p-4 bg-purple-100 rounded-full text-purple-600"><Zap size={32} /></div>
            <span className="font-bold text-lg">Join as Specialist</span>
          </button>
        </div>
        <p className="mt-6 text-sm text-gray-400">Tip: Open this in a second tab and select the other role to test multi-human chat.</p>
      </div>
    )
  }

  // 2. Chat Interface
  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 h-[600px] flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-mono font-bold">CMD_CENTER // {voyageType.toUpperCase()}</span>
        </div>
        <div className="text-xs bg-gray-800 px-2 py-1 rounded">
          Logged in as: <span className="text-blue-400 font-bold">{role}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => {
          const isMe = msg.role === role
          const isAi = msg.type === "ai"
          const isSystem = msg.type === "system"

          if (isSystem) {
            return (
              <div key={idx} className="flex justify-center">
                <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded-full">{msg.content}</span>
              </div>
            )
          }

          return (
            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 
                  ${msg.role === 'Outfitter' ? 'bg-orange-100 text-orange-600' : 
                    msg.role === 'Safety Officer' ? 'bg-red-100 text-red-600' : 
                    'bg-blue-100 text-blue-600'}`}>
                  {msg.role === 'Outfitter' ? <Bot size={16} /> : 
                   msg.role === 'Safety Officer' ? <ShieldAlert size={16} /> : 
                   <User size={16} />}
                </div>

                {/* Bubble */}
                <div>
                  <div className={`text-xs mb-1 text-gray-500 ${isMe ? 'text-right' : 'text-left'}`}>
                    {msg.role}
                  </div>
                  <div className={`p-3 rounded-lg text-sm shadow-sm
                    ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 
                      msg.role === 'Outfitter' ? 'bg-white border-l-4 border-orange-500 text-gray-800' :
                      msg.role === 'Safety Officer' ? 'bg-white border-l-4 border-red-500 text-gray-800' :
                      'bg-white text-gray-800'}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Speaking as ${role}...`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="submit" 
            disabled={!isConnected || !inputValue.trim()}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  )
}