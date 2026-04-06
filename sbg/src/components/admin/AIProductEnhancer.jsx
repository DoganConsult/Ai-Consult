import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Wand2, FileText, Tags, Search, Loader2, Check, Copy, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIProductEnhancer({ productData, onApply }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [briefInput, setBriefInput] = useState(productData?.description || '');
  const [results, setResults] = useState({
    description: null,
    features: null,
    seo: null
  });
  const [copiedField, setCopiedField] = useState(null);

  const generateContent = async (type) => {
    setIsGenerating(true);
    setActiveTab(type);

    try {
      let prompt = '';
      let schema = {};

      if (type === 'description') {
        prompt = `You are a professional product copywriter for Saudi Business Gate, an enterprise solutions company. 
        
Create an engaging, detailed product description for this enterprise software/solution:
Product Name: ${productData?.name || 'Enterprise Solution'}
Brief Description: ${briefInput || productData?.description || 'An enterprise software solution'}

Requirements:
- Write 2-3 compelling paragraphs
- Highlight business value and ROI
- Use professional but accessible language
- Focus on Saudi/Middle East enterprise market
- Include call-to-action phrases`;
        schema = {
          type: 'object',
          properties: {
            enhanced_description: { type: 'string' }
          }
        };
      } else if (type === 'features') {
        prompt = `Analyze this enterprise product and extract key features and benefits:
Product Name: ${productData?.name || 'Enterprise Solution'}
Description: ${briefInput || productData?.description || 'An enterprise software solution'}

Extract 5-8 key features/benefits. Each should be:
- Concise (2-5 words)
- Action or benefit oriented
- Suitable for enterprise software`;
        schema = {
          type: 'object',
          properties: {
            features: { type: 'array', items: { type: 'string' } }
          }
        };
      } else if (type === 'seo') {
        prompt = `Generate SEO metadata and keywords for this enterprise product:
Product Name: ${productData?.name || 'Enterprise Solution'}
Description: ${briefInput || productData?.description || 'An enterprise software solution'}

Generate:
1. SEO title (60 chars max)
2. Meta description (160 chars max)
3. 8-10 relevant keywords for Saudi/Middle East enterprise market`;
        schema = {
          type: 'object',
          properties: {
            seo_title: { type: 'string' },
            meta_description: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } }
          }
        };
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema
      });

      setResults(prev => ({ ...prev, [type]: response }));
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAll = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional product copywriter for Saudi Business Gate, an enterprise solutions company in Saudi Arabia.

Analyze and enhance this product:
Product Name: ${productData?.name || 'Enterprise Solution'}
Brief Description: ${briefInput || productData?.description || 'An enterprise software solution'}

Generate:
1. Enhanced description (2-3 compelling paragraphs)
2. 5-8 key features/benefits (concise, 2-5 words each)
3. SEO title (60 chars max)
4. Meta description (160 chars max)
5. 8-10 relevant keywords`,
        response_json_schema: {
          type: 'object',
          properties: {
            enhanced_description: { type: 'string' },
            features: { type: 'array', items: { type: 'string' } },
            seo_title: { type: 'string' },
            meta_description: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      setResults({
        description: { enhanced_description: response.enhanced_description },
        features: { features: response.features },
        seo: { seo_title: response.seo_title, meta_description: response.meta_description, keywords: response.keywords }
      });
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const applyToProduct = () => {
    const updates = {};
    if (results.description?.enhanced_description) {
      updates.description = results.description.enhanced_description;
    }
    if (results.features?.features) {
      updates.features = results.features.features;
    }
    onApply(updates);
  };

  const tabs = [
    { id: 'description', label: 'Description', icon: FileText },
    { id: 'features', label: 'Features', icon: Tags },
    { id: 'seo', label: 'SEO & Keywords', icon: Search }
  ];

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg">AI Product Enhancer</CardTitle>
          </div>
          <Button
            onClick={generateAll}
            disabled={isGenerating}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Generate All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Brief Input */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            Product Brief (AI will enhance this)
          </label>
          <Textarea
            value={briefInput}
            onChange={(e) => setBriefInput(e.target.value)}
            placeholder="Enter a brief product description or key points..."
            rows={2}
            className="bg-white border-violet-200"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-violet-200 pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-violet-600 text-white' 
                  : 'bg-white text-slate-600 hover:bg-violet-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {results[tab.id] && (
                <Check className="w-3 h-3 text-emerald-400" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[200px]">
          <AnimatePresence mode="wait">
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mb-3">
                  <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
                </div>
                <p className="text-violet-600 font-medium">AI is generating content...</p>
                <p className="text-sm text-slate-500">This may take a few seconds</p>
              </motion.div>
            )}

            {!isGenerating && activeTab === 'description' && (
              <motion.div
                key="description"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {results.description?.enhanced_description ? (
                  <div className="space-y-3">
                    <div className="bg-white border border-violet-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-violet-600">Enhanced Description</span>
                        <button
                          onClick={() => copyToClipboard(results.description.enhanced_description, 'desc')}
                          className="text-slate-400 hover:text-violet-600"
                        >
                          {copiedField === 'desc' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-slate-700 text-sm whitespace-pre-wrap">{results.description.enhanced_description}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Click "Generate All" or generate description</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => generateContent('description')}
                      className="mt-3 border-violet-200"
                    >
                      <Wand2 className="w-4 h-4 mr-1" /> Generate Description
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {!isGenerating && activeTab === 'features' && (
              <motion.div
                key="features"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {results.features?.features ? (
                  <div className="space-y-3">
                    <div className="bg-white border border-violet-200 rounded-xl p-4">
                      <span className="text-xs font-medium text-violet-600 mb-3 block">Extracted Features</span>
                      <div className="flex flex-wrap gap-2">
                        {results.features.features.map((feature, i) => (
                          <Badge key={i} className="bg-emerald-100 text-emerald-700 border-emerald-200">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Tags className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Click "Generate All" or extract features</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => generateContent('features')}
                      className="mt-3 border-violet-200"
                    >
                      <Wand2 className="w-4 h-4 mr-1" /> Extract Features
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {!isGenerating && activeTab === 'seo' && (
              <motion.div
                key="seo"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {results.seo?.keywords ? (
                  <div className="space-y-3">
                    <div className="bg-white border border-violet-200 rounded-xl p-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-violet-600">SEO Title</span>
                          <span className="text-xs text-slate-400">{results.seo.seo_title?.length || 0}/60</span>
                        </div>
                        <p className="text-slate-700 text-sm font-medium">{results.seo.seo_title}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-violet-600">Meta Description</span>
                          <span className="text-xs text-slate-400">{results.seo.meta_description?.length || 0}/160</span>
                        </div>
                        <p className="text-slate-700 text-sm">{results.seo.meta_description}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-violet-600 mb-2 block">Keywords</span>
                        <div className="flex flex-wrap gap-1.5">
                          {results.seo.keywords.map((kw, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-slate-300">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Click "Generate All" or generate SEO data</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => generateContent('seo')}
                      className="mt-3 border-violet-200"
                    >
                      <Wand2 className="w-4 h-4 mr-1" /> Generate SEO
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Apply Button */}
        {(results.description || results.features) && (
          <div className="flex justify-end pt-2 border-t border-violet-200">
            <Button onClick={applyToProduct} className="bg-emerald-600 hover:bg-emerald-700">
              <ArrowRight className="w-4 h-4 mr-2" />
              Apply to Product
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}