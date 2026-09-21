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

  // Берем первую запись, чтобы посмотреть ее ключи (названия колонок)
  const firstItem = materials.length > 0 ? materials[0] : null;

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

      <h1 className="font-serif text-3xl leading-none mb-4 tracking-tight">
        Проверка структуры базы
      </h1>

      {loading && <p className="text-sm opacity-50 animate-pulse">Загрузка из Neon...</p>}
      
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && firstItem && (
        <div className="flex flex-col gap-4 pb-10">
          <div className="p-4 rounded-xl border bg-[#141414]" style={{ borderColor: 'rgba(244, 240, 232, 0.2)' }}>
            <p className="text-xs uppercase opacity-50 mb-2 font-sans">Доступные названия колонок в базе:</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(firstItem).map((key) => (
                <span key={key} className="px-2.5 py-1 bg-white/10 rounded-lg text-xs font-mono text-[#D8A35C]">
                  {key}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs opacity-50 mt-2 font-sans">Пример первой записи:</p>
          <div className="p-4 rounded-xl border bg-[#141414] font-mono text-xs overflow-x-auto" style={{ borderColor: 'rgba(244, 240, 232, 0.12)' }}>
            <pre>{JSON.stringify(firstItem, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
