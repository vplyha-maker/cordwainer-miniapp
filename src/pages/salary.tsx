import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSalary } from '../hooks/useSalary';
import { getToday, formatDay, formatMonth, calcDayTotal, getCurrentMonth } from '../lib/salaryHelpers';
import type { Lang } from '../App';

const TELEGRAM_USER_ID = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id 
  ? (window as any).Telegram.WebApp.initDataUnsafe.user.id 
  : 123456789; 

// Примерный курс. В идеале получать его по API (например, из вашего проекта на Neon)
const MOCK_USD_RATE = 41.50; 

type SalaryCalcPageProps = {
  onBack: () => void;
  lang?: Lang;
}

export function SalaryCalcPage({ onBack, lang = 'ru' }: SalaryCalcPageProps) {
  const {
    data, loading, saving, error,
    addItem, deleteItem, saveDay, closeMonth, deleteArchiveMonth
  } = useSalary({ userId: TELEGRAM_USER_ID });

  const [activeTab, setActiveTab] = useState<'daily' | 'settings' | 'archive'>('daily');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [dayForm, setDayForm] = useState<Record<string, number | ''>>({});
  const [newItemName, setNewItemName] = useState('');
  const [newItemRate, setNewItemRate] = useState<number | ''>('');

  // 1. ЛОГИКА: Синхронизация формы при смене даты
  useEffect(() => {
    if (data?.days?.[selectedDate]) {
      setDayForm(data.days[selectedDate].quantities || {});
    } else {
      setDayForm({});
    }
  }, [selectedDate, data?.days]);

  // Подсчет итогов текущего месяца
  const currentMonthTotal = useMemo(() => {
    let total = 0;
    const month = getCurrentMonth();
    if (data?.days) {
      Object.entries(data.days).forEach(([date, record]) => {
        if (date.startsWith(month)) {
          total += calcDayTotal(record.quantities, record.rates);
        }
      });
    }
    return total;
  }, [data]);

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style) } catch {}
  };

  const handleSaveDay = async () => {
    if (Object.keys(dayForm).length === 0) return;
    triggerHaptic('medium');
    
    // Очищаем пустые строки перед сохранением
    const cleanedForm = Object.fromEntries(
      Object.entries(dayForm).map(([k, v]) => [k, Number(v) || 0])
    );
    
    await saveDay(selectedDate, cleanedForm);
    // Убрано setDayForm({}), чтобы пользователь видел, что он сохранил
  };

  const handleAddNewItem = async () => {
    if (!newItemName || newItemRate === '') return;
    triggerHaptic('light');
    await addItem(newItemName, Number(newItemRate));
    setNewItemName('');
    setNewItemRate('');
  };

  // 2. UX: Улучшенная обработка ввода и кнопки +/-
  const handleQtyChange = (itemId: string, val: string) => {
    if (val === '') {
      setDayForm(prev => ({ ...prev, [itemId]: '' }));
      return;
    }
    const qty = parseInt(val, 10);
    if (!isNaN(qty) && qty >= 0) {
      setDayForm(prev => ({ ...prev, [itemId]: qty }));
    }
  };

  const adjustQty = (itemId: string, delta: number) => {
    triggerHaptic('light');
    setDayForm(prev => {
      const current = Number(prev[itemId]) || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [itemId]: next === 0 ? '' : next };
    });
  };

  // Генерация последних 5 дней для быстрого выбора
  const quickDates = useMemo(() => {
    const dates = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates.reverse(); // Сегодня первым
  }, []);

  // Генерация данных для мини-графика (последние 7 дней)
  const chartData = useMemo(() => {
    const last7Days = [];
    let maxVal = 1; // защита от деления на 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const record = data?.days?.[dateStr];
      const total = record ? calcDayTotal(record.quantities, record.rates) : 0;
      if (total > maxVal) maxVal = total;
      last7Days.push({ date: formatDay(dateStr).split(',')[0], total });
    }
    return { data: last7Days, max: maxVal };
  }, [data?.days]);

  if (loading || error) {
    return (
      <div className="min-h-[100dvh] bg-[var(--color-bg)] flex flex-col items-center justify-center p-4">
        {error ? (
          <>
            <div className="text-[var(--color-danger)] font-medium mb-4">{error}</div>
            <button onClick={onBack} className="px-5 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">Назад</button>
          </>
        ) : (
          <div className="text-[var(--color-muted)] animate-pulse">Загрузка...</div>
        )}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)] pb-24 font-body">
      
      {/* Шапка */}
      <div className="sticky top-0 z-50 p-4 flex items-center gap-4 bg-[var(--color-bg)]/80 backdrop-blur-md border-b border-[var(--color-border)]">
        <button onClick={() => { triggerHaptic(); onBack(); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface-2)] active:scale-90 transition-transform">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold leading-tight">Зарплата</h1>
          <div className="text-xs text-[var(--color-muted)]">{formatMonth(getCurrentMonth(), lang)}</div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        
        {/* Баланс + Курс */}
        <div className="bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)] p-5 rounded-[20px] border border-[var(--color-border)] shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[var(--color-muted)] text-sm">Итого за месяц</span>
            <span className="text-[var(--color-muted)] text-xs bg-[var(--color-bg)] px-2 py-1 rounded-md">USD: {MOCK_USD_RATE}</span>
          </div>
          <div className="text-4xl font-black text-[var(--pigment-malachite,#0BDA51)] tracking-tight">
            {currentMonthTotal.toLocaleString()} <span className="text-2xl text-[var(--color-ink)] opacity-50">₴</span>
          </div>
          <div className="text-sm font-medium text-[var(--color-muted)] mt-1">
            ≈ ${(currentMonthTotal / MOCK_USD_RATE).toFixed(2)}
          </div>
        </div>

        {/* Навигация */}
        <div className="flex bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)]">
          {['daily', 'settings', 'archive'].map(tab => (
            <button 
              key={tab}
              onClick={() => { triggerHaptic(); setActiveTab(tab as any); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === tab ? 'bg-[var(--color-bg)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-muted)]'
              }`}
            >
              {tab === 'daily' ? 'Записи' : tab === 'settings' ? 'Изделия' : 'Архив'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Вкладка: ЗАПИСИ */}
          {activeTab === 'daily' && (
            <motion.div key="daily" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
              
              <div className="bg-[var(--color-surface)] p-4 rounded-[20px] border border-[var(--color-border)]">
                
                {/* Горизонтальный выбор дат */}
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                  {quickDates.map((date, idx) => {
                    const isSelected = selectedDate === date;
                    const isToday = idx === 0;
                    return (
                      <button
                        key={date}
                        onClick={() => { triggerHaptic(); setSelectedDate(date); }}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                          isSelected 
                            ? 'bg-[var(--color-info)] text-white border-[var(--color-info)]' 
                            : 'bg-[var(--color-surface-2)] text-[var(--color-ink)] border-transparent'
                        }`}
                      >
                        {isToday ? 'Сегодня' : formatDay(date).split(',')[0]}
                      </button>
                    );
                  })}
                  {/* Фолбэк на произвольную дату */}
                  <label className="flex-shrink-0 px-3 py-2 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center">
                    <input 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="opacity-0 absolute w-0 h-0"
                    />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </label>
                </div>

                {data.items.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)] text-center py-4">Добавьте изделия во вкладке "Изделия"</p>
                ) : (
                  <div className="space-y-3">
                    {data.items.map(item => (
                      <div key={item.id} className="flex flex-wrap justify-between items-center bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-border)] gap-2">
                        <div className="flex-1 min-w-[120px]">
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-xs text-[var(--color-muted)]">{data.rates[item.id]} ₴ / шт</div>
                        </div>
                        
                        {/* Stepper (Кнопки +/-) */}
                        <div className="flex items-center gap-1 bg-[var(--color-surface-2)] rounded-lg p-1">
                          <button onClick={() => adjustQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-lg rounded-md active:bg-[var(--color-border)]">-</button>
                          <input 
                            type="number" 
                            inputMode="numeric"
                            value={dayForm[item.id] ?? ''}
                            onChange={(e) => handleQtyChange(item.id, e.target.value)}
                            className="w-12 h-8 text-center text-base bg-transparent font-medium focus:outline-none"
                            placeholder="0"
                          />
                          <button onClick={() => adjustQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-lg rounded-md active:bg-[var(--color-border)]">+</button>
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      onClick={handleSaveDay}
                      disabled={saving}
                      className="w-full mt-2 bg-[var(--color-info)] text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform shadow-md"
                    >
                      {saving ? 'Сохранение...' : 'Сохранить день'}
                    </button>
                  </div>
                )}
              </div>

              {/* График активности */}
              <div className="bg-[var(--color-surface)] p-4 rounded-[20px] border border-[var(--color-border)]">
                <h3 className="font-bold text-[var(--color-muted)] mb-4 text-xs uppercase tracking-wider">Активность за 7 дней</h3>
                <div className="flex items-end justify-between h-24 gap-1">
                  {chartData.data.map((day, i) => {
                    const height = Math.max((day.total / chartData.max) * 100, day.total > 0 ? 10 : 0);
                    return (
                      <div key={i} className="flex flex-col items-center flex-1 group">
                        <div className="w-full relative flex justify-center items-end h-full">
                          <div 
                            style={{ height: `${height}%` }}
                            className="w-full max-w-[24px] bg-[var(--color-info)] rounded-t-md opacity-80 group-hover:opacity-100 transition-all"
                          />
                        </div>
                        <span className="text-[10px] text-[var(--color-muted)] mt-2">{day.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Вкладка: ИЗДЕЛИЯ */}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="bg-[var(--color-surface)] p-4 rounded-[20px] border border-[var(--color-border)]">
                <h2 className="font-bold mb-3 text-[var(--color-ink)]">Новое изделие</h2>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    placeholder="Название"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    className="flex-[2] p-3 text-base rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-info)] focus:outline-none"
                  />
                  <input 
                    type="number" 
                    inputMode="decimal"
                    placeholder="Цена, ₴"
                    value={newItemRate}
                    onChange={e => setNewItemRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="flex-[1] min-w-[80px] p-3 text-base rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-info)] focus:outline-none"
                  />
                </div>
                <button 
                  onClick={handleAddNewItem}
                  disabled={saving || !newItemName || newItemRate === ''}
                  className="w-full bg-[var(--color-info)] text-white font-bold py-3.5 rounded-xl active:scale-95 disabled:opacity-50 transition-transform"
                >
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {data.items.map(item => (
                  <div key={item.id} className="bg-[var(--color-surface)] p-4 rounded-xl flex justify-between items-center border border-[var(--color-border)]">
                    <div>
                      <div className="font-bold">{item.name}</div>
                      <div className="text-sm text-[var(--color-muted)]">{data.rates[item.id]} ₴ / шт</div>
                    </div>
                    <button 
                      onClick={() => { if(confirm('Удалить?')) deleteItem(item.id); }}
                      className="w-10 h-10 flex items-center justify-center text-[var(--color-danger)] bg-[var(--color-danger)]/10 rounded-xl active:scale-90"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Вкладка: АРХИВ */}
          {activeTab === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              
              <button 
                onClick={() => { 
                  if(confirm('Перенести текущий месяц в архив? Делайте это только в конце месяца.')) closeMonth(); 
                }}
                className="w-full border-2 border-dashed border-[var(--color-border)] text-[var(--color-muted)] py-4 rounded-[20px] font-medium active:bg-[var(--color-surface)]"
              >
                + Архивировать текущий месяц
              </button>

              {Object.keys(data.archive).length === 0 ? (
                <p className="text-center text-[var(--color-muted)] mt-6">Архив пуст</p>
              ) : (
                Object.entries(data.archive).sort(([a], [b]) => b.localeCompare(a)).map(([month, archiveData]) => (
                  <div key={month} className="bg-[var(--color-surface)] p-5 rounded-[20px] border border-[var(--color-border)]">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-lg capitalize">{formatMonth(month, lang)}</h3>
                      <span className="font-black text-xl text-[var(--pigment-malachite,#0BDA51)]">
                        {archiveData.stats.total.toLocaleString()} ₴
                      </span>
                    </div>
                    
                    <div className="text-sm text-[var(--color-muted)] mb-4">
                      Дней отработано: <span className="font-bold text-[var(--color-ink)]">{archiveData.stats.days}</span>
                      <span className="mx-2">|</span>
                      ≈ ${(archiveData.stats.total / MOCK_USD_RATE).toFixed(0)}
                    </div>
                    
                    <div className="bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-border)] text-sm space-y-2">
                      {Object.entries(archiveData.stats.quantities).map(([itemId, qty]) => {
                        if (!qty) return null;
                        const itemName = data.items.find(i => i.id === itemId)?.name || 'Удаленное изделие';
                        return (
                          <div key={itemId} className="flex justify-between items-center">
                            <span className="text-[var(--color-muted)]">{itemName}</span>
                            <span className="font-medium text-[var(--color-ink)]">{qty} шт.</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <button 
                      onClick={() => { if(confirm('Удалить этот месяц?')) deleteArchiveMonth(month); }}
                      className="mt-4 text-xs text-[var(--color-danger)] w-full py-2 uppercase tracking-wider font-bold"
                    >
                      Удалить запись
                    </button>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
