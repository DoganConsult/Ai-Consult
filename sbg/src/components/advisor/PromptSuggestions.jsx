import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Scale, Briefcase } from 'lucide-react';

const businessPrompts = [
    "Help me create a marketing strategy for my law firm",
    "What are the key metrics I should track in my business?",
    "How do I improve client retention?",
    "Create a business plan template",
    "What are effective networking strategies for lawyers?"
];

const legalPrompts = [
    "Explain the latest changes in employment law",
    "Help me research case law for contract disputes",
    "What are the requirements for setting up a limited company?",
    "Explain the difference between civil and criminal liability",
    "What are the key compliance requirements for data protection?"
];

export default function PromptSuggestions({ onSelectPrompt, lawMode }) {
    const prompts = lawMode ? legalPrompts : businessPrompts;
    const icon = lawMode ? Scale : Briefcase;
    const title = lawMode ? "Legal Research Ideas" : "Business Strategy Ideas";
    const IconComponent = icon;

    return (
        <Card className="bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200">
            <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900">{title}</h3>
                </div>
                <div className="space-y-2">
                    {prompts.map((prompt, index) => (
                        <Button
                            key={index}
                            variant="ghost"
                            className="w-full text-left justify-start h-auto p-2 text-sm text-slate-700 hover:bg-blue-100"
                            onClick={() => onSelectPrompt(prompt)}
                        >
                            <Lightbulb className="w-3 h-3 mr-2 text-blue-500" />
                            {prompt}
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}