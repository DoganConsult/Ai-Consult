import { sendMail } from './graph.js';

function consultationConfirmationHtml(data) {
  const isAr = data.lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const title = isAr ? 'تأكيد استلام طلبكم' : 'Consultation Request Received';
  const greeting = isAr ? `${data.name} عزيزي/عزيزتي` : `Dear ${data.name}`;
  const body = isAr
    ? 'شكراً لتواصلكم مع دوغان كونسلت. تم استلام طلبكم وسيقوم فريقنا بالتواصل معكم خلال 24 ساعة.'
    : 'Thank you for contacting Dogan Consult. Your request has been received and our team will contact you within 24 hours.';
  const regards = isAr ? 'مع أطيب التحيات،<br>فريق دوغان كونسلت' : 'Best regards,<br>Dogan Consult Team';

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${data.lang || 'en'}">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;direction:${dir}">
  <div style="background:linear-gradient(135deg,#2563eb,#1e40af);padding:24px;border-radius:12px 12px 0 0;text-align:center">
    <span style="color:white;font-size:28px;font-weight:bold">D</span>
    <h2 style="color:white;margin:8px 0 0">${title}</h2>
  </div>
  <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:16px">${greeting},</p>
    <p>${body}</p>
    <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:4px 0"><strong>${isAr ? 'النوع' : 'Type'}:</strong> ${data.type}</p>
      ${data.organization ? `<p style="margin:4px 0"><strong>${isAr ? 'المؤسسة' : 'Organization'}:</strong> ${data.organization}</p>` : ''}
      ${data.serviceArea ? `<p style="margin:4px 0"><strong>${isAr ? 'مجال الاهتمام' : 'Area'}:</strong> ${data.serviceArea}</p>` : ''}
    </div>
    <p style="color:#6b7280;font-size:14px">${regards}</p>
  </div>
</body></html>`;
}

function internalNotificationHtml(data) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#1e40af">New Consultation Request</h2>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Type</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${data.type}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Name</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${data.name}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Email</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${data.email}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Organization</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${data.organization || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Service Area</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${data.serviceArea || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Language</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${data.lang || 'ar'}</td></tr>
    <tr><td style="padding:8px;font-weight:bold">Message</td><td style="padding:8px">${data.message || '-'}</td></tr>
  </table>
</body></html>`;
}

export async function notifyConsultation(data) {
  const notifyTo = process.env.GRAPH_MAIL_NOTIFY;
  const isAr = data.lang === 'ar';

  try {
    await sendMail({
      to: data.email,
      subject: isAr ? 'دوغان كونسلت - تأكيد استلام طلبكم' : 'Dogan Consult - Consultation Request Received',
      body: consultationConfirmationHtml(data),
    });
  } catch (err) {
    console.error('Failed to send client confirmation:', err.message);
  }

  if (notifyTo) {
    try {
      await sendMail({
        to: notifyTo,
        subject: `[New ${data.type}] ${data.name} — ${data.organization || 'N/A'}`,
        body: internalNotificationHtml(data),
      });
    } catch (err) {
      console.error('Failed to send internal notification:', err.message);
    }
  }
}
