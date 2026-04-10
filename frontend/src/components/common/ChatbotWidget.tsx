import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { chatWithBot, type ChatMessage } from '../../services/chatbotService';
import useAuthStore from '../../store/useAuthStore';
import useChatStore from '../../store/useChatStore';

export const ChatbotWidget: React.FC = () => {
    const { token } = useAuthStore();
    const { context } = useChatStore();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([{
        role: 'assistant',
        content: 'Hi! I am the DiagnoAI Medical Assistant. How can I help you understand your reports or medical questions today?'
    }]);
    const [inputMsg, setInputMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    // Early return must happen after all hooks
    if (!token) return null;

    const handleSend = async () => {
        if (!inputMsg.trim() || isLoading) return;

        const userMsg: ChatMessage = { role: 'user', content: inputMsg.trim() };
        const newMessages = [...messages, userMsg];
        
        setMessages(newMessages);
        setInputMsg("");
        setIsLoading(true);

        try {
            // We pass the previous history (excluding the very first greeting if we want to save tokens, but here we just pass all)
            const responseText = await chatWithBot(userMsg.content, messages, context); // Context is injected from state
            setMessages([...newMessages, { role: 'assistant', content: responseText }]);
        } catch (error: any) {
            setMessages([...newMessages, { 
                role: 'assistant', 
                content: "I'm sorry, I encountered an error connecting to the AI service. Please make sure the service is online or try again."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl mb-4 w-[340px] sm:w-[400px] h-[500px] max-h-[80vh] flex flex-col overflow-hidden backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/50 flex justify-between items-center backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <div className="p-1 bg-cyan-500/20 rounded-lg">
                                    <Bot size={20} className="text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-100 text-sm">DiagnoAI Assistant</h3>
                                    <p className="text-xs text-slate-400">Medical queries only</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {messages.map((msg, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                        msg.role === 'user' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-cyan-500/20 text-cyan-400'
                                    }`}>
                                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                    </div>
                                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-100' 
                                            : 'bg-slate-800 border border-slate-700/50 text-slate-200'
                                    }`}>
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex gap-3 flex-row"
                                >
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                        <Bot size={16} />
                                    </div>
                                    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl px-4 py-3 flex items-center gap-1.5 w-16">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-slate-800/50 border-t border-slate-700/50">
                            <form 
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="relative flex items-center"
                            >
                                <input
                                    type="text"
                                    value={inputMsg}
                                    onChange={(e) => setInputMsg(e.target.value)}
                                    placeholder="Type your medical query..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-full pl-4 pr-12 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputMsg.trim() || isLoading}
                                    className="absolute right-1.5 p-1.5 bg-cyan-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-400 transition-colors"
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center transition-colors ${
                    isOpen ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-gradient-to-tr from-cyan-500 to-indigo-500 text-white hover:from-cyan-400 hover:to-indigo-400'
                }`}
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
            </motion.button>
        </div>
    );
};
