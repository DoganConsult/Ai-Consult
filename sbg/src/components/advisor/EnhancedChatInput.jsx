import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Scale, Briefcase, Paperclip, X, FileText, 
  Image, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

export default function EnhancedChatInput({ 
  onSendMessage, 
  isLoading, 
  mode,
  onModeChange,
  disabled 
}) {
  const [inputValue, setInputValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!inputValue.trim() && attachedFiles.length === 0) || isLoading) return;

    const fileUrls = attachedFiles.map(f => f.url);
    onSendMessage(inputValue, fileUrls);
    setInputValue('');
    setAttachedFiles([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachedFiles(prev => [...prev, {
        name: file.name,
        type: file.type,
        url: file_url
      }]);
    }
    
    setIsUploading(false);
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return Image;
    return FileText;
  };

  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => onModeChange('business')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              mode === 'business' 
                ? 'bg-white shadow-sm text-amber-700' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Business
          </button>
          <button
            type="button"
            onClick={() => onModeChange('legal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              mode === 'legal' 
                ? 'bg-white shadow-sm text-blue-700' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Scale className="w-4 h-4" />
            Legal
          </button>
        </div>
        
        <Badge className={`${mode === 'legal' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
          <Sparkles className="w-3 h-3 mr-1" />
          {mode === 'legal' ? 'Legal Research Mode' : 'Business Strategy Mode'}
        </Badge>
      </div>

      {/* Attached Files */}
      <AnimatePresence>
        {attachedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {attachedFiles.map((file, index) => {
              const FileIcon = getFileIcon(file.type);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2"
                >
                  <FileIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800 max-w-[150px] truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300 transition-all">
          {/* File Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || disabled}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          {/* Text Input */}
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'legal' 
              ? "Ask for legal research, case analysis, or compliance guidance..." 
              : "Ask for business strategy, growth tips, or market insights..."
            }
            className="flex-1 min-h-[44px] max-h-[200px] border-0 focus-visible:ring-0 resize-none bg-transparent"
            disabled={isLoading || disabled}
            rows={1}
          />

          {/* Send Button */}
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || (!inputValue.trim() && attachedFiles.length === 0) || disabled}
            className="bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-xl h-10 w-10 shadow-md"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center"
          >
            <div className="flex items-center gap-2 text-blue-600">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full"
              />
              <span className="text-sm font-medium">Uploading...</span>
            </div>
          </motion.div>
        )}
      </form>
    </div>
  );
}