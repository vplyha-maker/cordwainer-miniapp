// api/pdf.js
const pdfMemoryStore = globalThis.__cardioPdfStore || new Map();
globalThis.__cardioPdfStore = pdfMemoryStore;

export default async function handler(req, res) {
  // 1. GET-запрос: отдает готовый PDF-файл по прямой HTTPS-ссылке для скачивания на телефон
  if (req.method === 'GET') {
    const id = String(req.query?.id || '');
    const item = pdfMemoryStore.get(id);

    if (!item) {
      return res.status(404).send('PDF session expired. Please generate the catalog again.');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${item.fileName}"`);
    res.setHeader('Content-Length', String(item.buffer.length));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(item.buffer);
  }

  // 2. POST-запрос: принимает сгенерированный PDF, отправляет его в Telegram с запретом пересылки (protect_content: true)
  // и возвращает прямую HTTPS-ссылку для скачивания
  if (req.method === 'POST') {
    try {
      const { pdfBase64, fileName = 'CARDIO_LOOKBOOK_2026.pdf', chatId, caption } = req.body || {};
      if (!pdfBase64) {
        return res.status(400).json({ success: false, error: 'Missing pdfBase64' });
      }

      const cleanBase64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
      const buffer = Buffer.from(cleanBase64, 'base64');

      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      pdfMemoryStore.set(id, { buffer, fileName, createdAt: Date.now() });

      // Очистка старых файлов (храним не более 15 последних в памяти)
      if (pdfMemoryStore.size > 15) {
        const oldestKey = pdfMemoryStore.keys().next().value;
        if (oldestKey) pdfMemoryStore.delete(oldestKey);
      }

      let sentToTelegram = false;
      const botToken =
        process.env.TELEGRAM_BOT_TOKEN ||
        process.env.BOT_TOKEN ||
        process.env.TG_BOT_TOKEN ||
        process.env.VITE_BOT_TOKEN;

      if (botToken && chatId) {
        try {
          const form = new FormData();
          form.append('chat_id', String(chatId));
          form.append('protect_content', 'true'); // Запрет на пересылку и сохранение в Telegram
          if (caption) form.append('caption', String(caption));

          const blob = new Blob([buffer], { type: 'application/pdf' });
          form.append('document', blob, fileName);

          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
            method: 'POST',
            body: form,
          });
          const tgData = await tgRes.json();
          if (tgData?.ok) {
            sentToTelegram = true;
          }
        } catch {}
      }

      return res.status(200).json({
        success: true,
        sentToTelegram,
        downloadPath: `/api/pdf?id=${encodeURIComponent(id)}`,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
