import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { chat } from '../../services/claude.js';
import { sendMail } from '../../services/graph.js';

const router = Router();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/llm', async (req, res) => {
  try {
    const { prompt, messages, model } = req.body;
    const msgs = messages || [{ role: 'user', content: prompt || '' }];
    const result = await chat(msgs);
    res.json({ response: result.reply, usage: result.usage });
  } catch (err) {
    console.error('LLM error:', err.message);
    res.status(500).json({ error: 'LLM invocation failed' });
  }
});

router.post('/email', async (req, res) => {
  try {
    const { to, subject, body: emailBody } = req.body;
    await sendMail({ to, subject, body: emailBody });
    res.json({ success: true });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ error: 'Email send failed' });
  }
});

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const file_url = `/uploads/${req.file.filename}`;
  res.json({ file_url, filename: req.file.originalname, size: req.file.size });
});

export default router;
