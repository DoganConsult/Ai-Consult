import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Wand2, Loader2, RefreshCw, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ContentGenerator() {
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState('article');
  const [tone, setTone] = useState('professional');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const contentTypes = {
    article: 'مقال',
    blog: 'تدوينة',
    product_description: 'وصف منتج',
    email: 'بريد إلكتروني',
    social_media: 'منشور وسائل تواصل',
    report: 'تقرير'
  };

  const tones = {
    professional: 'احترافي',
    friendly: 'ودي',
    formal: 'رسمي',
    creative: 'إبداعي',
    persuasive: 'إقناعي'
  };

  const generateContent = async () => {
    if (!topic.trim()) {
      toast.error('الرجاء إدخال الموضوع');
      return;
    }

    setIsLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `أنشئ محتوى ${contentTypes[contentType]} باللغة العربية بأسلوب ${tones[tone]}.

الموضوع: ${topic}

${additionalInfo ? `معلومات إضافية: ${additionalInfo}` : ''}

يجب أن يتضمن المحتوى:
- عنوان جذاب ومناسب
- مقدمة مشوقة
- محتوى منظم بشكل احترافي
- خاتمة قوية
- كلمات مفتاحية SEO

اكتب محتوى شامل وعالي الجودة.`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'العنوان' },
            introduction: { type: 'string', description: 'المقدمة' },
            main_content: { type: 'string', description: 'المحتوى الرئيسي' },
            conclusion: { type: 'string', description: 'الخاتمة' },
            seo_keywords: { type: 'array', items: { type: 'string' }, description: 'كلمات مفتاحية' },
            meta_description: { type: 'string', description: 'وصف ميتا' }
          }
        }
      });
      
      setGeneratedContent(response);
      toast.success('تم إنشاء المحتوى بنجاح');
    } catch (error) {
      toast.error('فشل في إنشاء المحتوى');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadContent = () => {
    const fullContent = `${generatedContent.title}\n\n${generatedContent.introduction}\n\n${generatedContent.main_content}\n\n${generatedContent.conclusion}\n\nكلمات مفتاحية: ${generatedContent.seo_keywords.join(', ')}`;
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedContent.title.substring(0, 30)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم التحميل');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-indigo-600" />
          مولد المحتوى الذكي
        </h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="topic">الموضوع *</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="مثال: أهمية الذكاء الاصطناعي في الأعمال"
              className="mt-1"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contentType">نوع المحتوى</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(contentTypes).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tone">الأسلوب</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tones).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="additionalInfo">معلومات إضافية (اختياري)</Label>
            <Textarea
              id="additionalInfo"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="أي تفاصيل إضافية أو متطلبات خاصة..."
              rows={3}
              className="mt-1"
            />
          </div>

          <Button
            onClick={generateContent}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                إنشاء المحتوى
              </>
            )}
          </Button>
        </div>
      </Card>

      {generatedContent && (
        <Card className="p-6 space-y-4 bg-white border-indigo-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">المحتوى المُنشأ</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGeneratedContent(null)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                جديد
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadContent}
              >
                <Download className="w-4 h-4 mr-2" />
                تحميل
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <h4 className="text-2xl font-bold text-indigo-900 mb-2">
                {generatedContent.title}
              </h4>
              <p className="text-sm text-slate-600">{generatedContent.meta_description}</p>
            </div>

            <div className="prose prose-slate max-w-none">
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <h5 className="font-semibold text-slate-900 mb-2">المقدمة</h5>
                <p className="text-slate-700 leading-relaxed">{generatedContent.introduction}</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200 mb-4">
                <h5 className="font-semibold text-slate-900 mb-2">المحتوى الرئيسي</h5>
                <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {generatedContent.main_content}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <h5 className="font-semibold text-slate-900 mb-2">الخاتمة</h5>
                <p className="text-slate-700 leading-relaxed">{generatedContent.conclusion}</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
              <h5 className="font-semibold text-slate-900 mb-2">كلمات مفتاحية SEO</h5>
              <div className="flex flex-wrap gap-2">
                {generatedContent.seo_keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}