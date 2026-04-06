import React from 'react';
import { Filter, X, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const DOMAINS = [
  { value: 'all', label: 'All Domains' },
  { value: 'Procurement', label: 'Procurement' },
  { value: 'GRC', label: 'GRC' },
  { value: 'Finance', label: 'Finance' },
  { value: 'HR', label: 'HR' },
  { value: 'Sales', label: 'Sales' },
  { value: 'ServiceDesk', label: 'Service Desk' },
  { value: 'SupplyChain', label: 'Supply Chain' },
  { value: 'Robotics', label: 'Robotics' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'price_asc', label: 'Price (Low to High)' },
  { value: 'price_desc', label: 'Price (High to Low)' },
];

export default function SearchFilters({ 
  domain, 
  setDomain, 
  priceRange, 
  setPriceRange, 
  sortBy, 
  setSortBy,
  maxPrice,
  activeFiltersCount 
}) {
  const clearFilters = () => {
    setDomain('all');
    setPriceRange([0, maxPrice]);
    setSortBy('relevance');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="font-medium text-slate-900">Filters & Sort</span>
          {activeFiltersCount > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0">{activeFiltersCount} active</Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-slate-700">
            <X className="w-4 h-4 mr-1" /> Clear all
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Domain Filter */}
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Domain</label>
          <Select value={domain} onValueChange={setDomain}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Domains" />
            </SelectTrigger>
            <SelectContent>
              {DOMAINS.map(d => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Range */}
        <div className="sm:col-span-1 lg:col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">
            Price Range: {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()} SAR
          </label>
          <div className="px-2 pt-2">
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              max={maxPrice}
              min={0}
              step={1000}
              className="w-full"
            />
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Sort By</label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Relevance" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}