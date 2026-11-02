import React, { useState, useMemo } from 'react';
import { cardioCatalog, ShoeCategory } from '../data/catalog';

type MaterialsProps = {
  onBack?: () => void;
};

const CATEGORIES: ('Все' | ShoeCategory)[] = ['Все', 'Ботинки', 'Кроссовки', 'Туфли'];

export const Materials: React.FC<MaterialsProps> = ({ onBack }) => {
  const [activeCategory, setActiveCategory] = useState<'Все' | ShoeCategory>('Все');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShoes = useMemo(() => {
    return cardioCatalog.filter((item) => {
      const matchesCategory = activeCategory === 'Все' || item.category === activeCategory;
      const matchesSearch =
        item.modelNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.color.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div style={{ backgroundColor: '#F7F6F2', minHeight: '100vh', padding: '16px', color: '#1A1A1A' }}>
      {/* Шапка */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <span style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#777' }}>
            Харьков • Производство
          </span>
          <h1 style={{ fontFamily: 'serif', fontSize: '26px', margin: '2px 0 0 0', fontWeight: 500 }}>
            Cardio Footwear
          </h1>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: '1px solid #CCC',
              padding: '6px 12px',
              fontSize: '11px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer'
            }}
          >
            Назад
          </button>
        )}
      </div>

      {/* Поиск по номеру модели или цвету */}
      <input
        type="text"
        placeholder="Поиск по номеру модели (например, 226) или цвету..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 12px',
          marginBottom: '12px',
          border: '1px solid #DDD',
          backgroundColor: '#FFF',
          fontSize: '13px',
          outline: 'none'
        }}
      />

      {/* Фильтры категорий в стиле Pegres */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              style={{
                padding: '8px 14px',
                border: isActive ? '1px solid #1A1A1A' : '1px solid #DDD',
                backgroundColor: isActive ? '#1A1A1A' : '#FFF',
                color: isActive ? '#FFF' : '#1A1A1A',
                fontSize: '12px',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Сетка каталога (2 колонки на мобильном) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
          gap: '12px'
        }}
      >
        {filteredShoes.map((shoe) => (
          <div
            key={shoe.id}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #EAE8E3',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            {/* Бейдж модификации подошвы (#1, #2) */}
            {shoe.variant && (
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  backgroundColor: '#F7F6F2',
                  border: '1px solid #DDD',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 600
                }}
              >
                {shoe.variant}
              </span>
            )}

            {/* Квадратное фото */}
            <img
              src={shoe.image}
              alt={`Модель ${shoe.modelNumber}`}
              loading="lazy"
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                objectFit: 'contain',
                marginBottom: '10px'
              }}
            />

            {/* Описание модели */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'serif', fontSize: '17px', fontWeight: 600 }}>
                  № {shoe.modelNumber}
                </span>
                <span style={{ fontSize: '11px', color: '#777' }}>{shoe.category}</span>
              </div>

              <div style={{ fontSize: '12px', color: '#444', marginTop: '4px' }}>
                Цвет: <strong>{shoe.color}</strong>
              </div>

              {/* Теги: Мех, Gore-Tex, Трактор */}
              {shoe.features.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {shoe.features.map((feat) => (
                    <span
                      key={feat}
                      style={{
                        fontSize: '10px',
                        backgroundColor: '#F0EFEA',
                        padding: '2px 6px',
                        color: '#333'
                      }}
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
