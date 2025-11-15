/**
 * AI Chat Hook
 * 
 * Manages AI chat conversation state and API calls.
 */

import { useState, useCallback } from 'react';
import { csrfFetch } from '../lib/csrfFetch';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

interface UseAIChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
}

export function useAIChat(): UseAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: message.trim(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await csrfFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to get AI response');
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.message,
        suggestions: response.data.suggestions,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      const errorResponse: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
  };
}

