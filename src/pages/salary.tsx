import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSalary } from '../hooks/useSalary';
import { getToday, formatDay, formatMonth, calcDayTotal, getCurrentMonth } from '../lib/salaryHelpers';
import type { Lang } from '../App';

const TELEGRAM_USER_ID = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id 
  ? (window as any).Telegram.WebApp.initDataUnsafe.user.id 
  : 123456789; 

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

  useEffect(() => {
    if (data?.days?.[selectedDate]) {
      setDayForm(data.days[selectedDate].quantities || {});
    } else {
      setDayForm({});
    }
  }, [selectedDate, data?.days]);

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
    const cleanedForm = Object.fromEntries(
      Object.entries(dayForm).map(([k, v]) => [k, Number(v) || 0])
    );
    await saveDay(selectedDate, cleanedForm);
  };

  const handleAddNewItem = async () => {
    if (!newItemName || newItemRate === '') return;
    triggerHaptic('light');
    await addItem(newItemName, Number(newItemRate));
    setNewItemName('');
    setNewItemRate('');
  };

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

  const handleQuickAdd = (itemId: string, amount: number) => {
    triggerHaptic('light');
    setDayForm(prev => {
      const current = Number(prev[itemId]) || 0;
      return { ...prev, [itemId]: current + amount };
    });
  };

  const adjustQty = (itemId: string, delta: number) => {
    triggerHaptic('light');
    setDayForm(prev => {
      const current = Number(prev[itemId]) || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [itemId]: next === 0 ? '' : next };
    });
  };

  // ЛОГИКА КАЛЕНДАРЯ: Теперь лента генерируется относительно выбранной даты
  const quickDates = useMemo(() => {
    const dates = [];
    const [y, m, d] = selectedDate.split('-').map(Number);
    for (let i = 0; i < 5; i++) {
      const dateObj = new Date(y, m - 1, d - i);
      const iso = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      dates.push(iso);
    }
    return dates;
  }, [selectedDate]);

  // Функция проверки наличия сохраненных данных для индикатора
  const checkHasData = (dateStr: string) => {
    const record = data?.days?.[dateStr];
    if (!record || !record.quantities) return false;
    return Object.values(record.quantities).some(v => v > 0);
  };

  const chartData = useMemo(() => {
    const last7Days = [];
    let maxVal = 1; 
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const record = data?.days?.[dateStr];
      const total = record ? calcDayTotal(record.quantities, record.rates) : 0;
      if (total > maxVal) maxVal = total;
      
      const shortDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      last7Days.push({ date: shortDate, total });
    }
    return { data: last7Days, max: maxVal };
  }, [data?.days]);

  if (loading || error) return null; 

  const todayStr = getToday();

  return (
    // Убран 100dvh, используется min-h-screen для избежания багов со скроллом
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#0D0D0D] text-white pb-24 font-sans overflow-x-hidden">
      
      {/* Шапка: сплошной цвет без размытия, чтобы не мигало при скролле */}
      <div className="sticky top-0 z-50 p-4 flex items-center gap-4 bg-[#0D0D0D] border-b border-white/10 shadow-md">
        <button onClick={() => { triggerHaptic(); onBack(); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] active:scale-90 transition-transform">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold leading-tight">Зарплата</h1>
          <div className="text-xs text-white/50 capitalize">{formatMonth(getCurrentMonth(), lang)}</div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Баланс */}
        <div className="bg-[#1C1C1E] p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-white/50 text-sm font-medium">Итого за месяц</span>
            <span className="text-white/40 text-xs bg-white/5 px-2 py-1 rounded-md border border-white/5">USD: {MOCK_USD_RATE}</span>
          </div>
          <div className="text-5xl font-black text-[#32D74B] tracking-tight">
            {currentMonthTotal.toLocaleString()} <span className="text-2xl text-white/30 font-bold">₴</span>
          </div>
          <div className="text-sm font-medium text-white/40 mt-2">
            ≈ ${(currentMonthTotal / MOCK_USD_RATE).toFixed(2)}
          </div>
        </div>

        {/* Навигация */}
        <div className="flex bg-[#1C1C1E] p-1.5 rounded-2xl border border-white/5">
          {['daily', 'settings', 'archive'].map(tab => (
            <button 
              key={tab}
              onClick={() => { triggerHaptic(); setActiveTab(tab as any); }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                activeTab === tab ? 'bg-[#32D74B] text-black shadow-sm' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {tab === 'daily' ? 'Записи' : tab === 'settings' ? 'Изделия' : 'Архив'}
            </button>
          ))}
        </div>

        {/* Отключена анимация сдвига по Y (y: 10) во избежание дергания экрана */}
        <AnimatePresence mode="wait">
          {activeTab === 'daily' && (
            <motion.div key="daily" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              
              <div className="bg-[#1C1C1E] p-5 rounded-3xl border border-white/5">
                
                {/* Лента дат и кнопка календаря */}
                <div className="flex items-center gap-2 mb-6">
                  
                  {/* Горизонтальный скролл */}
                  <div className="flex-1 flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
                    {quickDates.map((date) => {
                      const isSelected = selectedDate === date;
                      const isToday = date === todayStr;
                      const hasData = checkHasData(date);
                      
                      return (
                        <button
                          key={date}
                          onClick={() => { triggerHaptic(); setSelectedDate(date); }}
                          className={`relative snap-start flex-shrink-0 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                            isSelected 
                              ? 'bg-[#0A84FF] text-white shadow-lg shadow-[#0A84FF]/20' 
                              : 'bg-white/5 text-white/80 border border-white/5 active:bg-white/10'
                          } ${isToday && !isSelected ? 'border-[#0A84FF]/50' : ''}`}
                        >
                          {isToday ? 'Сегодня' : formatDay(date).split(',')[0]}
                          
                          {/* Индикатор наличия записей (зеленая точка) */}
                          {hasData && (
                            <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-[#32D74B] shadow-[0_0_4px_#32D74B]'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Иконка календаря */}
                  <label className="flex-shrink-0 w-12 h-11 mb-2 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center relative overflow-hidden active:bg-white/10">
                    <input 
                      type="date" 
                      value={selectedDate} 
                      onChange={(e) => {
                        if (e.target.value) {
                          triggerHaptic();
                          setSelectedDate(e.target.value);
                        }
                      }} 
                      className="absolute inset-0 opacity-0 w-full h-full" 
                    />
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </label>
                </div>

                {data.items.length === 0 ? (
                  <p className="text-sm text-white/50 text-center py-4">Добавьте изделия во вкладке "Изделия"</p>
                ) : (
                  <div className="space-y-4">
                    {data.items.map(item => (
                      <div key={item.id} className="bg-[#242426] p-4 rounded-2xl border border-white/5">
                        
                        {/* Верхняя часть изделия: Название и основной инпут. min-w-0 защищает от вылезания текста за края */}
                        <div className="flex justify-between items-start mb-3 gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-lg truncate pr-2">{item.name}</div>
                            <div className="text-sm text-white/50 mt-0.5">{data.rates[item.id]} ₴ / шт</div>
                          </div>
                          
                          <div className="flex-shrink-0 flex items-center gap-1 bg-[#1C1C1E] rounded-xl p-1 border border-white/5">
                            <button onClick={() => adjustQty(item.id, -1)} className="w-10 h-10 flex items-center justify-center text-xl text-white/70 active:bg-white/10 rounded-lg">-</button>
                            <input 
                              type="number" 
                              inputMode="numeric"
                              value={dayForm[item.id] ?? ''}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                              className="w-12 h-10 text-center text-lg bg-transparent font-bold focus:outline-none"
                              placeholder="0"
                            />
                            <button onClick={() => adjustQty(item.id, 1)} className="w-10 h-10 flex items-center justify-center text-xl text-white/70 active:bg-white/10 rounded-lg">+</button>
                          </div>
                        </div>

                        {/* Сетка кнопок быстрого ввода */}
                        <div className="grid grid-cols-4 gap-2">
                          {[1, 5, 7, 9].map(num => (
                            <button 
                              key={num}
                              onClick={() => handleQuickAdd(item.id, num)}
                              className="py-2.5 bg-[#1C1C1E] border border-white/5 active:bg-[#0A84FF] active:border-[#0A84FF] rounded-xl text-sm font-bold text-white transition-colors"
                            >
                              +{num}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      onClick={handleSaveDay}
                      disabled={saving}
                      className="w-full mt-4 bg-[#0A84FF] text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-transform shadow-lg shadow-[#0A84FF]/20"
                    >
                      {saving ? 'Сохранение...' : 'Сохранить день'}
                    </button>
                  </div>
                )}
              </div>

              {/* График активности */}
              <div className="bg-[#1C1C1E] p-5 rounded-3xl border border-white/5">
                <h3 className="font-bold text-white/40 mb-5 text-xs uppercase tracking-widest">Активность за 7 дней</h3>
                <div className="flex items-end justify-between h-28 gap-2">
                  {chartData.data.map((day, i) => {
                    const height = Math.max((day.total / chartData.max) * 100, day.total > 0 ? 8 : 0);
                    const isToday = i === 6; // Последний элемент - это сегодня
                    
                    return (
                      <div key={i} className="flex flex-col items-center flex-1 group">
                        <div className="w-full relative flex justify-center items-end h-full">
                          <div 
                            style={{ height: `${height}%` }}
                            className={`w-full max-w-[28px] rounded-md transition-all ${
                              isToday 
                                ? 'bg-gradient-to-t from-[#32D74B]/50 to-[#32D74B]' 
                                : 'bg-gradient-to-t from-[#0A84FF]/50 to-[#0A84FF]'
                            }`}
                          />
                        </div>
                        <span className="text-[10px] text-white/40 mt-3 font-medium">{day.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Вкладка: ИЗДЕЛИЯ */}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="bg-[#1C1C1E] p-5 rounded-3xl border border-white/5">
                <h2 className="font-bold mb-4 text-lg">Новое изделие</h2>
                <div className="flex flex-col gap-3 mb-4">
                  <input 
                    type="text" 
                    placeholder="Название"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    className="w-full p-4 text-base rounded-2xl bg-[#242426] border border-white/5 focus:border-[#0A84FF] focus:outline-none transition-colors"
                  />
                  <input 
                    type="number" 
                    inputMode="decimal"
                    placeholder="Цена, ₴"
                    value={newItemRate}
                    onChange={e => setNewItemRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-4 text-base rounded-2xl bg-[#242426] border border-white/5 focus:border-[#0A84FF] focus:outline-none transition-colors"
                  />
                </div>
                <button 
                  onClick={handleAddNewItem}
                  disabled={saving || !newItemName || newItemRate === ''}
                  className="w-full bg-[#32D74B] text-black font-bold py-4 rounded-2xl active:scale-[0.98] disabled:opacity-50 disabled:bg-white/10 disabled:text-white/50 transition-all"
                >
                  Добавить изделие
                </button>
              </div>

              <div className="space-y-3">
                {data.items.map(item => (
                  <div key={item.id} className="bg-[#1C1C1E] p-4 rounded-2xl flex justify-between items-center border border-white/5">
                    <div className="min-w-0 pr-4">
                      <div className="font-bold truncate text-lg">{item.name}</div>
                      <div className="text-sm text-white/50 mt-1">{data.rates[item.id]} ₴ / шт</div>
                    </div>
                    <button 
                      onClick={() => { if(confirm('Удалить?')) deleteItem(item.id); }}
                      className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-[#FF453A] bg-[#FF453A]/10 rounded-xl active:scale-90 transition-transform"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Вкладка: АРХИВ */}
          {activeTab === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <button 
                onClick={() => { 
                  if(confirm('Перенести текущий месяц в архив? Делайте это только в конце месяца.')) closeMonth(); 
                }}
                className="w-full border-2 border-dashed border-white/10 text-white/50 hover:text-white/80 py-5 rounded-3xl font-bold active:bg-white/5 transition-all uppercase tracking-wider text-sm"
              >
                + Архивировать текущий месяц
              </button>
              {/* Остальной код архива без изменений */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
