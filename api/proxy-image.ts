export default async function handler(req: any, res: any) {
  const { url } = req.query

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'No URL provided' })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://stockx.com/' // Маскируемся под сам StockX
      }
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image from source' })
    }

    const contentType = response.headers.get('content-type')
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    res.setHeader('Content-Type', contentType || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400') // Кэшируем на сутки
    
    return res.status(200).send(buffer)
  } catch (error) {
    console.error('[proxy-image-error]', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

