import React, { useState, useRef, useEffect } from 'react';
import './ChatAssistant.css';

function ChatAssistant({ onClose, diagnosticContext }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hi! I'm your PC Health Assistant. I'm here to help with any computer problems you're experiencing. What's troubling your computer today?",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsLoading(true);

    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Call the chat API with diagnostic context
      const result = await window.pcHealthAPI.sendChatMessage(userMessage, diagnosticContext);

      if (result.success) {
        // Add assistant response
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.message,
          timestamp: new Date()
        }]);
      } else {
        // Show error
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
          timestamp: new Date(),
          isError: true
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Oops! Something went wrong. Please try again.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = async () => {
    if (confirm('Clear this conversation and start fresh?')) {
      await window.pcHealthAPI.clearChatHistory();
      setMessages([{
        role: 'assistant',
        content: "Conversation cleared! How can I help you today?",
        timestamp: new Date()
      }]);
    }
  };

  return (
    <div className="chat-assistant-overlay">
      <div className="chat-assistant-container">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-content">
            <div className="chat-title">
              <span className="chat-icon">🤖</span>
              <div>
                <h3>AI Tech Support</h3>
                <p className="chat-subtitle">Ask me anything about your PC</p>
              </div>
            </div>
            <div className="chat-header-buttons">
              <button
                className="chat-header-btn clear-btn"
                onClick={handleClearChat}
                title="Clear conversation"
              >
                🔄 Clear
              </button>
              <button
                className="chat-header-btn close-btn"
                onClick={onClose}
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chat-message ${msg.role} ${msg.isError ? 'error' : ''}`}
            >
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-text">{msg.content}</div>
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-message assistant loading">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions (shown when chat is empty) */}
        {messages.length === 1 && (
          <div className="suggested-questions">
            <p className="suggestions-title">💡 Try asking:</p>
            <button
              className="suggestion-btn"
              onClick={() => setInputText("My computer is running really slow")}
            >
              "My computer is running really slow"
            </button>
            <button
              className="suggestion-btn"
              onClick={() => setInputText("A program keeps crashing")}
            >
              "A program keeps crashing"
            </button>
            <button
              className="suggestion-btn"
              onClick={() => setInputText("My internet isn't working")}
            >
              "My internet isn't working"
            </button>
            <button
              className="suggestion-btn"
              onClick={() => setInputText("I'm getting error messages")}
            >
              "I'm getting error messages"
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <textarea
              ref={inputRef}
              className="chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your question here... (Press Enter to send)"
              rows="1"
              disabled={isLoading}
            />
            <button
              className="chat-send-btn"
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? '⏳' : '📤'} Send
            </button>
          </div>
          <div className="chat-input-hint">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatAssistant;
