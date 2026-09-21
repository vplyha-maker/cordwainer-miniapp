import { useEffect, useState } from 'react'

export default function Materials() {
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
      <h1 className="font-serif text-4xl leading-none mb-6 tracking-tight">
        Материалы & Детали
      </h1>

      {loading && <p className="text-sm opacity-50 animate-pulse">Подключение к Neon...</p>}
      
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-5 pb-10">
          {materials.map((item) => (
            <div 
              key={item.id} 
              className="p-5 rounded-2xl border transition-all"
              style={{ borderColor: 'rgba(244, 240, 232, 0.12)', background: '#141414' }}
            >
              <h2 className="font-serif text-2xl mb-1">{item.brand}</h2>
              <p className="text-sm opacity-70 mb-4">{item.model_name}</p>
              
              <div className="flex flex-col gap-2 text-xs font-sans tracking-wide">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="opacity-40 uppercase">Верх</span>
                  <span className="text-right ml-4">{item.material_upper}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="opacity-40 uppercase">Подошва</span>
                  <span className="text-right ml-4">{item.material_sole}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="opacity-40 uppercase">Цвет</span>
                  <span className="text-right ml-4">{item.color}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="opacity-40 uppercase">Себестоимость / Цена</span>
                  <span className="font-bold text-[#F4F0E8]">${item.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

