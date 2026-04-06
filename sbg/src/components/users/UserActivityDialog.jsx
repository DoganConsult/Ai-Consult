import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, Eye, MessageCircle, ShoppingCart } from 'lucide-react';

export default function UserActivityDialog({ user, sessions, onClose }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Activity: {user.full_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No activity recorded</p>
          ) : (
            sessions.map((session, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <Badge>{session.journey_stage || 'explorer'}</Badge>
                  <span className="text-sm text-slate-500">
                    {new Date(session.last_visit).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-slate-500">Time Spent</div>
                      <div className="font-medium">{Math.floor((session.time_spent_seconds || 0) / 60)}m</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-slate-500">Pages</div>
                      <div className="font-medium">{(session.pages_visited || []).length}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-slate-500">Products</div>
                      <div className="font-medium">{(session.products_viewed || []).length}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-slate-500">Chats</div>
                      <div className="font-medium">{(session.conversation_ids || []).length}</div>
                    </div>
                  </div>
                </div>

                {session.interests && session.interests.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {session.interests.map((interest, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}