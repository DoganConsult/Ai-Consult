import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Star, Clock, 
  Scale, Briefcase, Trash2, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

export default function ConversationSidebar({ 
  conversations, 
  activeId, 
  onSelect, 
  onNew, 
  onDelete,
  onToggleStar,
  isOpen,
  onClose 
}) {
  const starredConversations = conversations.filter(c => c.is_starred);
  const recentConversations = conversations.filter(c => !c.is_starred);

  const ConversationItem = ({ conversation }) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 ${
        activeId === conversation.id 
          ? 'bg-gradient-to-r from-blue-100 to-sky-100 border border-blue-200' 
          : 'hover:bg-slate-100'
      }`}
      onClick={() => onSelect(conversation)}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          conversation.mode === 'legal' 
            ? 'bg-blue-100 text-blue-600' 
            : 'bg-amber-100 text-amber-600'
        }`}>
          {conversation.mode === 'legal' ? <Scale className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {conversation.title || 'New Conversation'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {format(new Date(conversation.created_date), 'MMM d, h:mm a')}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStar(conversation); }}
            className="p-1 hover:bg-white rounded"
          >
            <Star className={`w-3.5 h-3.5 ${conversation.is_starred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(conversation.id); }}
            className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed lg:relative left-0 top-0 h-full w-72 bg-white border-r border-slate-200 z-50 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Conversations</h2>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <Button
              onClick={onNew}
              className="w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1 p-3">
            {starredConversations.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 px-2 mb-2">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Starred</span>
                </div>
                <div className="space-y-1">
                  {starredConversations.map(conv => (
                    <ConversationItem key={conv.id} conversation={conv} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 px-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Recent</span>
              </div>
              <div className="space-y-1">
                {recentConversations.length > 0 ? (
                  recentConversations.map(conv => (
                    <ConversationItem key={conv.id} conversation={conv} />
                  ))
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">
                    No conversations yet
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </motion.div>
    </>
  );
}