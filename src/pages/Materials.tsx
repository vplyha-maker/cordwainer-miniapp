import { useEffect, useState } from 'react'

type MaterialsProps = {
  onBack?: () => void
}

function cleanText(text: any): string {
  if (!text) return '-'
  return String(text)
    .replace(/\[\/?span[^\]]*\]/g, '')
    .replace(/\(start_span\)/g, '')
    .replace(/\(end_span\)/g, '')
    .trim()
}

export default function Materials({ onBack }: MaterialsProps) {
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [displayCount, setDisplayCount] = useState(30)

  useEffect(() => {
    fetch('/api/get-materials')
      .then((res) => {
        if (!res.ok) throw new Error('Ошибка сервера')
        return res.json()
      })
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setMaterials(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  const visibleItems = materials.slice(0, displayCount)

  return (
    <div className="min-h-screen p-6 transition-colors duration-500" style={{ background: '#09090B', color: '#F4F0E8' }}>
      
      <header className="pb-6 pt-2 flex items-start justify-between">
        <button
          onClick={onBack}
          className="group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-0 bg-transparent cursor-pointer transition-colors"
          style={{ color: 'rgba(244, 240, 232, 0.5)' }}
        >
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>
      </header>

      <h1 className="font-serif text-4xl leading-none mb-6 tracking-tight">
        Каталог обуви & Картинки
      </h1>

      {loading && <p className="text-sm opacity-50 animate-pulse">Загрузка каталога из Neon...</p>}
      
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-400 text-sm">
          Ошибка: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-4 pb-10">
          {visibleItems.map((item, index) => {
            const brand = cleanText(item.footwear_brand)
            const category = cleanText(item.footwear_category)
            const material = cleanText(item.material)
            const color = cleanText(item.color)
            const size = cleanText(item.shoe_size)
            const price = cleanText(item.price)
            const discount = cleanText(item.discount_percent)
            
            // Проверка картинки
            let imageUrl = item.image_url ? String(item.image_url).trim() : ''
            if (imageUrl && !imageUrl.startsWith('data:image') && !imageUrl.startsWith('http')) {
              imageUrl = `data:image/png;base64,${imageUrl}`
            }
            const hasValidImage = imageUrl && imageUrl.length > 30

            return (
              <div 
                key={item.id || index} 
                className="p-4 rounded-2xl border flex gap-4 items-center transition-all"
                style={{ borderColor: 'rgba(244, 240, 232, 0.12)', background: '#141414' }}
              >
                {/* Картинка выводится только если она реально есть в базе */}
                {hasValidImage ? (
                  <img 
                    src={imageUrl} 
                    alt={brand} 
                    className="w-20 h-20 object-cover rounded-xl bg-white/5 flex-shrink-0 border border-white/10"
                    loading="lazy"
                    onError={(e) => {
                      // Скрываем элемент при ошибке загрузки base64
                      (e.target as HTMLElement.parentElement)?.style?.setProperty('display', 'none')
                    }}
                  />
                ) : null}

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      {/* Четкий вывод бренда и категории/модели */}
                      <h2 className="font-serif text-xl truncate">{brand !== '-' ? brand : 'Модель'}</h2>
                      <p className="text-[11px] opacity-60 font-sans truncate">{category}</p>
                    </div>
                    {size !== '-' && (
                      <span className="px-2 py-0.5 bg-white/10 rounded-lg text-[10px] font-mono whitespace-nowrap ml-2">
                        {size}p
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1 text-[11px] font-sans tracking-wide mt-2">
                    <div className="flex justify-between border-b border-white/5 pb-0.5">
                      <span className="opacity-40 uppercase">Материал</span>
                      <span className="text-right truncate ml-2">{material}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-0.5">
                      <span className="opacity-40 uppercase">Цвет</span>
                      <span className="text-right truncate ml-2">{color}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="opacity-40 uppercase">Цена</span>
                      <div className="text-right">
                        <span className="font-bold text-[#F4F0E8] text-sm">${price}</span>
                        {discount !== '-' && Number(discount) > 0 && (
                          <span className="ml-1.5 text-[9px] bg-red-900/40 text-red-300 px-1 py-0.5 rounded">
                            -{discount}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {displayCount < materials.length && (
            <button
              onClick={() => setDisplayCount((prev) => prev + 30)}
              className="w-full py-3.5 rounded-xl border text-xs font-sans uppercase tracking-widest mt-2 transition-all active:scale-95"
              style={{ borderColor: 'rgba(244, 240, 232, 0.2)', background: 'transparent', color: '#F4F0E8' }}
            >
              Загрузить еще 30 товаров ↓
            </button>
          )}
        </div>
      )}
    </div>
  )
}
