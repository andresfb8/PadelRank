import React, { useState } from 'react';
import { MessageCircle, X, Send, Search, Sparkles } from 'lucide-react';
import { Button, Card } from './ui/Components';
import { searchPadelRules } from '../services/geminiService';

export const GeminiAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([
    {role: 'model', text: '¡Hola! Soy tu asistente de Pádel. Pregúntame sobre reglas, torneos o dudas del juego.'}
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg = query;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setQuery('');
    setLoading(true);

    const result = await searchPadelRules(userMsg);
    setMessages(prev => [...prev, { role: 'model', text: result.text }]);
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-40"
      >
        {isOpen ? <X /> : <Sparkles />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-40 border border-gray-200 overflow-hidden">
          <div className="bg-primary p-4 text-white flex items-center gap-2">
            <Sparkles size={18} />
            <h3 className="font-bold">Asistente IA</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-center text-xs text-gray-400 animate-pulse">Pensando...</div>}
          </div>

          <div className="p-3 border-t bg-white flex gap-2">
            <input 
              type="text" 
              className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="Pregunta sobre reglas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={loading} className="p-2 bg-primary text-white rounded-full hover:bg-blue-700 disabled:opacity-50">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};