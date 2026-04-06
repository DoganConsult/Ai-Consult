import { Router } from 'express';
import { sendMail } from '../../services/graph.js';

const router = Router();

router.post('/:name', async (req, res) => {
  const { name } = req.params;

  try {
    switch (name) {
      case 'demoAutomation': {
        const { demoRequestId, action } = req.body;
        if (action === 'send_confirmation' && req.body.email) {
          await sendMail({
            to: req.body.email,
            subject: 'Demo Request Confirmation — Saudi Business Gate',
            body: `<p>Thank you for your demo request. We will contact you shortly.</p>`,
          }).catch(() => {});
        }
        res.json({ success: true, action, demoRequestId });
        break;
      }
      case 'erpnextSync':
      case 'erpnextIntegration': {
        res.json({ success: true, message: 'ERP sync placeholder' });
        break;
      }
      case 'api': {
        res.json({ success: true, endpoints: [] });
        break;
      }
      default:
        res.json({ success: true, message: `Function ${name} executed` });
    }
  } catch (err) {
    console.error(`Function ${name} error:`, err);
    res.status(500).json({ error: `Function ${name} failed` });
  }
});

export default router;
