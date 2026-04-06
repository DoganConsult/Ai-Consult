import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Loader2, Copy, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ContentSummarizer({ content, title }) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateSummary = async () => {
    setIsLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `قم بتلخيص المحتوى التالي بشكل موجز واحترافي:

العنوان: ${title || 'محتوى'}

المحتوى:
${content}

قدم ملخصًا شاملاً يتضمن:
- النقاط الرئيسية (3-5 نقاط)
- الخلاصة في فقرة واحدة
- الكلمات المفتاحية

اكتب باللغة العربية بأسلوب احترافي.`,
        response_json_schema: {
          type: 'object',
          properties: {
            short_summary: { type: 'string', description: 'ملخص قصير في جملة واحدة' },
            main_points: { type: 'array', items: { type: 'string' }, description: 'النقاط الرئيسية' },
            detailed_summary: { type: 'string', description: 'ملخص تفصيلي' },
            keywords: { type: 'array', items: { type: 'string' }, description: 'الكلمات المفتاحية' }
          }
        }
      });
      
      setSummary(response);
      toast.success('تم إنشاء الملخص بنجاح');
    } catch (error) {
      toast.error('فشل في إنشاء الملخص');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    const text = `${summary.short_summary}\n\nالنقاط الرئيسية:\n${summary.main_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n${summary.detailed_summary}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('تم النسخ');
  };

  return (
    <div className="space-y-4">
      {!summary ? (
        <Button
          onClick={generateSummary}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              جاري إنشاء الملخص...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              إنشاء ملخص ذكي
            </>
          )}
        </Button>
      ) : (
        <Card className="p-6 space-y-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              الملخص الذكي
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="gap-2"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <p className="text-lg text-slate-800 font-medium mb-4">
              {summary.short_summary}
            </p>

            <div className="space-y-2 mb-4">
              <h4 className="font-semibold text-slate-900">النقاط الرئيسية:</h4>
              <ul className="space-y-2">
                {summary.main_points.map((point, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-purple-600 font-bold">{idx + 1}.</span>
                    <span className="text-slate-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-slate-900 mb-2">الملخص التفصيلي:</h4>
              <p className="text-slate-700 leading-relaxed">{summary.detailed_summary}</p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">الكلمات المفتاحية:</h4>
              <div className="flex flex-wrap gap-2">
                {summary.keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setSummary(null)}
            className="w-full"
          >
            إنشاء ملخص جديد
          </Button>
        </Card>
      )}
    </div>
  );
}