import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, CornerDownLeft, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ChatInput({ onSendMessage, isLoading, onLawModeToggle, lawMode }) {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim() && !isLoading) {
            const message = lawMode ? `[LAW MODE] ${inputValue}` : inputValue;
            onSendMessage(message);
            setInputValue('');
        }
    };

    const toggleLawMode = () => {
        const newLawMode = !lawMode;
        onLawModeToggle?.(newLawMode);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant={lawMode ? "default" : "outline"}
                    size="sm"
                    onClick={toggleLawMode}
                    className={lawMode ? "bg-blue-700 hover:bg-blue-800 text-white" : ""}
                >
                    <Scale className="w-4 h-4 mr-1" />
                    LAW MODE ⚖️
                </Button>
                {lawMode && (
                    <Badge className="bg-blue-100 text-blue-800">
                        Legal research & advice active
                    </Badge>
                )}
            </div>
            
            <form onSubmit={handleSubmit} className="relative">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={lawMode ? "Ask for legal research or advice..." : "Ask for business advice..."}
                    className="pr-24 h-12 rounded-lg"
                    disabled={isLoading}
                />
                <Button
                    type="submit"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    disabled={isLoading || !inputValue.trim()}
                >
                    {isLoading ? 'Thinking...' : (
                        <>
                            <span className="hidden sm:inline">Send</span>
                            <Send className="sm:hidden w-4 h-4" />
                            <CornerDownLeft className="hidden sm:inline w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}