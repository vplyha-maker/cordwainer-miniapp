import { useEffect, useState } from 'react'

type MaterialsProps = {
  onBack?: () => void
}

// Функция для очистки текста от всяких мусорных тегов вроде [span_2] или (start_span)
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

  useEffect(() => {
    fetch('/api/get-materials')
      .then((res) => {
        if (!res.ok) throw new Error('Ошибка при загрузке данных с сервера')
        return res.json()
      })
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setMaterials(data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

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
        Каталог обуви & Материалы
      </h1>

      {loading && <p className="text-sm opacity-50 animate-pulse">Загрузка базы из Neon...</p>}
      
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-5 pb-10">
          {materials.map((item, index) => {
            const brand = cleanText(item.footwear_brand)
            const category = cleanText(item.footwear_category)
            const material = cleanText(item.material)
            const color = cleanText(item.color)
            const stock = cleanText(item.stock_status)
            const size = cleanText(item.shoe_size)
            const price = cleanText(item.price)
            const discount = cleanText(item.discount_percent)

            return (
              <div 
                key={item.id || index} 
                className="p-5 rounded-2xl border transition-all"
                style={{ borderColor: 'rgba(244, 240, 232, 0.12)', background: '#141414' }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h2 className="font-serif text-2xl">{brand}</h2>
                    <p className="text-xs opacity-60 font-sans">{category}</p>
                  </div>
                  {size !== '-' && (
                    <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs font-mono">
                      Размер: {size}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 text-xs font-sans tracking-wide mt-4">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="opacity-40 uppercase">Материал</span>
                    <span className="text-right ml-4 max-w-[60%]">{material}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="opacity-40 uppercase">Цвет</span>
                    <span className="text-right ml-4">{color}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="opacity-40 uppercase">Наличие</span>
                    <span className="text-right ml-4 text-emerald-400">{stock}</span>
                  </div>
                  <div className="flex justify-between mt-2 items-center">
                    <span className="opacity-40 uppercase">Цена</span>
                    <div className="text-right">
                      <span className="font-bold text-[#F4F0E8] text-base">${price}</span>
                      {discount !== '-' && Number(discount) > 0 && (
                        <span className="ml-2 text-[10px] bg-red-900/40 text-red-300 px-1.5 py-0.5 rounded">
                          -{discount}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
