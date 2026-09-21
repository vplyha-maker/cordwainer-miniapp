import { useEffect, useState } from 'react'

interface Sneaker {
  id: string
  brand: string
  name: string
  retailPrice: number
  image: {
    original: string
  }
}

export default function SneakerIndex({ onBack }: { onBack?: () => void }) {
  const [sneakers, setSneakers] = useState<Sneaker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    fetch('/api/get-top-sneakers')
      .then((res) => {
        if (!res.ok) throw new Error('Ошибка при загрузке данных')
        return res.json()
      })
      .then((data) => {
        if (data.results) {
          setSneakers(data.results)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen p-6 transition-colors duration-500" style={{ background: '#09090B', color: '#F4F0E8' }}>
      <header className="pt-8 pb-12 flex items-start justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-0 bg-transparent cursor-pointer"
            style={{ color: 'rgba(244, 240, 232, 0.5)' }}
          >
            <span>←</span>
            <span>Back</span>
          </button>
        )}
      </header>

      <h1 className="font-serif text-[12vw] min-[375px]:text-5xl leading-none mb-12 tracking-[-0.02em]">
        Sneaker Index
      </h1>

      {loading && <p className="text-[12px] font-sans uppercase tracking-widest opacity-50">Загрузка базы...</p>}
      {error && <p className="text-[12px] font-sans text-red-500">{error}</p>}

      <div className="flex flex-col gap-8 pb-24">
        {sneakers.map((sneaker) => (
          <div key={sneaker.id} className="border-b pb-8" style={{ borderColor: 'rgba(244, 240, 232, 0.15)' }}>
            {sneaker.image?.original && (
              <div className="w-full rounded-xl overflow-hidden mb-5 bg-[#1A1A1A]">
                <img 
                  src={sneaker.image.original} 
                  alt={sneaker.name} 
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <h3 className="font-serif text-[26px] leading-none mb-2">{sneaker.brand}</h3>
            <p className="text-[14px] font-sans font-light mb-4" style={{ color: 'rgba(244, 240, 232, 0.6)' }}>
              {sneaker.name}
            </p>
            {sneaker.retailPrice > 0 && (
              <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em]">
                Retail: ${sneaker.retailPrice}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

