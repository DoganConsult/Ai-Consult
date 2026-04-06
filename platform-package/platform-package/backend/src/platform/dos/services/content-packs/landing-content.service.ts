// @ts-nocheck
// ============================================
// Shahin — Landing Content Service
// Fetches pain points and chart data from DB
// for the public landing page
// ============================================

import { safeQuery } from "../../../../config/database";
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

export interface PainPoint {
  icon: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  vizType: string;
}

export interface CapabilityMeta {
  content_id: string;
  icon: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  category: 'core' | 'advanced' | 'premium' | 'ai';
  relevanceTags: string[];
  detailContent: { en: string; ar: string };
  route: string;
}

export interface ChartData {
  donutSegments?: { label: string; value: number; color: string }[];
  sparkline?: number[];
}

export interface PainResult {
  textAr: string;
  textEn: string;
}

// ── Static fallbacks (used when DB is unavailable) ──
const FALLBACK_PAIN_POINTS: PainPoint[] = [
  { icon: 'pi-calendar', titleAr: 'سباق التدقيق السنوي', titleEn: 'The Annual Audit Race', descAr: 'الامتثال يتحول لمشروع طوارئ قبل كل تدقيق — ثم يعود كل شيء كما كان.', descEn: 'Compliance becomes an emergency project before every audit — then everything goes back to how it was.', vizType: 'gauge' },
  { icon: 'pi-copy', titleAr: 'تكرار الأطر والضوابط', titleEn: 'Duplicate Frameworks & Controls', descAr: 'NCA ECC + SAMA CSF + ISO 27001 — نفس الضابط بثلاث صيغ، ولا ربط بينها.', descEn: 'NCA ECC + SAMA CSF + ISO 27001 — same control in three formats, with no link between them.', vizType: 'donut' },
  { icon: 'pi-folder-open', titleAr: 'أدلة مبعثرة في كل مكان', titleEn: 'Evidence Scattered Everywhere', descAr: 'ملفات Excel، إيميلات، محادثات مشتركة — كل تدقيق يبدأ بالبحث عن الأدلة من الصفر.', descEn: 'Excel files, emails, shared chats — every audit starts by searching for evidence from scratch.', vizType: 'sparkline' },
  { icon: 'pi-users', titleAr: 'كل شيء يعتمد على أشخاص', titleEn: 'Everything Depends on People', descAr: 'غاب شخص واحد؟ ضاعت العملية. لا أتمتة، لا تصعيد تلقائي، لا مسار واضح.', descEn: 'One person absent? The process is lost. No automation, no escalation, no clear path.', vizType: 'ring' },
  { icon: 'pi-clock', titleAr: 'المخاطر تُكتشف بعد فوات الأوان', titleEn: 'Risks Discovered Too Late', descAr: 'سجل المخاطر يُحدّث مرة بالسنة. لا تنبيهات، لا مؤشرات مبكرة، لا ربط بالضوابط.', descEn: 'Risk register updated once a year. No alerts, no early indicators, no link to controls.', vizType: 'sparkline' },
  { icon: 'pi-sync', titleAr: 'لا دورة حياة حقيقية', titleEn: 'No Real Lifecycle', descAr: 'الضوابط "مطبّقة" على الورق فقط. لا تتبع، لا مراجعة دورية، لا تحديث.', descEn: 'Controls are "applied" on paper only. No tracking, no periodic review, no updates.', vizType: 'ring' },
];

const FALLBACK_CHART_DATA: ChartData = {
  donutSegments: [
    { label: 'Excel', value: 30, color: '#ef4444' },
    { label: 'Email', value: 25, color: '#f59e0b' },
    { label: 'SharePoint', value: 20, color: '#3b82f6' },
    { label: 'Paper', value: 15, color: '#8b5cf6' },
    { label: 'Other', value: 10, color: '#94a3b8' },
  ],
  sparkline: [42, 40, 43, 41, 39, 42, 40, 38, 41, 40, 39, 42],
};

const FALLBACK_RESULT: PainResult = {
  textAr: 'النتيجة: امتثال شكلي، إرهاق الفرق، وخطر تنظيمي مستمر.',
  textEn: 'The result: cosmetic compliance, team burnout, and ongoing regulatory risk.',
};

/** Fetch pain points from DB with static fallback */
export async function getPainPoints(): Promise<PainPoint[]> {
  try {
    const result = await safeQuery(
      `SELECT data FROM landing_content WHERE section = 'pain_points' AND active = TRUE ORDER BY sort_order`
    );
    if (result.rows.length > 0) {
      return result.rows.map((r: GenericRow) => r.data as PainPoint);
    }
  } catch { /* DB unavailable */ }
  return FALLBACK_PAIN_POINTS;
}

/** Fetch chart data from DB with static fallback */
export async function getChartData(): Promise<ChartData> {
  try {
    const result = await safeQuery(
      `SELECT data FROM landing_content WHERE section = 'chart_data' AND active = TRUE ORDER BY sort_order`
    );
    if (result.rows.length > 0) {
      const chartData: ChartData = {};
      for (const row of result.rows) {
        const d = row.data;
        if (d.chartType === 'donut' && d.segments) chartData.donutSegments = d.segments;
        if (d.chartType === 'sparkline' && d.values) chartData.sparkline = d.values;
      }
      return chartData;
    }
  } catch { /* DB unavailable */ }
  return FALLBACK_CHART_DATA;
}

/** Fetch result banner from DB with static fallback */
export async function getPainResult(): Promise<PainResult> {
  try {
    const result = await safeQuery(
      `SELECT data FROM landing_content WHERE section = 'pain_result' AND active = TRUE ORDER BY sort_order LIMIT 1`
    );
    if (result.rows.length > 0) {
      return getFirstRow(result)?.data as PainResult;
    }
  } catch { /* DB unavailable */ }
  return FALLBACK_RESULT;
}

/** Fetch capabilities with extended metadata from DB */
export async function getCapabilities(): Promise<CapabilityMeta[]> {
  try {
    const result = await safeQuery(
      `SELECT content_id, icon, title_en, title_ar, desc_en, desc_ar, chart_data
       FROM landing_content WHERE section = 'capabilities' AND active = TRUE ORDER BY sort_order`
    );
    if (result.rows.length > 0) {
      return result.rows.map((r: GenericRow) => {
        const meta = typeof r.chart_data === 'string' ? JSON.parse(r.chart_data) : (r.chart_data || {});
        return {
          content_id: r.content_id,
          icon: r.icon,
          titleEn: r.title_en,
          titleAr: r.title_ar,
          descEn: r.desc_en,
          descAr: r.desc_ar,
          category: meta.category || 'core',
          relevanceTags: meta.relevanceTags || [],
          detailContent: meta.detailContent || { en: '', ar: '' },
          route: meta.route || '',
        };
      });
    }
  } catch { /* DB unavailable */ }
  return [];
}

/** Get all landing pain content in one call */
export async function getLandingPainContent(): Promise<{
  painPoints: PainPoint[];
  chartData: ChartData;
  painResult: PainResult;
  capabilities: CapabilityMeta[];
}> {
  const [painPoints, chartData, painResult, capabilities] = await Promise.all([
    getPainPoints(),
    getChartData(),
    getPainResult(),
    getCapabilities(),
  ]);
  return { painPoints, chartData, painResult, capabilities };
}
