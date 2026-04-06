import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  X, Star, Download, Check, ShoppingCart, Shield, Calculator, Users, Bot, 
  HeadphonesIcon, User, MessageSquare, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AGENT_ICONS = {
  procurement: ShoppingCart,
  grc: Shield,
  financial: Calculator,
  hr: Users,
  robotics: Bot,
  service_desk: HeadphonesIcon,
};

const AGENT_COLORS = {
  procurement: 'from-blue-500 to-indigo-600',
  grc: 'from-emerald-500 to-teal-600',
  financial: 'from-amber-500 to-orange-600',
  hr: 'from-pink-500 to-rose-600',
  robotics: 'from-violet-500 to-purple-600',
  service_desk: 'from-cyan-500 to-sky-600',
};

export default function MarketplaceItemDetail({ item, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: reviews = [] } = useQuery({
    queryKey: ['marketplace-reviews', item.id],
    queryFn: () => base44.entities.MarketplaceReview.filter({ item_id: item.id }, '-created_date')
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.MarketplaceItem.update(item.id, { downloads: (item.downloads || 0) + 1 });
      // Create AgentConfig from marketplace item
      await base44.entities.AgentConfig.create({
        ...item.config_data,
        name: `${item.title} (from Marketplace)`,
        agent_type: item.agent_type,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-items'] });
      queryClient.invalidateQueries({ queryKey: ['agent-configs'] });
      alert('Configuration installed successfully! Go to Agent Configuration to customize it.');
    }
  });

  const reviewMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.MarketplaceReview.create({
        item_id: item.id,
        ...data,
        reviewer_name: user?.full_name || 'Anonymous',
        reviewer_email: user?.email || ''
      });
      // Update average rating
      const allReviews = [...reviews, data];
      const avgRating = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;
      await base44.entities.MarketplaceItem.update(item.id, { 
        avg_rating: avgRating,
        rating_count: allReviews.length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-reviews', item.id] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-items'] });
      setReviewForm({ rating: 5, title: '', comment: '' });
    }
  });

  const Icon = AGENT_ICONS[item.agent_type] || Shield;
  const gradient = AGENT_COLORS[item.agent_type] || 'from-slate-500 to-slate-600';

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-4 md:inset-10 bg-white rounded-2xl z-50 flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900">{item.title}</h2>
                {item.is_verified && (
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              {item.title_ar && <p className="text-slate-500" dir="rtl">{item.title_ar}</p>}
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  {(item.avg_rating || 0).toFixed(1)} ({item.rating_count || 0} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <Download className="w-4 h-4" /> {item.downloads || 0} downloads
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" /> {item.author_name || 'SBG Community'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => downloadMutation.mutate()} 
              disabled={downloadMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {downloadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              {item.price > 0 ? `Install (${item.price} SAR)` : 'Install Free'}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="config">Configuration</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
                      <p className="text-slate-600 whitespace-pre-wrap">{item.description}</p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {(item.tags || []).map((tag, i) => (
                          <Badge key={i} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-slate-900 mb-3">Includes</h4>
                        <ul className="space-y-2 text-sm text-slate-600">
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500" />
                            Risk & Approval Settings
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500" />
                            {(item.config_data?.escalation_rules || []).length} Custom Rules
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500" />
                            {(item.config_data?.custom_workflows || []).length} Workflows
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500" />
                            {(item.config_data?.compliance_checks || []).length} Compliance Checks
                          </li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-slate-900 mb-3">Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Agent Type</span>
                            <span className="font-medium">{item.agent_type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Category</span>
                            <span className="font-medium">{item.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Published</span>
                            <span className="font-medium">{new Date(item.created_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="config">
                <Card>
                  <CardContent className="p-4">
                    <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-auto max-h-96">
                      {JSON.stringify(item.config_data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    {reviews.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="p-8 text-center text-slate-500">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          No reviews yet. Be the first to review!
                        </CardContent>
                      </Card>
                    ) : (
                      reviews.map((review) => (
                        <Card key={review.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-slate-900">{review.title || 'Review'}</p>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
                                  ))}
                                </div>
                              </div>
                              <span className="text-xs text-slate-500">{new Date(review.created_date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-slate-600">{review.comment}</p>
                            <p className="text-xs text-slate-400 mt-2">— {review.reviewer_name}</p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium text-slate-900 mb-3">Write a Review</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-slate-500">Rating</label>
                          <div className="flex gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <button key={s} onClick={() => setReviewForm({ ...reviewForm, rating: s })}>
                                <Star className={`w-6 h-6 ${s <= reviewForm.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <Input
                          placeholder="Review title"
                          value={reviewForm.title}
                          onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                        />
                        <Textarea
                          placeholder="Share your experience..."
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                          rows={3}
                        />
                        <Button 
                          onClick={() => reviewMutation.mutate(reviewForm)} 
                          disabled={reviewMutation.isPending}
                          className="w-full"
                        >
                          {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Submit Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </motion.div>
    </>
  );
}