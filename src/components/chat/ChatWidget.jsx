import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageSquare, X, Send, Minimize2, Maximize2, Sparkles, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ChatWidget({ currentUser, currentProject }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    
    const messagesEndRef = useRef(null);

    const [isInitializing, setIsInitializing] = useState(false);
    const [initError, setInitError] = useState(null);

    // Initialize conversation
    useEffect(() => {
        const initConversation = async () => {
            setIsInitializing(true);
            setInitError(null);
            try {
                // Use the exact agent name that works in dashboard
                const agentName = "InspectFlowBot";
                
                // Simplified metadata to ensure stability
                const metadata = {
                    user_context: currentUser?.full_name || 'User',
                };

                const newConv = await base44.agents.createConversation({
                    agent_name: agentName,
                    metadata: metadata
                });

                if (!newConv) {
                    throw new Error("Failed to create conversation - empty response");
                }

                setConversation(newConv);
                setMessages(Array.isArray(newConv.messages) ? newConv.messages : []);

                // Context message removed to simplify connection flow
                console.log("Conversation created successfully", newConv.id);

            } catch (error) {
                console.error("Failed to init conversation:", error);
                // Don't show the specific error message to user as requested, just a generic one if it fails hard
                // But if it's the specific map error, we might want to retry or ignore
                const errorMessage = error?.message || "Unknown error";
                if (errorMessage.includes("map")) {
                     console.warn("Swallowing map error in initialization");
                     // Attempt to recover or just leave it
                }
                setInitError("Chat unavailable momentarily"); 
            } finally {
                setIsInitializing(false);
            }
        };

        if (isOpen && !conversation && currentUser && !isInitializing && !initError) {
            initConversation();
        }
    }, [isOpen, currentUser, currentProject, conversation, initError]);

    // Subscribe to messages with polling fallback
    useEffect(() => {
        if (!conversation?.id) return;

        let unsubscribe = () => {};
        let pollInterval;

        const fetchMessages = async () => {
            try {
                const updatedConv = await base44.agents.getConversation(conversation.id);
                if (updatedConv && updatedConv.messages) {
                    setMessages(updatedConv.messages);

                    const lastMsg = updatedConv.messages[updatedConv.messages.length - 1];
                    if (lastMsg?.role === 'assistant' && !lastMsg.content && lastMsg.tool_calls?.some(tc => tc.status === 'running')) {
                        setIsTyping(true);
                    } else {
                        setIsTyping(false);
                    }
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        };

        try {
            // Real-time subscription
            unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
                if (!data || !data.messages) return;
                setMessages(data.messages || []);

                const lastMsg = data.messages[data.messages.length - 1];
                setIsTyping(lastMsg?.role === 'assistant' && !lastMsg.content && lastMsg.tool_calls?.some(tc => tc.status === 'running'));
            });

            // Fallback polling every 3 seconds
            pollInterval = setInterval(fetchMessages, 3000);

        } catch (err) {
            console.error("Subscription error:", err);
            // If subscription fails, rely on polling
            pollInterval = setInterval(fetchMessages, 3000);
        }

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [conversation?.id]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen, isTyping]);

    const handleSend = async () => {
        if (!inputValue.trim() || !conversation) return;

        const content = inputValue;
        setInputValue("");
        setIsLoading(true);

        // Optimistic update
        const tempMessage = { role: "user", content: content, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, tempMessage]);

        try {
            // Pass the full conversation object, not just the ID
            await base44.agents.addMessage(conversation, {
                role: "user",
                content: content
            });
            // Trigger an immediate fetch to ensure we have the latest state
            const updatedConv = await base44.agents.getConversation(conversation.id);
            if (updatedConv?.messages) {
                 setMessages(updatedConv.messages);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            toast.error("Failed to send message");
            setMessages(prev => prev.filter(m => m !== tempMessage));
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ 
                            opacity: 1, 
                            y: 0, 
                            scale: 1,
                            height: isMinimized ? 'auto' : '600px',
                            width: isMinimized ? '320px' : '400px'
                        }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={cn(
                            "bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mb-4 pointer-events-auto flex flex-col",
                            isMinimized ? "h-auto" : "h-[600px] w-[400px] max-w-[calc(100vw-48px)] max-h-[calc(100vh-120px)]"
                        )}
                    >
                        {/* Header */}
                        <div className="bg-indigo-600 p-4 flex items-center justify-between text-white shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="bg-white/20 p-1.5 rounded-lg">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">InspectFlowBot</h3>
                                    <p className="text-xs text-indigo-200">Ask about your data</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-white hover:bg-white/20"
                                    onClick={() => setIsMinimized(!isMinimized)}
                                >
                                    {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-white hover:bg-white/20"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Messages Area */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                                    {isInitializing ? (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                                            <p className="text-sm text-gray-500">Connecting...</p>
                                        </div>
                                    ) : initError ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                                            <p className="text-sm text-red-600 font-medium">{initError}</p>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="mt-4"
                                                onClick={() => { setInitError(null); setConversation(null); }}
                                            >
                                                <RefreshCw className="w-3 h-3 mr-2" />
                                                Retry
                                            </Button>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60">
                                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                                                <Sparkles className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <p className="text-sm font-medium text-gray-900">How can I help you today?</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Ask me about inspections, inspectors, or general statistics.
                                            </p>
                                        </div>
                                    ) : (
                                        messages.map((msg, idx) => (
                                            <MessageBubble key={idx} message={msg} />
                                        ))
                                    )}
                                    
                                    {isTyping && (
                                        <div className="flex gap-2 items-center text-xs text-gray-500 ml-2">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            AI is thinking...
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-3 bg-white border-t">
                                    <div className="relative flex items-center">
                                        <Input
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder={isInitializing ? "Connecting..." : "Type a message..."}
                                            className="pr-10 py-6 bg-gray-50 border-gray-200 focus-visible:ring-indigo-500"
                                            disabled={isLoading || isInitializing || !!initError}
                                        />
                                        <Button 
                                            size="sm" 
                                            className="absolute right-1.5 bg-indigo-600 hover:bg-indigo-700 h-8 w-8 p-0 rounded-lg"
                                            onClick={handleSend}
                                            disabled={!inputValue.trim() || isLoading || isInitializing || !!initError}
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 pointer-events-auto",
                    isOpen ? "bg-gray-200 text-gray-600 rotate-90" : "bg-indigo-600 text-white"
                )}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </motion.button>
        </div>
    );
}