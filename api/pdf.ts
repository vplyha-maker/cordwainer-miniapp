// api/pdf.ts

type StoredPdfItem = {
  buffer: Uint8Array;
  fileName: string;
  createdAt: number;
};

type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: {
    pdfBase64?: string;
    fileName?: string;
    chatId?: number | string;
    caption?: string;
  };
};

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    send: (body: unknown) => void;
    json: (data: Record<string, unknown>) => void;
  };
};

const globalStore = globalThis as unknown as {
  __cardioPdfStore?: Map<string, StoredPdfItem>;
};

const pdfMemoryStore: Map<string, StoredPdfItem> =
  globalStore.__cardioPdfStore || new Map<string, StoredPdfItem>();
globalStore.__cardioPdfStore = pdfMemoryStore;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

function decodeBase64ToBytes(base64: string): Uint8Array {
  const clean = base64.includes(',') ? base64.split(',')[1] : base64;
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(clean, 'base64'));
  }
  const binaryString = atob(clean);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // 1. GET-запрос: отдает готовый PDF-файл по прямой HTTPS-ссылке для скачивания на телефон
  if (req.method === 'GET') {
    const rawId = req.query?.id;
    const id = Array.isArray(rawId) ? rawId[0] : String(rawId || '');
    const item = pdfMemoryStore.get(id);

    if (!item) {
      return res
        .status(404)
        .send('PDF session expired. Please generate the catalog again.');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${item.fileName}"`
    );
    res.setHeader('Content-Length', String(item.buffer.byteLength));
    res.setHeader('Cache-Control', 'no-store');

    const output =
      typeof Buffer !== 'undefined' ? Buffer.from(item.buffer) : item.buffer;
    return res.status(200).send(output);
  }

  // 2. POST-запрос: принимает PDF, отправляет его в Telegram с запретом пересылки (protect_content: true)
  // и возвращает прямую HTTPS-ссылку для скачивания
  if (req.method === 'POST') {
    try {
      const {
        pdfBase64,
        fileName = 'CARDIO_LOOKBOOK_2026.pdf',
        chatId,
        caption,
      } = req.body || {};

      if (!pdfBase64) {
        return res
          .status(400)
          .json({ success: false, error: 'Missing pdfBase64' });
      }

      const bytes = decodeBase64ToBytes(pdfBase64);
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      pdfMemoryStore.set(id, {
        buffer: bytes,
        fileName,
        createdAt: Date.now(),
      });

      // Храним в памяти не более 15 последних файлов
      if (pdfMemoryStore.size > 15) {
        const oldestKey = pdfMemoryStore.keys().next().value;
        if (oldestKey) pdfMemoryStore.delete(oldestKey);
      }

      let sentToTelegram = false;
      const env =
        (typeof process !== 'undefined' ? process.env : {}) as Record<
          string,
          string | undefined
        >;

      const botToken =
        env.TELEGRAM_BOT_TOKEN ||
        env.BOT_TOKEN ||
        env.TG_BOT_TOKEN ||
        env.VITE_BOT_TOKEN;

      if (botToken && chatId) {
        try {
          const form = new FormData();
          form.append('chat_id', String(chatId));
          form.append('protect_content', 'true'); // Аппаратный запрет на пересылку и сохранение в Telegram
          if (caption) form.append('caption', String(caption));

          const blob = new Blob([bytes.buffer as ArrayBuffer], {
            type: 'application/pdf',
          });
          form.append('document', blob, fileName);

          const tgRes = await fetch(
            `https://api.telegram.org/bot${botToken}/sendDocument`,
            {
              method: 'POST',
              body: form,
            }
          );
          const tgData = (await tgRes.json()) as { ok?: boolean };
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
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

