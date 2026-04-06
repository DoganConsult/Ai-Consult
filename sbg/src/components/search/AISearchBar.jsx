import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Sparkles, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function AISearchBar({ onSearchResults, products = [] }) {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiInterpretation, setAiInterpretation] = useState(null);

  const handleAISearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || products.length === 0) return;

    setIsProcessing(true);
    setAiInterpretation(null);

    try {
      const productList = products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price || 0,
        features: p.features || [],
        badge: p.badge
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a product search assistant for Saudi Business Gate, an enterprise solutions company.

User query: "${query}"

Available products:
${JSON.stringify(productList, null, 2)}

Analyze the user's natural language query and return matching product IDs with relevance scores.
Consider:
- Price constraints (e.g., "under 500 SAR", "cheap", "expensive")
- Performance keywords (e.g., "high-performance", "fast", "powerful")
- Category/type mentions (e.g., "router", "AI", "automation", "robotics")
- Feature requirements (e.g., "real-time", "enterprise", "secure")
- Use cases (e.g., "for small business", "enterprise grade")

Return a JSON object with:
- interpretation: Brief explanation of what you understood from the query
- filters: Object with extracted filters (priceMax, priceMin, keywords, category)
- matches: Array of {id, score, reason} for matching products (score 0-100)
- suggestion: A helpful suggestion if no good matches found`,
        response_json_schema: {
          type: "object",
          properties: {
            interpretation: { type: "string" },
            filters: {
              type: "object",
              properties: {
                priceMax: { type: "number" },
                priceMin: { type: "number" },
                keywords: { type: "array", items: { type: "string" } },
                category: { type: "string" }
              }
            },
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  score: { type: "number" },
                  reason: { type: "string" }
                }
              }
            },
            suggestion: { type: "string" }
          }
        }
      });

      setAiInterpretation(result);
      
      // Sort products by AI match score
      const matchedIds = new Map(result.matches?.map(m => [m.id, m]) || []);
      const sortedProducts = [...products]
        .filter(p => matchedIds.has(p.id))
        .sort((a, b) => (matchedIds.get(b.id)?.score || 0) - (matchedIds.get(a.id)?.score || 0));

      onSearchResults(sortedProducts, result);
    } catch (error) {
      console.error('AI search failed:', error);
      // Fallback to basic search
      const filtered = products.filter(p => 
        p.name?.toLowerCase().includes(query.toLowerCase()) ||
        p.description?.toLowerCase().includes(query.toLowerCase())
      );
      onSearchResults(filtered, null);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setAiInterpretation(null);
    onSearchResults(null, null);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleAISearch} className="relative">
        <div className="relative flex items-center">
          <Sparkles className="absolute left-4 w-5 h-5 text-emerald-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: 'Show me AI solutions under 100K SAR' or 'best automation tools for HR'"
            className="w-full pl-12 pr-24 py-4 text-base border-2 border-emerald-200 rounded-2xl bg-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 shadow-sm"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-24 p-1 hover:bg-slate-100 rounded-full"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <Button
            type="submit"
            disabled={isProcessing || !query.trim()}
            className="absolute right-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl px-4"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </form>

      <AnimatePresence>
        {aiInterpretation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-800">AI Understanding</p>
                <p className="text-sm text-slate-600 mt-1">{aiInterpretation.interpretation}</p>
                {aiInterpretation.filters && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {aiInterpretation.filters.priceMax && (
                      <span className="text-xs bg-white px-2 py-1 rounded-full border border-emerald-200">
                        Max: {aiInterpretation.filters.priceMax.toLocaleString()} SAR
                      </span>
                    )}
                    {aiInterpretation.filters.keywords?.map((kw, i) => (
                      <span key={i} className="text-xs bg-white px-2 py-1 rounded-full border border-emerald-200">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
                {aiInterpretation.matches?.length === 0 && aiInterpretation.suggestion && (
                  <p className="text-sm text-amber-700 mt-2 bg-amber-50 p-2 rounded-lg">
                    💡 {aiInterpretation.suggestion}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}