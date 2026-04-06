import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe, SearchX, Lightbulb, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import PublicHeader from '@/components/shared/PublicHeader';
import SearchFilters from '@/components/search/SearchFilters';
import AISearchBar from '@/components/search/AISearchBar';
import AIRecommendations from '@/components/recommendations/AIRecommendations';

const iconMap = { Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe };

export default function Search() {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q') || '';
  const initialDomain = urlParams.get('domain') || 'all';

  const [domain, setDomain] = useState(initialDomain);
  const [sortBy, setSortBy] = useState('relevance');
  const [aiSearchResults, setAiSearchResults] = useState(null);
  const [aiInterpretation, setAiInterpretation] = useState(null);

  const handleAISearchResults = (results, interpretation) => {
    setAiSearchResults(results);
    setAiInterpretation(interpretation);
  };

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-search'],
    queryFn: () => base44.entities.Product.filter({ is_active: true })
  });

  const maxPrice = useMemo(() => {
    if (products.length === 0) return 500000;
    return Math.max(...products.map(p => p.price || 0), 500000);
  }, [products]);

  const [priceRange, setPriceRange] = useState([0, maxPrice]);

  // Update price range when maxPrice changes
  React.useEffect(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  const filteredProducts = useMemo(() => {
    // If AI search is active, use those results
    if (aiSearchResults !== null) {
      return aiSearchResults;
    }

    let result = products.filter(product => {
      // Text search
      const searchLower = query.toLowerCase();
      const matchesSearch = !query || 
        product.name?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        (product.features || []).some(f => f.toLowerCase().includes(searchLower));

      // Domain filter
      const matchesDomain = domain === 'all' || product.badge === domain || 
        product.name?.toLowerCase().includes(domain.toLowerCase()) ||
        product.description?.toLowerCase().includes(domain.toLowerCase());

      // Price filter
      const productPrice = product.price || 0;
      const matchesPrice = productPrice >= priceRange[0] && productPrice <= priceRange[1];

      return matchesSearch && matchesDomain && matchesPrice;
    });

    // Sort
    switch (sortBy) {
      case 'name_asc':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name_desc':
        result.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'price_asc':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        // relevance - keep original order
        break;
    }

    return result;
  }, [products, query, domain, priceRange, sortBy, aiSearchResults]);

  const activeFiltersCount = (domain !== 'all' ? 1 : 0) + 
    (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0) + 
    (sortBy !== 'relevance' ? 1 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <PublicHeader searchQuery={query} showBackButton={true} backLabel="Back to Home" />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* AI Search Bar */}
        <div className="mb-8">
          <AISearchBar onSearchResults={handleAISearchResults} products={products} />
        </div>

        {/* Results Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              {aiSearchResults !== null ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-emerald-500" />
                  AI Search Results
                </span>
              ) : query ? `Search results for "${query}"` : domain !== 'all' ? `${domain} Products` : 'All Products'}
            </h1>
          </div>
          <p className="text-slate-600">{filteredProducts.length} product(s) found</p>
        </div>

        {/* Filters */}
        <SearchFilters
          domain={domain}
          setDomain={setDomain}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          sortBy={sortBy}
          setSortBy={setSortBy}
          maxPrice={maxPrice}
          activeFiltersCount={activeFiltersCount}
        />

        {isLoading ? (
          <p className="text-slate-500">Loading...</p>
        ) : filteredProducts.length === 0 ? (
          <Card className="bg-white border-slate-200">
            <CardContent className="p-10 text-center">
              <SearchX className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-800 mb-2">No products found</h2>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                We couldn't find any products matching "<span className="font-medium text-slate-700">{query}</span>". 
                Try adjusting your search or explore our suggestions below.
              </p>
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 max-w-md mx-auto text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">Search Tips</span>
                </div>
                <ul className="text-sm text-emerald-700 space-y-2">
                  <li>• Try shorter or more general keywords</li>
                  <li>• Check for spelling errors</li>
                  <li>• Use product categories like "Robotics" or "AI"</li>
                  <li>• Search by features like "automation" or "ERP"</li>
                </ul>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                <span className="text-xs text-slate-500">Popular searches:</span>
                {['Autonomous Agents', 'Robotics', 'ERP', 'AI', 'Automation'].map(term => (
                  <Link 
                    key={term} 
                    to={createPageUrl('Search') + `?q=${encodeURIComponent(term)}`}
                    className="text-xs px-3 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 rounded-full transition-colors"
                  >
                    {term}
                  </Link>
                ))}
              </div>

              <Link to={createPageUrl('Home')} className="inline-block mt-6">
                                    <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                      Browse All Products
                                    </Button>
                                  </Link>
                                </CardContent>
                              </Card>
                            ) : aiSearchResults !== null && aiInterpretation?.matches ? (
                              <div className="space-y-6">
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {filteredProducts.map((product, index) => {
                                    const IconComponent = iconMap[product.icon] || Bot;
                                    const matchInfo = aiInterpretation.matches.find(m => m.id === product.id);
                                    return (
                                      <motion.div
                                        key={product.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                      >
                                        <Link to={createPageUrl('ProductDetail') + `?id=${product.id}`}>
                                          <Card className="bg-white border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all h-full cursor-pointer relative overflow-hidden">
                                            {matchInfo?.score >= 80 && (
                                              <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-emerald-600 text-white text-xs px-3 py-1 rounded-bl-lg">
                                                {matchInfo.score}% Match
                                              </div>
                                            )}
                                            <CardContent className="p-5">
                                              <div className={`w-12 h-12 bg-gradient-to-br ${product.gradient || 'from-emerald-600 to-teal-600'} rounded-xl flex items-center justify-center mb-4`}>
                                                <IconComponent className="w-6 h-6 text-white" />
                                              </div>
                                              <h3 className="font-bold text-slate-900 mb-1">{product.name}</h3>
                                              {product.price > 0 && (
                                                <p className="text-lg font-bold text-emerald-600 mb-2">{product.price.toLocaleString()} SAR</p>
                                              )}
                                              <p className="text-sm text-slate-600 line-clamp-2">{product.description}</p>
                                              {matchInfo?.reason && (
                                                <p className="text-xs text-violet-600 mt-3 flex items-start gap-1 bg-violet-50 p-2 rounded-lg">
                                                  <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
                                                  {matchInfo.reason}
                                                </p>
                                              )}
                                              {product.badge && (
                                                <Badge className="mt-3 bg-emerald-100 text-emerald-700 border-emerald-200">{product.badge}</Badge>
                                              )}
                                            </CardContent>
                                          </Card>
                                        </Link>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                                {/* AI Recommendations after search */}
                                <AIRecommendations title="You Might Also Like" maxItems={4} variant="compact" />
                              </div>
                            ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product, index) => {
              const IconComponent = iconMap[product.icon] || Bot;
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={createPageUrl('ProductDetail') + `?id=${product.id}`}>
                    <Card className="bg-white border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all h-full cursor-pointer">
                      <CardContent className="p-5">
                        <div className={`w-12 h-12 bg-gradient-to-br ${product.gradient || 'from-emerald-600 to-teal-600'} rounded-xl flex items-center justify-center mb-4`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1">{product.name}</h3>
                        {product.price > 0 && (
                          <p className="text-lg font-bold text-emerald-600 mb-2">{product.price.toLocaleString()} SAR</p>
                        )}
                        <p className="text-sm text-slate-600 line-clamp-2">{product.description}</p>
                        {product.badge && (
                          <Badge className="mt-3 bg-emerald-100 text-emerald-700 border-emerald-200">{product.badge}</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}