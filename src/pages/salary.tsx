import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ru, uk, de } from 'date-fns/locale';

import { useSalary } from '../hooks/useSalary';
import { getToday, formatDay, formatMonth, calcDayTotal, getCurrentMonth } from '../lib/salaryHelpers';
import type { Lang } from '../App';

const TELEGRAM_USER_ID = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id 
  ? (window as any).Telegram.WebApp.initDataUnsafe.user.id 
  : 123456789; 

const getLocalDateString = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getShortDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}`;
};

const getShortDateName = (dateStr: string, lang: Lang) => {
  const d = new Date(dateStr);
  const locale = lang === 'de' ? 'de-DE' : lang === 'uk' ? 'uk-UA' : 'ru-RU';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', '');
};

// --- НАСТРОЙКИ ПРАЗДНИКОВ (Формат ММ-ДД) ---
// Праздники Украины (по новому календарю)
const HOLIDAYS_UA = ['01-01', '03-08', '05-01', '05-08', '06-28', '07-15', '08-24', '10-01', '12-25'];
// Национальные праздники Германии (вкл. основные и переходящие даты 2026 года)
const HOLIDAYS_DE = ['01-01', '04-03', '04-06', '05-01', '05-14', '05-25', '10-03', '12-25', '12-26'];

const isHoliday = (date: Date, lang: Lang) => {
  const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return lang === 'de' ? HOLIDAYS_DE.includes(mmdd) : HOLIDAYS_UA.includes(mmdd);
};

const getLocaleObj = (lang: Lang) => {
  if (lang === 'de') return de;
  if (lang === 'uk') return uk;
  return ru;
};

const getDictionary = (lang: Lang, curr: string) => {
  const dict = {
    ru: {
      title: 'Зарплата',
      totalFor: 'Итого за',
      selectedDay: 'За выбранный день',
      tabDaily: 'Записи',
      tabSettings: 'Изделия',
      tabArchive: 'Архив',
      today: 'Сегодня',
      entryFor: 'Внесение за:',
      noItems: 'Нет изделий для учета.',
      addInSettings: 'Добавить в настройках',
      perPiece: `${curr} / шт`,
      activity7Days: 'Активность (7 дней)',
      addItem: 'Добавить изделие',
      namePlaceholder: 'Название (например: Mac)',
      pricePlaceholder: `Стоимость за шт, ${curr}`,
      addBtn: 'Добавить',
      confirmDelete: 'Удалить изделие?',
      confirmArchive: 'Перенести {month} в архив? Все записи за этот месяц будут сгруппированы.',
      archiveBtn: '+ Заархивировать',
      archiveEmpty: 'Архив пуст',
      daysWorked: 'Дней отработано:',
      deletedItem: 'Удаленное изделие',
      pcs: 'шт.',
      confirmDeleteArchive: 'Точно удалить этот месяц из архива?',
      deleteRecord: 'Удалить запись',
      saving: 'Сохранение...',
      saveFor: 'Сохранить за',
      noChangesFor: 'Изменений за',
      noChangesSuffix: 'нет',
    },
    uk: {
      title: 'Зарплата',
      totalFor: 'Разом за',
      selectedDay: 'За обраний день',
      tabDaily: 'Записи',
      tabSettings: 'Вироби',
      tabArchive: 'Архів',
      today: 'Сьогодні',
      entryFor: 'Внесення за:',
      noItems: 'Немає виробів для обліку.',
      addInSettings: 'Додати в налаштуваннях',
      perPiece: `${curr} / шт`,
      activity7Days: 'Активність (7 днів)',
      addItem: 'Додати виріб',
      namePlaceholder: 'Назва (наприклад: Mac)',
      pricePlaceholder: `Вартість за шт, ${curr}`,
      addBtn: 'Додати',
      confirmDelete: 'Видалити виріб?',
      confirmArchive: 'Перенести {month} в архів? Усі записи за цей місяць будуть згруповані.',
      archiveBtn: '+ Заархівувати',
      archiveEmpty: 'Архів порожній',
      daysWorked: 'Днів відпрацьовано:',
      deletedItem: 'Видалений виріб',
      pcs: 'шт.',
      confirmDeleteArchive: 'Точно видалити цей місяць з архіву?',
      deleteRecord: 'Видалити запис',
      saving: 'Збереження...',
      saveFor: 'Зберегти за',
      noChangesFor: 'Змін за',
      noChangesSuffix: 'немає',
    },
    de: {
      title: 'Lohn',
      totalFor: 'Gesamt für',
      selectedDay: 'Für den gewählten Tag',
      tabDaily: 'Einträge',
      tabSettings: 'Artikel',
      tabArchive: 'Archiv',
      today: 'Heute',
      entryFor: 'Eintrag für:',
      noItems: 'Keine Artikel zur Erfassung.',
      addInSettings: 'In den Einstellungen hinzufügen',
      perPiece: `${curr} / Stk`,
      activity7Days: 'Aktivität (7 Tage)',
      addItem: 'Artikel hinzufügen',
      namePlaceholder: 'Name (z.B. Mac)',
      pricePlaceholder: `Stückpreis, ${curr}`,
      addBtn: 'Hinzufügen',
      confirmDelete: 'Artikel löschen?',
      confirmArchive: '{month} ins Archiv verschieben? Alle Einträge für diesen Monat werden gruppiert.',
      archiveBtn: '+ Archivieren',
      archiveEmpty: 'Archiv ist leer',
      daysWorked: 'Gearbeitete Tage:',
      deletedItem: 'Gelöschter Artikel',
      pcs: 'Stk.',
      confirmDeleteArchive: 'Diesen Monat wirklich aus dem Archiv löschen?',
      deleteRecord: 'Eintrag löschen',
      saving: 'Speichern...',
      saveFor: "Speichern für",
      noChangesFor: 'Keine Änderungen für',
      noChangesSuffix: '',
    }
  };
  return dict[lang] || dict.ru;
};

type SalaryCalcPageProps = {
  onBack: () => void;
  lang?: Lang;
}

export function SalaryCalcPage({ onBack, lang = 'ru' }: SalaryCalcPageProps) {
  const primaryCurrency = '₴';
  const t = getDictionary(lang, primaryCurrency);
  
  const {
    data, loading, saving, error,
    addItem, deleteItem, saveDay, closeMonth, deleteArchiveMonth
  } = useSalary({ userId: TELEGRAM_USER_ID, lang });

  const [activeTab, setActiveTab] = useState<'daily' | 'settings' | 'archive'>('daily');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [dayForm, setDayForm] = useState<Record<string, number | ''>>({});
  const [newItemName, setNewItemName] = useState('');
  const [newItemRate, setNewItemRate] = useState<number | ''>('');
  
  const [fiatRates, setFiatRates] = useState({ USD: 41.50, EUR: 45.00 });
  const [isRateLoading, setIsRateLoading] = useState(true);

  const secCurrencyCode = lang === 'de' ? 'EUR' : 'USD';
  const secCurrencySymbol = lang === 'de' ? '€' : '$';
  const activeFiatRate = fiatRates[secCurrencyCode as keyof typeof fiatRates] || 1;

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setIsRateLoading(true);
        const apiRes = await fetch('/api/rates').catch(() => null);
        if (apiRes && apiRes.ok) {
          const ratesData = await apiRes.json();
          if (ratesData?.usd || ratesData?.eur) {
            setFiatRates({ 
              USD: Number(ratesData.usd || 41.50), 
              EUR: Number(ratesData.eur || 45.00) 
            });
            return;
          }
        }
        const [nbuUsd, nbuEur] = await Promise.all([
          fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json').then(r => r.json()).catch(() => null),
          fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=EUR&json').then(r => r.json()).catch(() => null)
        ]);
        
        setFiatRates({
          USD: nbuUsd?.[0]?.rate || 41.50,
          EUR: nbuEur?.[0]?.rate || 45.00
        });
      } catch (err) {
        console.error('Ошибка при загрузке курса валют:', err);
      } finally {
        setIsRateLoading(false);
      }
    };
    fetchRates();
  }, []);

  useEffect(() => {
    if (data?.days?.[selectedDate]) {
      setDayForm(data.days[selectedDate].quantities || {});
    } else {
      setDayForm({});
    }
  }, [selectedDate, data?.days]);

  const selectedMonth = selectedDate.substring(0, 7);

  const currentMonthTotal = useMemo(() => {
    let total = 0;
    if (data?.days) {
      Object.entries(data.days).forEach(([date, record]) => {
        if (date.startsWith(selectedMonth)) {
          total += calcDayTotal(record.quantities, data.rates || record.rates);
        }
      });
    }
    return total;
  }, [data, selectedMonth]);

  const selectedDayTotal = useMemo(() => {
    let total = 0;
    if (data?.items && data?.rates) {
      data.items.forEach(item => {
        const qty = Number(dayForm[item.id]) || 0;
        const rate = data.rates[item.id] || 0;
        total += qty * rate;
      });
    }
    return total;
  }, [dayForm, data?.items, data?.rates]);

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style) } catch {}
  };

  const handleSaveDay = async () => {
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

  const checkHasData = (dateStr: string) => {
    const record = data?.days?.[dateStr];
    if (!record || !record.quantities) return false;
    return Object.values(record.quantities).some(v => v > 0);
  };

  const quickDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      dates.push(getLocalDateString(d));
    }
    if (!dates.includes(selectedDate)) {
      dates.push(selectedDate);
      dates.sort((a, b) => b.localeCompare(a));
    }
    return dates;
  }, [selectedDate]);

  const chartData = useMemo(() => {
    const last7Days = [];
    let maxVal = 1; 
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d); 
      
      const record = data?.days?.[dateStr];
      const total = record ? calcDayTotal(record.quantities, data.rates) : 0;
      if (total > maxVal) maxVal = total;
      
      const shortDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      last7Days.push({ date: shortDate, total });
    }
    return { data: last7Days, max: maxVal };
  }, [data?.days, data?.rates]);

  const hasChanges = useMemo(() => {
    const saved = data?.days?.[selectedDate]?.quantities || {};
    if (!data?.items) return false;
    for (const item of data.items) {
      const currentVal = Number(dayForm[item.id]) || 0;
      const savedVal = Number(saved[item.id]) || 0;
      if (currentVal !== savedVal) return true;
    }
    return false;
  }, [dayForm, data?.days, selectedDate, data?.items]);

  if (loading || error) return null; 

  const todayStr = getLocalDateString(new Date());

  const tabVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15, ease: "easeIn" } }
  };

  const localeStr = lang === 'de' ? 'de-DE' : lang === 'uk' ? 'uk-UA' : 'ru-RU';
  const monthName = new Date(selectedDate).toLocaleDateString(localeStr, { month: 'long', year: 'numeric' });
  const displayMonthName = monthName.split(' ')[0];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#0E0E0E] text-white pb-32 font-sans overflow-x-hidden selection:bg-[#0A84FF]/30">
      
      <div className="sticky top-0 z-50 p-4 flex items-center gap-4 bg-[#0E0E0E]/95 backdrop-blur-md border-b border-white/5">
        <button onClick={() => { triggerHaptic(); onBack(); }} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 active:scale-95 transition-transform text-white/70">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold leading-tight">{t.title}</h1>
          <div className="text-xs text-white/50 capitalize">{monthName}</div>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto relative">
        
        <div className="bg-gradient-to-br from-[#1C1C1E] to-[#121212] p-6 rounded-[28px] border border-white/5 shadow-xl">
          <div className="flex justify-between items-start mb-1">
            <span className="text-white/50 text-sm font-medium capitalize">{t.totalFor} {displayMonthName}</span>
            <span className="text-white/30 text-xs px-2 py-1 bg-black/20 rounded-lg flex items-center gap-1">
              {secCurrencyCode} {isRateLoading ? <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" /> : activeFiatRate.toFixed(2)}
            </span>
          </div>
          <div className="text-[40px] leading-none font-black text-[#32D74B] tracking-tight">
            {currentMonthTotal.toLocaleString()} <span className="text-2xl text-white/20 font-bold ml-1">{primaryCurrency}</span>
          </div>
          <div className="text-sm font-medium text-white/30 mt-2">
            ≈ {secCurrencySymbol}{(currentMonthTotal / activeFiatRate).toFixed(2)}
          </div>
          
          <div className="mt-5 pt-5 border-t border-white/5 flex justify-between items-center">
            <span className="text-white/50 text-sm">{t.selectedDay} ({getShortDate(selectedDate)}):</span>
            <span className="text-[#0A84FF] font-bold text-lg">{selectedDayTotal.toLocaleString()} {primaryCurrency}</span>
          </div>
        </div>

        <div className="flex bg-[#1C1C1E] p-1 rounded-2xl border border-white/5">
          {['daily', 'settings', 'archive'].map(tab => (
            <button 
              key={tab}
              onClick={() => { triggerHaptic(); setActiveTab(tab as any); }}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${
                activeTab === tab ? 'bg-[#32D74B] text-black shadow-md' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab === 'daily' ? t.tabDaily : tab === 'settings' ? t.tabSettings : t.tabArchive}
            </button>
          ))}
        </div>

        <div className="relative">
          <AnimatePresence mode="popLayout">
            {activeTab === 'daily' && (
              <motion.div key="daily" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 w-full">
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                    {quickDates.map((date) => {
                      const isSelected = selectedDate === date;
                      const isToday = date === todayStr;
                      const hasData = checkHasData(date);
                      
                      let buttonClass = 'bg-[#1C1C1E] text-white/60 hover:bg-white/10 border-transparent';
                      let labelClass = 'text-[#32D74B]';
                      
                      if (isSelected) {
                        buttonClass = 'bg-[#0A84FF] text-white shadow-lg shadow-[#0A84FF]/25 border-[#0A84FF]';
                        labelClass = 'text-white/80';
                      } else if (isToday) {
                        buttonClass = 'bg-[#0A84FF]/10 text-[#0A84FF] border-[#0A84FF]/50';
                        labelClass = 'text-[#0A84FF]';
                      }

                      return (
                        <button
                          key={date}
                          onClick={() => { triggerHaptic(); setSelectedDate(date); }}
                          className={`relative flex-shrink-0 px-5 py-3 rounded-2xl flex flex-col items-center justify-center min-w-[70px] transition-all border ${buttonClass}`}
                        >
                          <span className="text-base font-bold tracking-wide">{getShortDate(date)}</span>
                          {isToday && (
                            <span className={`text-[10px] font-bold mt-0.5 ${labelClass}`}>
                              {t.today}
                            </span>
                          )}
                          {hasData && (
                            <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#32D74B]'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex-shrink-0 w-14 h-14 mb-2 rounded-2xl bg-[#1C1C1E] flex items-center justify-center relative active:bg-white/10 border border-white/5 transition-colors cursor-pointer">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60 absolute pointer-events-none z-10">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    
                    <DatePicker 
                      selected={new Date(selectedDate)} 
                      onChange={(date: Date | null) => {
                        if (date) {
                          triggerHaptic();
                          setSelectedDate(getLocalDateString(date));
                        }
                      }} 
                      locale={getLocaleObj(lang)}
                      customInput={<button className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />}
                      popperPlacement="bottom-end"
                      renderDayContents={(day, date) => {
                        const dateStr = getLocalDateString(date);
                        const hasData = checkHasData(dateStr);
                        const isSelected = selectedDate === dateStr;
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const isHol = isHoliday(date, lang);
                        
                        const textColor = (isWeekend || isHol) && !isSelected ? 'text-[#FF453A]' : '';
                        
                        return (
                          <div className="relative flex items-center justify-center h-full w-full py-1">
                            <span className={textColor}>{day}</span>
                            {hasData && (
                              <span className={`absolute bottom-0 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#32D74B]'}`} />
                            )}
                          </div>
                        );
                      }}
                    />
                  </div>
                </div>

                {data.items.length > 0 && (
                  <div className="px-2 pt-2">
                    <h2 className="text-lg font-bold text-white/90">
                      {t.entryFor} <span className="text-[#0A84FF] ml-1">{selectedDate === todayStr ? t.today + ' (' + getShortDateName(selectedDate, lang) + ')' : getShortDateName(selectedDate, lang)}</span>
                    </h2>
                  </div>
                )}

                {data.items.length === 0 ? (
                  <div className="bg-[#1C1C1E] p-8 rounded-3xl border border-white/5 text-center">
                    <p className="text-white/40">{t.noItems}</p>
                    <button onClick={() => setActiveTab('settings')} className="mt-4 text-[#0A84FF] font-medium">{t.addInSettings}</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.items.map(item => (
                      <div key={item.id} className="bg-[#1C1C1E] p-5 rounded-[24px] border border-white/5 flex flex-col gap-4">
                        <div className="flex justify-between items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-lg text-white/90 truncate">{item.name}</div>
                            <div className="text-sm text-white/40">{data.rates[item.id]} {t.perPiece}</div>
                          </div>
                          
                          <div className="flex-shrink-0 flex items-center bg-black/20 rounded-2xl p-1 border border-white/5">
                            <button onClick={() => adjustQty(item.id, -1)} className="w-11 h-11 flex items-center justify-center text-2xl text-white/50 active:text-white active:bg-white/10 rounded-xl transition-colors">-</button>
                            <input 
                              type="number" 
                              inputMode="numeric"
                              value={dayForm[item.id] ?? ''}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                              className="w-12 h-11 text-center text-xl bg-transparent font-black text-white focus:outline-none"
                              placeholder="0"
                            />
                            <button onClick={() => adjustQty(item.id, 1)} className="w-11 h-11 flex items-center justify-center text-2xl text-white/50 active:text-white active:bg-white/10 rounded-xl transition-colors">+</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {[1, 5, 7, 9].map(num => (
                            <button 
                              key={num}
                              onClick={() => handleQuickAdd(item.id, num)}
                              className="py-3 bg-white/5 hover:bg-white/10 active:bg-[#0A84FF] active:text-white rounded-xl text-sm font-bold text-white/60 transition-colors"
                            >
                              +{num}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-[#1C1C1E] p-6 rounded-[24px] border border-white/5">
                  <h3 className="font-bold text-white/30 mb-6 text-xs uppercase tracking-[0.2em]">{t.activity7Days}</h3>
                  <div className="flex items-end justify-between h-32 gap-2 mt-4">
                    {chartData.data.map((day, i) => {
                      const height = Math.max((day.total / chartData.max) * 100, day.total > 0 ? 8 : 0);
                      const isToday = i === 6; 
                      
                      return (
                        <div key={i} className="flex flex-col items-center h-full flex-1 group gap-2">
                          <div className="w-full flex-1 relative flex justify-center items-end">
                            <div 
                              style={{ height: `${height}%` }}
                              className={`w-full max-w-[32px] rounded-lg transition-all duration-500 ease-out ${
                                isToday 
                                  ? 'bg-gradient-to-t from-[#32D74B]/40 to-[#32D74B]' 
                                  : 'bg-gradient-to-t from-white/10 to-white/20 group-hover:to-white/30'
                              }`}
                            />
                          </div>
                          <span className={`text-[10px] font-semibold ${isToday ? 'text-[#32D74B]' : 'text-white/30'}`}>
                            {day.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4 w-full">
                <div className="bg-[#1C1C1E] p-6 rounded-[24px] border border-white/5">
                  <h2 className="font-bold mb-5 text-lg text-white/90">{t.addItem}</h2>
                  <div className="flex flex-col gap-4 mb-5">
                    <input 
                      type="text" 
                      placeholder={t.namePlaceholder}
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                      className="w-full p-4.5 bg-black/20 text-white placeholder-white/30 rounded-2xl border border-white/5 focus:border-[#0A84FF] focus:outline-none transition-colors"
                    />
                    <input 
                      type="number" 
                      inputMode="decimal"
                      placeholder={t.pricePlaceholder}
                      value={newItemRate}
                      onChange={e => setNewItemRate(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-4.5 bg-black/20 text-white placeholder-white/30 rounded-2xl border border-white/5 focus:border-[#0A84FF] focus:outline-none transition-colors"
                    />
                  </div>
                  <button 
                    onClick={handleAddNewItem}
                    disabled={saving || !newItemName || newItemRate === ''}
                    className="w-full bg-[#0A84FF] text-white font-bold py-4 rounded-2xl active:scale-[0.98] disabled:opacity-30 transition-all shadow-lg shadow-[#0A84FF]/20"
                  >
                    {t.addBtn}
                  </button>
                </div>

                <div className="space-y-3">
                  {data.items.map(item => (
                    <div key={item.id} className="bg-[#1C1C1E] p-5 rounded-[20px] flex justify-between items-center border border-white/5">
                      <div className="min-w-0 pr-4">
                        <div className="font-bold text-white/90 truncate text-lg">{item.name}</div>
                        <div className="text-sm text-white/40 mt-1">{data.rates[item.id]} {t.perPiece}</div>
                      </div>
                      <button 
                        onClick={() => { if(confirm(t.confirmDelete)) deleteItem(item.id); }}
                        className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-[#FF453A] bg-[#FF453A]/10 rounded-2xl active:scale-90 transition-transform"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'archive' && (
              <motion.div key="archive" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4 w-full">
                <button 
                  onClick={() => { 
                    if(confirm(t.confirmArchive.replace('{month}', displayMonthName))) {
                      closeMonth(selectedMonth); 
                    }
                  }}
                  className="w-full bg-white/5 border border-dashed border-white/10 text-white/60 hover:text-white hover:bg-white/10 py-6 rounded-[24px] font-bold active:scale-[0.98] transition-all uppercase tracking-wider text-sm"
                >
                  {t.archiveBtn} {displayMonthName}
                </button>
                
                {Object.keys(data.archive).length === 0 ? (
                  <p className="text-center text-white/30 mt-8">{t.archiveEmpty}</p>
                ) : (
                  Object.entries(data.archive)
                    .sort(([monthA], [monthB]) => monthB.localeCompare(monthA))
                    .map(([month, archiveData]) => (
                      <div key={month} className="bg-[#1C1C1E] p-6 rounded-[24px] border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-lg capitalize">{formatMonth(month, lang)}</h3>
                          <span className="font-black text-xl text-[#32D74B]">
                            {archiveData.stats.total.toLocaleString()} {primaryCurrency}
                          </span>
                        </div>
                        <div className="text-sm text-white/40 mb-5">
                          {t.daysWorked} <span className="font-bold text-white/90">{archiveData.stats.days}</span>
                        </div>
                        
                        <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-sm space-y-3">
                          {Object.entries(archiveData.stats.quantities).map(([itemId, qty]) => {
                            if (!qty) return null;
                            const itemName = data.items.find(i => i.id === itemId)?.name || t.deletedItem;
                            return (
                              <div key={itemId} className="flex justify-between items-center">
                                <span className="text-white/50">{itemName}</span>
                                <span className="font-bold text-white/90">{qty} {t.pcs}</span>
                              </div>
                            );
                          })}
                        </div>
                        
                        <button 
                          onClick={() => { if(confirm(t.confirmDeleteArchive)) deleteArchiveMonth(month); }}
                          className="mt-5 text-xs text-[#FF453A]/80 w-full text-center py-2 active:opacity-50 transition-opacity uppercase tracking-wider font-bold"
                        >
                          {t.deleteRecord}
                        </button>
                      </div>
                    ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {activeTab === 'daily' && data.items.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-0 right-0 px-4 z-50 pointer-events-none"
          >
            <div className="max-w-2xl mx-auto pointer-events-auto">
              <button 
                onClick={handleSaveDay}
                disabled={saving || !hasChanges}
                className={`w-full font-bold text-lg py-5 rounded-[24px] active:scale-[0.97] transition-all border backdrop-blur-md ${
                  hasChanges 
                    ? 'bg-[#0A84FF] text-white shadow-2xl shadow-[#0A84FF]/40 border-white/10' 
                    : 'bg-[#1C1C1E]/80 text-white/30 border-white/5 shadow-none'
                }`}
              >
                {saving ? t.saving : hasChanges ? `${t.saveFor} ${getShortDateName(selectedDate, lang)}` : `${t.noChangesFor} ${getShortDateName(selectedDate, lang)} ${t.noChangesSuffix}`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
