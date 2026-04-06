import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, CheckCircle } from 'lucide-react';

const legalSpecialities = [
    { value: 'corporate', label: 'Corporate Law' },
    { value: 'criminal', label: 'Criminal Law' },
    { value: 'family', label: 'Family Law' },
    { value: 'employment', label: 'Employment Law' },
    { value: 'property', label: 'Property Law' },
    { value: 'personal_injury', label: 'Personal Injury' },
    { value: 'immigration', label: 'Immigration Law' },
    { value: 'tax', label: 'Tax Law' },
    { value: 'other', label: 'Other' }
];

export default function LawModeSetup({ onSetup, onSkip }) {
    const [speciality, setSpeciality] = useState('');

    const handleSetup = () => {
        onSetup(speciality);
    };

    return (
        <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <Scale className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-900">
                    LAW MODE ⚖️ Setup
                </CardTitle>
                <p className="text-slate-600">
                    Help Star provide better legal assistance by sharing your speciality
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        What's your legal speciality?
                    </label>
                    <Select value={speciality} onValueChange={setSpeciality}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select your area of law" />
                        </SelectTrigger>
                        <SelectContent>
                            {legalSpecialities.map((spec) => (
                                <SelectItem key={spec.value} value={spec.value}>
                                    {spec.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-3">
                    <Button 
                        onClick={handleSetup} 
                        disabled={!speciality}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Set Up LAW MODE
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={onSkip}
                        className="flex-1"
                    >
                        Skip for Now
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}