"use client"

<<<<<<< HEAD
import { useState, useEffect, useRef } from "react"
import { Send, User, Bot, ShieldAlert, Zap, Volume2 } from "lucide-react"
=======
import { useState, useEffect, useCallback, useRef } from "react"
import { Users, AlertTriangle, Send } from "lucide-react"

// Define the expected message structures
interface RoleStatus {
    captain: boolean
    specialist: boolean
}
>>>>>>> d19f55c71777aaa2a0568a746815c7cc7878451c

interface Message {
    type: 'system' | 'human' | 'ai' | 'role_status'
    content?: string // This is the source of the TS error: it's optional
  role?: string
    data?: RoleStatus
}

interface ChatMessage {
    id: number
    role: 'system' | 'human' | 'ai'
    source: string
    content: string // This must be a required string
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
=======
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const WS_URL = API_URL.replace('http', 'ws')

export default function CommandCenter({ voyageType }: CommandCenterProps) {
    const [role, setRole] = useState<'captain' | 'specialist' | null>(null)
    const [clientId, setClientId] = useState<string | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isCaptainOccupied, setIsCaptainOccupied] = useState(false)
    const [isSpecialistOccupied, setIsSpecialistOccupied] = useState(false)
    const [inputMessage, setInputMessage] = useState("")
    const [warning, setWarning] = useState<string | null>(null)
    const [isWsOpen, setIsWsOpen] = useState(false) // ✨ NEW STATE for WebSocket readiness

    const wsRef = useRef<WebSocket | null>(null)
    const messageEndRef = useRef<HTMLDivElement>(null)

    const connectWebSocket = useCallback((targetRole: 'captain' | 'specialist') => {
        if (wsRef.current) return
>>>>>>> d19f55c71777aaa2a0568a746815c7cc7878451c

        const id = crypto.randomUUID()
        const id_short = id.slice(0, 8)
        setClientId(id_short)
        setRole(targetRole)
        setWarning(null)

        const socket = new WebSocket(`${WS_URL}/ws/${id_short}/${targetRole}`)
        wsRef.current = socket

        socket.onopen = () => {
            console.log(`WebSocket connected as ${targetRole}`)
            setIsWsOpen(true) // ✨ Set state to open
            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'system',
                source: 'System',
                content: `Successfully connected as ${targetRole.toUpperCase()}. ID: ${id_short}`
            }])
        }

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data) as Message

            if (data.type === 'role_status' && data.data) {
                // CRITICAL: Update button status based on backend broadcast
                setIsCaptainOccupied(data.data.captain)
                setIsSpecialistOccupied(data.data.specialist) //
            } else if (data.content) {
                // Handle chat messages
                const source = data.role === 'captain' || data.role === 'specialist' ? data.role.toUpperCase() : data.role || 'System'

                // FIX: Use non-null assertion (!) because the 'if (data.content)' guarantees its presence.
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    role: data.type as 'system' | 'human' | 'ai',
                    source: source,
                    content: data.content! // <-- TS Error Fix applied here
                }])
            }
        }

        socket.onclose = (event) => {
            console.log(`WebSocket closed: ${event.code}. Reason: ${event.reason}`)
            wsRef.current = null
            setRole(null)
            setIsWsOpen(false) // ✨ Set state to closed

            if (event.code === 4000) {
                // CRITICAL: Handle the custom close code for role rejection
                const reason = event.reason || "This role is already occupied."
                setWarning(`Connection Failed: ${reason}`) //
            } else if (event.code !== 1000) {
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    role: 'system',
                    source: 'System',
                    content: `Connection lost (${event.code}). Please try reconnecting.`
                }])
            }
        }

        socket.onerror = (error) => {
            console.error("WebSocket error:", error)
            setWarning("WebSocket connection error. Check API key and server status.")
        }

    }, [])

    // Clean up WebSocket on component unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close(1000, "Component Unmount")
    }
        }
    }, [connectWebSocket])

    // Scroll to the bottom of the chat box when a new message arrives
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Handle button clicks when a role is occupied (displays warning)
    const handleDisabledClick = (targetRole: string) => {
        if ((targetRole === 'captain' && isCaptainOccupied) || (targetRole === 'specialist' && isSpecialistOccupied)) {
            setWarning(`${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} slot is currently occupied. Please wait or join as the other role.`)
        }
    }

<<<<<<< HEAD
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
=======
    // Send message logic
    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault()
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !inputMessage.trim() || !role) {
            return
        }

        const messagePayload = {
            content: inputMessage.trim(),
            role: role,
        }

        wsRef.current.send(JSON.stringify(messagePayload))
        setInputMessage("")
>>>>>>> d19f55c71777aaa2a0568a746815c7cc7878451c
    }

    if (!role) {
        return (
            <div className="text-center bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Join Command Center</h3>
                <p className="text-gray-600 mb-6">Select your role for the **{voyageType}** voyage.</p>

<<<<<<< HEAD
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