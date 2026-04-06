import pool from '../db/pool.js';
import { sendMail } from './graph.js';

const NOREPLY_PATTERNS = [
  /noreply/i, /no-reply/i, /donotreply/i, /mailer-daemon/i,
  /postmaster/i, /bounce/i, /notification/i, /alert/i,
  /microsoft\.com$/i, /google\.com$/i, /apple\.com$/i,
];

const COMPANY_DOMAIN = 'doganconsult.com';

function shouldSkip(fromEmail) {
  if (!fromEmail) return true;
  if (fromEmail.endsWith(`@${COMPANY_DOMAIN}`)) return true;
  return NOREPLY_PATTERNS.some(p => p.test(fromEmail));
}

function detectLang(text) {
  const arabicRatio = (text.match(/[\u0600-\u06FF]/g) || []).length / Math.max(text.length, 1);
  const turkishChars = (text.match(/[çğıöşüÇĞİÖŞÜ]/g) || []).length;
  if (arabicRatio > 0.2) return 'ar';
  if (turkishChars > 3) return 'tr';
  return 'en';
}

function categorize(subject, body) {
  const text = `${subject} ${body}`.toLowerCase();
  if (/proposal|rfp|tender|مناقصة|عرض/i.test(text)) return 'proposal';
  if (/consult|advisory|استشار/i.test(text)) return 'consultation';
  if (/partner|collaborat|شراك/i.test(text)) return 'partnership';
  if (/job|career|cv|resume|وظيف/i.test(text)) return 'careers';
  if (/complaint|issue|problem|شكو/i.test(text)) return 'complaint';
  if (/invoice|payment|فاتور/i.test(text)) return 'billing';
  if (/meet|appointment|اجتماع|موعد/i.test(text)) return 'meeting';
  return 'general';
}

function buildAutoReplyHtml(lang, senderName, category) {
  const templates = {
    ar: {
      greeting: `${senderName || ''} عزيزي/عزيزتي`,
      body: 'شكراً لتواصلكم مع دوغان كونسلت. تم استلام رسالتكم وسيقوم فريقنا المختص بمراجعتها والرد عليكم في أقرب وقت ممكن.',
      timeline: 'عادةً ما نرد خلال يوم عمل واحد.',
      regards: 'مع أطيب التحيات،<br>فريق دوغان كونسلت<br>استشارات هندسية في تقنيات المعلومات والاتصالات',
      title: 'تأكيد استلام رسالتكم',
      ref: 'مرجع التصنيف',
    },
    en: {
      greeting: `Dear ${senderName || 'Sir/Madam'}`,
      body: 'Thank you for contacting Dogan Consult. We have received your message and our team will review it and respond at the earliest opportunity.',
      timeline: 'We typically respond within one business day.',
      regards: 'Best regards,<br>Dogan Consult Team<br>ICT & Telecommunications Engineering Consulting',
      title: 'Message Received',
      ref: 'Reference Category',
    },
    tr: {
      greeting: `Sayın ${senderName || ''}`,
      body: 'Dogan Consult ile iletişime geçtiğiniz için teşekkür ederiz. Mesajınız alınmıştır ve ekibimiz en kısa sürede inceleyip size geri dönüş yapacaktır.',
      timeline: 'Genellikle bir iş günü içinde yanıt veririz.',
      regards: 'Saygılarımızla,<br>Dogan Consult Ekibi<br>BİT ve Telekomünikasyon Mühendislik Danışmanlığı',
      title: 'Mesajınız Alındı',
      ref: 'Referans Kategorisi',
    },
  };

  const t = templates[lang] || templates.en;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head><meta charset="utf-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;direction:${dir};background:#f3f4f6">
  <div style="background:linear-gradient(135deg,#2563eb,#1e40af);padding:32px 24px;text-align:center">
    <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
      <span style="color:white;font-size:28px;font-weight:bold">D</span>
    </div>
    <h2 style="color:white;margin:0;font-size:20px">${t.title}</h2>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Dogan Consult</p>
  </div>
  <div style="background:white;padding:32px 24px;border:1px solid #e5e7eb;border-top:none">
    <p style="font-size:16px;color:#111827;margin:0 0 16px">${t.greeting},</p>
    <p style="color:#374151;line-height:1.7;margin:0 0 12px">${t.body}</p>
    <p style="color:#6b7280;font-size:14px;margin:0 0 20px">${t.timeline}</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin:0 0 24px">
      <span style="color:#6b7280;font-size:12px">${t.ref}:</span>
      <span style="color:#2563eb;font-size:13px;font-weight:600;margin-${lang === 'ar' ? 'right' : 'left'}:8px">${category.toUpperCase()}</span>
    </div>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0">${t.regards}</p>
  </div>
  <div style="text-align:center;padding:16px;color:#9ca3af;font-size:12px">
    <p style="margin:0">doganconsult.com | Middle East &amp; International</p>
  </div>
</body></html>`;
}

export async function processIncomingEmail(message) {
  const fromAddr = message.from?.emailAddress?.address;
  const fromName = message.from?.emailAddress?.name || '';
  const subject = message.subject || '';
  const bodyPreview = message.bodyPreview || '';
  const messageId = message.id;

  if (shouldSkip(fromAddr)) {
    return { skipped: true, reason: 'noreply or internal' };
  }

  const existing = await pool.query(
    'SELECT id FROM agent_actions WHERE graph_message_id = $1', [messageId]
  );
  if (existing.rows.length > 0) {
    return { skipped: true, reason: 'already processed' };
  }

  const lang = detectLang(`${subject} ${bodyPreview}`);
  const category = categorize(subject, bodyPreview);
  const priority = ['proposal', 'complaint'].includes(category) ? 'high' : 'normal';

  const customRule = await pool.query(
    `SELECT * FROM auto_reply_rules WHERE is_active = true ORDER BY priority DESC`
  );

  let replyBody;
  let replySubject;

  const matchedRule = customRule.rows.find(rule => {
    if (rule.match_type === 'all') return true;
    if (rule.match_type === 'subject' && rule.match_pattern) {
      return new RegExp(rule.match_pattern, 'i').test(subject);
    }
    if (rule.match_type === 'from' && rule.match_pattern) {
      return new RegExp(rule.match_pattern, 'i').test(fromAddr);
    }
    if (rule.match_type === 'category' && rule.match_pattern) {
      return rule.match_pattern.toLowerCase() === category;
    }
    return false;
  });

  if (matchedRule?.exclude_pattern && new RegExp(matchedRule.exclude_pattern, 'i').test(fromAddr)) {
    replyBody = null;
  } else if (matchedRule) {
    replyBody = matchedRule.reply_body_template
      .replace('{{name}}', fromName)
      .replace('{{category}}', category)
      .replace('{{subject}}', subject);
    replySubject = (matchedRule.reply_subject_template || `Re: ${subject}`)
      .replace('{{subject}}', subject);
  } else {
    replyBody = buildAutoReplyHtml(lang, fromName, category);
    replySubject = lang === 'ar'
      ? `دوغان كونسلت - تأكيد استلام رسالتكم`
      : `Dogan Consult - Message Received`;
  }

  const actionResult = await pool.query(
    `INSERT INTO agent_actions
     (action_type, graph_message_id, from_email, to_email, subject, original_body, draft_body, category, priority, status, agent_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      'auto_reply', messageId, fromAddr, process.env.GRAPH_MAIL_FROM,
      subject, bodyPreview, replyBody, category, priority,
      replyBody ? 'sent' : 'skipped',
      `Lang: ${lang} | Category: ${category} | Rule: ${matchedRule?.name || 'default'}`,
    ]
  );

  if (replyBody) {
    try {
      await sendMail({ to: fromAddr, subject: replySubject, body: replyBody });

      await pool.query(
        `INSERT INTO email_log (direction, mail_to, mail_from, subject, graph_message_id, status, metadata)
         VALUES ('sent', $1, $2, $3, $4, 'sent', $5)`,
        [fromAddr, process.env.GRAPH_MAIL_FROM, replySubject, messageId,
         JSON.stringify({ type: 'auto_reply', category, lang, action_id: actionResult.rows[0].id })]
      );
    } catch (err) {
      await pool.query('UPDATE agent_actions SET status = $1, agent_notes = agent_notes || $2 WHERE id = $3',
        ['failed', ` | Send error: ${err.message}`, actionResult.rows[0].id]);
      console.error('Auto-reply send failed:', err.message);
    }
  }

  await pool.query(
    `INSERT INTO email_log (direction, mail_to, mail_from, subject, graph_message_id, status, metadata)
     VALUES ('received', $1, $2, $3, $4, 'processed', $5)`,
    [process.env.GRAPH_MAIL_FROM, fromAddr, subject, messageId,
     JSON.stringify({ category, lang, priority })]
  );

  return {
    actionId: actionResult.rows[0].id,
    category,
    lang,
    priority,
    autoReplied: !!replyBody,
  };
}
