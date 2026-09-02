import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSalary } from '../hooks/useSalary';
import { getToday, formatDay, formatMonth, calcDayTotal, getCurrentMonth } from '../lib/salaryHelpers';
import type { Lang } from '../App';

const TELEGRAM_USER_ID = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id 
  ? (window as any).Telegram.WebApp.initDataUnsafe.user.id 
  : 123456789; 

type SalaryCalcPageProps = {
  onBack: () => void;
  lang?: Lang; // На будущее, если захочешь добавить укр. перевод
}

export function SalaryCalcPage({ onBack, lang = 'ru' }: SalaryCalcPageProps) {
  const {
    data, loading, saving, error,
    addItem, deleteItem, saveDay, closeMonth, deleteArchiveMonth
  } = useSalary({ userId: TELEGRAM_USER_ID });

  const [activeTab, setActiveTab] = useState<'daily' | 'settings' | 'archive'>('daily');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [dayForm, setDayForm] = useState<Record<string, number>>({});
  const [newItemName, setNewItemName] = useState('');
  const [newItemRate, setNewItemRate] = useState<number | ''>('');

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

  const triggerHaptic = () => {
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light') } catch {}
  };

  const handleSaveDay = async () => {
    if (Object.keys(dayForm).length === 0) return;
    triggerHaptic();
    await saveDay(selectedDate, dayForm);
    setDayForm({}); 
  };

  const handleAddNewItem = async () => {
    if (!newItemName || newItemRate === '') return;
    triggerHaptic();
    await addItem(newItemName, Number(newItemRate));
    setNewItemName('');
    setNewItemRate('');
  };

  const handleQtyChange = (itemId: string, val: string) => {
    const qty = parseInt(val, 10);
    setDayForm(prev => ({
      ...prev,
      [itemId]: isNaN(qty) ? 0 : qty
    }));
  };

    if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="min-h-[100dvh] bg-[var(--color-bg)] flex flex-col items-center justify-center"
      >
        <div className="text-[var(--color-muted)] animate-pulse font-medium">Загрузка данных...</div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="min-h-[100dvh] bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4"
      >
        <div className="text-[var(--color-danger)] font-medium text-center px-4">Ошибка: {error}</div>
        <button 
          onClick={onBack} 
          className="text-sm text-[var(--color-ink)] bg-[var(--color-surface)] border border-[var(--color-border)] px-5 py-2 rounded-xl active:scale-95 transition-transform"
        >
          Вернуться назад
        </button>
      </motion.div>
    );
  }


  const currentMonth = getCurrentMonth();
  const currentMonthRecords = Object.entries(data.days)
    .filter(([date]) => date.startsWith(currentMonth))
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)); 

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)] pb-20 font-body"
    >
      {/* Шапка с кнопкой НАЗАД */}
      <div className="relative z-10 p-5 flex items-center gap-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-sm">
        <button
          onClick={() => { triggerHaptic(); onBack(); }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] active:scale-90 transition-transform text-[var(--color-ink)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold leading-tight">Зарплата</h1>
          <div className="text-xs text-[var(--color-muted)]">{formatMonth(currentMonth, lang)}</div>
        </div>
      </div>

      <div className="p-5">
        {/* Баланс */}
        <div className="bg-[var(--color-surface)] p-5 rounded-[18px] border border-[var(--color-border)] mb-5 text-center shadow-sm">
          <div className="text-[var(--color-muted)] text-sm mb-1">Итого за месяц</div>
          <div className="text-3xl font-black text-[var(--pigment-malachite,#0BDA51)]">
            {currentMonthTotal.toLocaleString()} ₴
          </div>
        </div>

        {/* Табы */}
        <div className="flex bg-[var(--color-surface-2)] p-1 rounded-xl mb-5">
          {[
            { id: 'daily', label: 'Записи' },
            { id: 'settings', label: 'Изделия' },
            { id: 'archive', label: 'Архив' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => { triggerHaptic(); setActiveTab(tab.id as any); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id 
                  ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm' 
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Вкладка: ЗАПИСИ */}
        {activeTab === 'daily' && (
          <div className="space-y-5">
            <div className="bg-[var(--color-surface)] p-4 rounded-[18px] border border-[var(--color-border)] shadow-sm">
              <h2 className="font-bold mb-3 text-[var(--color-ink)]">Внести выработку</h2>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 rounded-xl mb-4 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-info)]"
              />
              
              {data.items.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)] text-center py-2">Сначала добавьте изделия во вкладке "Изделия"</p>
              ) : (
                <div className="space-y-3">
                  {data.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-border)]">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-[var(--color-muted)]">{data.rates[item.id]} ₴ / шт</div>
                      </div>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="0"
                        value={dayForm[item.id] || ''}
                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                        className="w-20 p-2 text-center rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-ink)] focus:outline-none"
                      />
                    </div>
                  ))}
                  <button 
                    onClick={handleSaveDay}
                    disabled={saving}
                    className="w-full mt-4 bg-[var(--color-info)] text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {saving ? 'Сохранение...' : 'Сохранить день'}
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-[var(--color-muted)] mb-3 px-1 text-sm uppercase tracking-wider">История за месяц</h3>
              {currentMonthRecords.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)] text-center py-4">Нет записей в этом месяце</p>
              ) : (
                <div className="space-y-2">
                  {currentMonthRecords.map(([date, record]) => (
                    <div key={date} className="bg-[var(--color-surface)] p-4 rounded-xl shadow-sm flex justify-between items-center border border-[var(--color-border)]">
                      <div className="font-medium">{formatDay(date)}</div>
                      <div className="font-bold text-[var(--pigment-malachite,#0BDA51)]">
                        +{calcDayTotal(record.quantities, record.rates).toLocaleString()} ₴
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => { triggerHaptic(); closeMonth().catch(e => alert(e.message)); }}
                    disabled={saving}
                    className="w-full mt-4 bg-[var(--color-surface-2)] text-[var(--color-ink)] border border-[var(--color-border)] py-3 rounded-xl font-medium active:scale-95 transition-transform"
                  >
                    Закрыть месяц (в архив)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Вкладка: ИЗДЕЛИЯ */}
        {activeTab === 'settings' && (
          <div className="space-y-5">
            <div className="bg-[var(--color-surface)] p-4 rounded-[18px] border border-[var(--color-border)] shadow-sm">
              <h2 className="font-bold mb-3 text-[var(--color-ink)]">Новое изделие</h2>
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  placeholder="Название"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="flex-1 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-ink)] focus:outline-none"
                />
                <input 
                  type="number" 
                  placeholder="Цена, ₴"
                  value={newItemRate}
                  onChange={e => setNewItemRate(Number(e.target.value))}
                  className="w-24 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-ink)] focus:outline-none"
                />
              </div>
              <button 
                onClick={handleAddNewItem}
                disabled={saving || !newItemName || newItemRate === '' || data.items.length >= 10}
                className="w-full bg-[var(--color-info)] text-white font-bold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
              >
                Добавить
              </button>
              {data.items.length >= 10 && <p className="text-xs text-[var(--color-danger)] mt-2 text-center">Достигнут лимит (10 изделий)</p>}
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-[var(--color-muted)] mb-3 px-1 text-sm uppercase tracking-wider">Мои изделия</h3>
              {data.items.map(item => (
                <div key={item.id} className="bg-[var(--color-surface)] p-4 rounded-xl shadow-sm flex justify-between items-center border border-[var(--color-border)]">
                  <div>
                    <div className="font-bold">{item.name}</div>
                    <div className="text-sm text-[var(--color-muted)] mt-0.5">{data.rates[item.id]} ₴ / шт</div>
                  </div>
                  <button 
                    onClick={() => { 
                      triggerHaptic();
                      if(confirm('Удалить изделие?')) deleteItem(item.id);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-[var(--color-danger)] bg-[var(--color-danger)]/10 rounded-lg active:scale-90 transition-transform"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Вкладка: АРХИВ */}
        {activeTab === 'archive' && (
          <div className="space-y-4">
            {Object.keys(data.archive).length === 0 ? (
              <p className="text-center text-[var(--color-muted)] mt-10">Архив пуст</p>
            ) : (
              Object.entries(data.archive)
                .sort(([monthA], [monthB]) => monthB.localeCompare(monthA))
                .map(([month, archiveData]) => (
                  <div key={month} className="bg-[var(--color-surface)] p-5 rounded-[18px] border border-[var(--color-border)] shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg capitalize">{formatMonth(month, lang)}</h3>
                      <span className="font-black text-xl text-[var(--pigment-malachite,#0BDA51)]">
                        {archiveData.stats.total.toLocaleString()} ₴
                      </span>
                    </div>
                    <div className="text-sm text-[var(--color-muted)] mb-4">
                      Отработано дней: <span className="font-bold text-[var(--color-ink)]">{archiveData.stats.days}</span>
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
                      onClick={() => { 
                        triggerHaptic();
                        if(confirm('Точно удалить этот месяц из архива?')) deleteArchiveMonth(month);
                      }}
                      className="mt-4 text-xs text-[var(--color-danger)] w-full text-center py-2 active:opacity-50 transition-opacity uppercase tracking-wider font-bold"
                    >
                      Удалить запись
                    </button>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
