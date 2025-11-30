"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Users, AlertTriangle, Send } from "lucide-react"

// Define the expected message structures
interface RoleStatus {
    captain: boolean
    specialist: boolean
}

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

interface CommandCenterProps {
    voyageType: string
}

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
    }

    if (!role) {
        return (
            <div className="text-center bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Join Command Center</h3>
                <p className="text-gray-600 mb-6">Select your role for the **{voyageType}** voyage.</p>

                {warning && (
                    <div className="flex items-center justify-center p-3 mb-4 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        {warning}
                    </div>
                )}

                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => {
                            if (isCaptainOccupied) {
                                handleDisabledClick('captain')
                            } else {
                                connectWebSocket('captain')
                            }
                        }}
                        disabled={isCaptainOccupied}
                        className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all ${
                            isCaptainOccupied
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                        }`}
                    >
                        <Users className="w-5 h-5 mr-2" />
                        Join as Captain {isCaptainOccupied && ' (Occupied)'}
                    </button>
                    <button
                        onClick={() => {
                            if (isSpecialistOccupied) {
                                handleDisabledClick('specialist')
                            } else {
                                connectWebSocket('specialist')
                            }
                        }}
                        disabled={isSpecialistOccupied}
                        className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all ${
                            isSpecialistOccupied
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md'
                        }`}
                    >
                        <Users className="w-5 h-5 mr-2" />
                        Join as Specialist {isSpecialistOccupied && ' (Occupied)'}
                    </button>
                </div>
            </div>
        )
    }

    // Chat Interface
    return (
        <div className="flex flex-col h-[75vh] bg-white rounded-xl shadow-2xl border border-gray-100">
            {/* Header */}
            <div className="p-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                    Active: <span className="text-blue-600 font-bold">{role?.toUpperCase()}</span> ({clientId})
                </h3>
                <span className="text-sm text-green-600 font-medium bg-green-100 px-3 py-1 rounded-full">
                    Connected
                </span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'human' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xl p-3 rounded-lg shadow-md ${
                            msg.role === 'human'
                                ? 'bg-blue-600 text-white'
                                : msg.role === 'ai'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-yellow-100 text-gray-600 text-sm italic'
                        }`}>
                            <p className="font-semibold text-xs mb-1">
                                {msg.source}
                            </p>
                            <p>{msg.content}</p>
                        </div>
                    </div>
                ))}
                <div ref={messageEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t bg-gray-50 rounded-b-xl">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Send message to The Outfitter and Safety Officer..."
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        // ✅ FIX: Use isWsOpen state instead of accessing wsRef.current
                        disabled={!role || !isWsOpen}
                    />
                    <button
                        type="submit"
                        // ✅ FIX: Use isWsOpen state instead of accessing wsRef.current
                        disabled={!inputMessage.trim() || !isWsOpen}
                        className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    )
}