import { useEffect, useState } from 'react'

type MaterialsProps = {
  onBack?: () => void
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
          {materials.map((item, index) => (
            <div 
              key={item.id || index} 
              className="p-5 rounded-2xl border transition-all"
              style={{ borderColor: 'rgba(244, 240, 232, 0.12)', background: '#141414' }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="font-serif text-2xl">{item.footwear_brand || 'Бренд не указан'}[span_2](start_span)[span_2](end_span)</h2>
                  <p className="text-xs opacity-60 font-sans">{item.footwear_category || 'Категория не указана'}[span_3](start_span)[span_3](end_span)</p>
                </div>
                {item.shoe_size && (
                  <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs font-mono">
                    Размер: {item.shoe_size}[span_4](start_span)[span_4](end_span)
                  </span>
                )}
              </div>
              
              <div className="flex flex-col gap-2 text-xs font-sans tracking-wide mt-4">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="opacity-40 uppercase">Материал</span>
                  <span className="text-right ml-4 max-w-[60%]">{item.material || '-'}[span_5](start_span)[span_5](end_span)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="opacity-40 uppercase">Цвет</span>
                  <span className="text-right ml-4">{item.color || '-'}[span_6](start_span)[span_6](end_span)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="opacity-40 uppercase">Наличие</span>
                  <span className="text-right ml-4 text-emerald-400">{item.stock_status || '-'}[span_7](start_span)[span_7](end_span)</span>
                </div>
                <div className="flex justify-between mt-2 items-center">
                  <span className="opacity-40 uppercase">Цена</span>
                  <div className="text-right">
                    <span className="font-bold text-[#F4F0E8] text-base">${item.price || '0'}</span>[span_8](start_span)[span_8](end_span)
                    {item.discount_percent && Number(item.discount_percent) > 0 && (
                      <span className="ml-2 text-[10px] bg-red-900/40 text-red-300 px-1.5 py-0.5 rounded">
                        -{item.discount_percent}%[span_9](start_span)[span_9](end_span)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
