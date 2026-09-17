
import React, { useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { BrainIcon } from './icons/BrainIcon';
import { UserIcon } from './icons/UserIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';

interface ReportChatProps {
    messages: ChatMessage[];
    inputValue: string;
    onInputChange: (value: string) => void;
    onSendMessage: () => void;
    isLoading: boolean;
}

const ChatMessageContent: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const icon = message.role === 'user' 
        ? <UserIcon className="w-5 h-5 text-accent-primary" /> 
        : <BrainIcon className="w-5 h-5 text-accent-pro" />;

    const bubbleClasses = message.role === 'user'
        ? 'bg-surface'
        : 'bg-card';
    
    // A simplified markdown renderer
    const renderContent = (content: string) => {
        // Remove the JSON block for rendering in chat
        const cleanContent = content.replace(/```json\s*([\s\S]*?)\s*```/, '\n*<Report data has been updated on the left.>*');
        
        return cleanContent
            .replace(/## (.*)/g, '<h2 class="text-lg font-bold mt-2">$1</h2>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\* ([^*]+)/g, '<li class="ml-4 list-disc">$1</li>');
    };

    return (
        <div className={`flex items-start gap-3 p-4 animate-fade-in`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-surface border border-border">
                {icon}
            </div>
            <div className={`p-3 rounded-lg w-full ${bubbleClasses}`}>
                 <div 
                    className="prose prose-sm max-w-none text-text-primary"
                    dangerouslySetInnerHTML={{ __html: renderContent(message.content) }}
                 />
            </div>
        </div>
    );
};

const LoadingBubble: React.FC = () => (
    <div className="flex items-start gap-3 p-4 animate-pulse">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-surface border border-border">
            <BrainIcon className="w-5 h-5 text-accent-pro" />
        </div>
        <div className="p-3 rounded-lg bg-card border border-border flex items-center gap-3">
            <svg className="animate-spin h-4 w-4 text-accent-pro" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs text-text-secondary font-semibold">Analyzing & Updating Report...</span>
        </div>
    </div>
);

export const ReportChat: React.FC<ReportChatProps> = ({ messages, inputValue, onInputChange, onSendMessage, isLoading }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isLoading]);

    const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSendMessage();
        }
    };
    
    return (
        <div className="bg-card border border-border rounded-lg shadow-sm h-full flex flex-col">
            <header className="bg-surface text-text-primary p-3 border-b border-border flex items-center gap-3">
                <ChatBubbleIcon className="w-5 h-5 text-accent-primary" />
                <h2 className="text-sm font-semibold">AI Report Editor</h2>
            </header>
            <div className="flex-grow overflow-y-auto">
                {messages.length === 0 && !isLoading ? (
                    <div className="flex items-center justify-center h-full text-center text-text-secondary p-4">
                        <p className="text-sm">Ask the AI to refine the report. For example: "Make the organizational impact for trend #2 more concise."</p>
                    </div>
                ) : (
                    <div>
                        {messages.map((msg, index) => (
                            <ChatMessageContent key={index} message={msg} />
                        ))}
                        {isLoading && <LoadingBubble />}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>
            <div className="p-2 border-t border-border bg-surface">
                <div className="relative">
                    <textarea
                        value={inputValue}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message to refine the report..."
                        rows={3}
                        disabled={isLoading}
                        className="w-full bg-background border border-border rounded-lg p-3 pr-20 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] disabled:opacity-50"
                    />
                    <button
                        onClick={onSendMessage}
                        disabled={isLoading || !inputValue.trim()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-accent-primary hover:opacity-90 disabled:bg-border disabled:cursor-not-allowed text-white font-semibold rounded-md shadow-sm transition-colors"
                    >
                         {isLoading ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                         ) : (
                            <span>Send</span>
                         )}
                    </button>
                </div>
            </div>
        </div>
    );
};
