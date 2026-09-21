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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState('ALL')
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

  const filteredItems = materials.filter(item => {
    const brand = cleanText(item.footwear_brand).toLowerCase()
    const category = cleanText(item.footwear_category).toLowerCase()
    const material = cleanText(item.material).toLowerCase()
    const color = cleanText(item.color).toLowerCase()
    
    const query = searchQuery.toLowerCase()
    const matchesSearch = !query || brand.includes(query) || category.includes(query) || color.includes(query)
    const matchesMaterial = selectedMaterial === 'ALL' || material.includes(selectedMaterial.toLowerCase())

    return matchesSearch && matchesMaterial
  })

  const visibleItems = filteredItems.slice(0, displayCount)

  return (
    <div className="min-h-screen p-6 transition-colors duration-500" style={{ background: '#09090B', color: '#F4F0E8' }}>
      
      <header className="pb-4 pt-2 flex items-start justify-between">
        <button
          onClick={onBack}
          className="group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-0 bg-transparent cursor-pointer transition-colors"
          style={{ color: 'rgba(244, 240, 232, 0.5)' }}
        >
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>
      </header>

      <h1 className="font-serif text-3xl leading-none mb-2 tracking-tight">
        Каталог & База знаний
      </h1>
      <p className="text-xs opacity-50 mb-4 font-sans">Всего записей в Neon: {materials.length}</p>

      <div className="mb-4">
        <input 
          type="text"
          placeholder="Поиск по бренду, цвету, категории..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-[#D8A35C] transition-colors"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
        {['ALL', 'Rubber', 'Canvas', 'Knit', 'Mesh', 'Synthetic', 'Leather'].map((mat) => (
          <button
            key={mat}
            onClick={() => setSelectedMaterial(mat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans whitespace-nowrap transition-all border ${
              selectedMaterial === mat 
                ? 'bg-[#D8A35C] text-[#151210] border-[#D8A35C] font-medium' 
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
            }`}
          >
            {mat === 'ALL' ? 'Все материалы' : mat}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm opacity-50 animate-pulse py-10 text-center">Загрузка базы данных...</p>}
      
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-400 text-sm">
          Ошибка: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-4 pb-10">
          {visibleItems.length === 0 ? (
            <p className="text-center text-sm opacity-40 py-10">Ничего не найдено по вашему запросу</p>
          ) : (
            visibleItems.map((item, index) => {
              const brand = cleanText(item.footwear_brand)
              const category = cleanText(item.footwear_category)
              const material = cleanText(item.material)
              const color = cleanText(item.color)
              const size = cleanText(item.shoe_size)
              const price = cleanText(item.price)
              const discount = cleanText(item.discount_percent)
              const recommendation = cleanText(item.recommendation_label)
              
              let imageUrl = item.image_url ? String(item.image_url).trim() : ''
              if (imageUrl && !imageUrl.startsWith('data:image') && !imageUrl.startsWith('http')) {
                imageUrl = `data:image/png;base64,${imageUrl}`
              }
              const hasValidImage = imageUrl && imageUrl.length > 30
              
              // Жестко очищаем URL от скрытых переносов строк из CSV
              const productUrl = item.product_url ? String(item.product_url).replace(/\s+/g, '') : ''

              return (
                <div 
                  key={item.id || index} 
                  className="p-4 rounded-2xl border flex gap-4 items-center transition-all"
                  style={{ borderColor: 'rgba(244, 240, 232, 0.12)', background: '#141414' }}
                >
                  {hasValidImage ? (
                    <img 
                      src={imageUrl} 
                      alt={brand} 
                      className="w-20 h-20 object-cover rounded-xl bg-white/5 flex-shrink-0 border border-white/10"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-white/5 flex items-center justify-center text-[10px] opacity-40 uppercase flex-shrink-0 font-sans text-center px-1">
                      Нет фото
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div>
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
                        <span className="text-right truncate ml-2 text-[#D8A35C] font-medium">{material}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-0.5">
                        <span className="opacity-40 uppercase">Цвет</span>
                        <span className="text-right truncate ml-2">{color}</span>
                      </div>
                      {recommendation !== '-' && (
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                          <span className="opacity-40 uppercase">Статус</span>
                          <span className="text-right truncate ml-2 text-emerald-400">{recommendation}</span>
                        </div>
                      )}
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

                    {/* Чистая HTML-ссылка с защитой от блокировки (no-referrer) */}
                    {productUrl && productUrl.startsWith('http') && (
                      <a 
                        href={productUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                        className="mt-3 block w-full text-center py-1.5 rounded-lg bg-white/5 text-[10px] uppercase font-sans tracking-wider text-[#D8A35C] hover:bg-white/10 transition-colors border border-white/10"
                      >
                        Открыть товар на сайте →
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {displayCount < filteredItems.length && (
            <button
              onClick={() => setDisplayCount((prev) => prev + 30)}
              className="w-full py-3.5 rounded-xl border text-xs font-sans uppercase tracking-widest mt-2 transition-all active:scale-95"
              style={{ borderColor: 'rgba(244, 240, 232, 0.2)', background: 'transparent', color: '#F4F0E8' }}
            >
              Загрузить еще 30 ↓
            </button>
          )}
        </div>
      )}
    </div>
  )
}
