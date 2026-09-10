import React, { useState, useMemo, useEffect, useCallback } from 'react';
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

const HOLIDAYS_UA = ['01-01', '03-08', '05-01', '05-08', '06-28', '07-15', '08-24', '10-01', '12-25'];
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

const CustomCalendarInput = React.forwardRef<HTMLDivElement, any>(({ onClick }, ref) => (
  <div 
    onClick={onClick} 
    ref={ref}
    className="flex-shrink-0 w-[52px] h-[52px] mb-2 rounded-[16px] flex items-center justify-center relative active:scale-95 transition-transform cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--color-ink)] pointer-events-none">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  </div>
));

const getDictionary = (lang: Lang, curr: string) => {
  const dict = {
    ru: {
      title: 'Зарплата', totalFor: 'Итого за', selectedDay: 'За выбранный день',
      tabDaily: 'Записи', tabSettings: 'Изделия', tabArchive: 'Архив',
      today: 'Сегодня', entryFor: 'Внесение за:', noItems: 'Нет изделий для учета.',
      addInSettings: 'Добавить в настройках', perPiece: `${curr} / шт`,
      activity7Days: 'Активность (7 дней)', addItem: 'Добавить изделие',
      namePlaceholder: 'Название (например: Mac)', pricePlaceholder: `Стоимость за шт, ${curr}`,
      addBtn: 'Добавить', confirmDelete: 'Удалить изделие?',
      confirmArchive: 'Перенести {month} в архив? Все записи за этот месяц будут сгруппированы.',
      archiveBtn: '+ Заархивировать', archiveEmpty: 'Архив пуст',
      daysWorked: 'Дней отработано:', deletedItem: 'Удаленное изделие', pcs: 'шт.',
      confirmDeleteArchive: 'Точно удалить этот месяц из архива?', deleteRecord: 'Удалить запись',
      saving: 'Сохранение...', saveFor: 'Сохранить за', noChangesFor: 'Изменений за', noChangesSuffix: 'нет',
    },
    uk: {
      title: 'Зарплата', totalFor: 'Разом за', selectedDay: 'За обраний день',
      tabDaily: 'Записи', tabSettings: 'Вироби', tabArchive: 'Архів',
      today: 'Сьогодні', entryFor: 'Внесення за:', noItems: 'Немає виробів для обліку.',
      addInSettings: 'Додати в налаштуваннях', perPiece: `${curr} / шт`,
      activity7Days: 'Активність (7 днів)', addItem: 'Додати виріб',
      namePlaceholder: 'Назва (наприклад: Mac)', pricePlaceholder: `Вартість за шт, ${curr}`,
      addBtn: 'Додати', confirmDelete: 'Видалити виріб?',
      confirmArchive: 'Перенести {month} в архів? Усі записи за цей місяць будуть згруповані.',
      archiveBtn: '+ Заархівувати', archiveEmpty: 'Архів порожній',
      daysWorked: 'Днів відпрацьовано:', deletedItem: 'Видалений виріб', pcs: 'шт.',
      confirmDeleteArchive: 'Точно видалити цей місяць з архіву?', deleteRecord: 'Видалити запис',
      saving: 'Збереження...', saveFor: 'Зберегти за', noChangesFor: 'Змін за', noChangesSuffix: 'немає',
    },
    de: {
      title: 'Lohn', totalFor: 'Gesamt für', selectedDay: 'Für den gewählten Tag',
      tabDaily: 'Einträge', tabSettings: 'Artikel', tabArchive: 'Archiv',
      today: 'Heute', entryFor: 'Eintrag für:', noItems: 'Keine Artikel zur Erfassung.',
      addInSettings: 'In Einstellungen hinzufügen', perPiece: `${curr} / Stk`,
      activity7Days: 'Aktivität (7 Tage)', addItem: 'Artikel hinzufügen',
      namePlaceholder: 'Name (z.B. Mac)', pricePlaceholder: `Stückpreis, ${curr}`,
      addBtn: 'Hinzufügen', confirmDelete: 'Artikel löschen?',
      confirmArchive: '{month} ins Archiv verschieben? Alle Einträge für diesen Monat werden gruppiert.',
      archiveBtn: '+ Archivieren', archiveEmpty: 'Archiv ist leer',
      daysWorked: 'Gearbeitete Tage:', deletedItem: 'Gelöschter Artikel', pcs: 'Stk.',
      confirmDeleteArchive: 'Diesen Monat wirklich aus dem Archiv löschen?', deleteRecord: 'Eintrag löschen',
      saving: 'Speichern...', saveFor: "Speichern für", noChangesFor: 'Keine Änderungen für', noChangesSuffix: '',
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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
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
            setFiatRates({ USD: Number(ratesData.usd || 41.50), EUR: Number(ratesData.eur || 45.00) });
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

  // Синхронизация формы ТОЛЬКО при загрузке новых данных по сети
  useEffect(() => {
    setDayForm(data?.days?.[selectedDate]?.quantities || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // АТОМАРНАЯ смена даты: меняем и дату, и форму одновременно, чтобы не было "черной вспышки" кнопки
  const changeDate = useCallback((newDate: string) => {
    setSelectedDate(newDate);
    setDayForm(data?.days?.[newDate]?.quantities || {});
  }, [data?.days]);

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

  const [sYear, sMonth, sDay] = selectedDate.split('-');
  const currentSelectedDateObj = new Date(Number(sYear), Number(sMonth) - 1, Number(sDay));

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)] pb-32 font-sans antialiased [-webkit-tap-highlight-color:transparent]">
      
      <style>{`
        .react-datepicker-popper {
          z-index: 9999 !important;
        }
        .react-datepicker {
          background-color: var(--color-surface) !important;
          border: 1px solid var(--color-border) !important;
          font-family: inherit !important;
          border-radius: 20px !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
          padding: 12px 8px !important;
        }
        .react-datepicker__header {
          background-color: transparent !important;
          border-bottom: none !important;
          padding-top: 0 !important;
        }
        .react-datepicker__current-month {
          color: var(--color-ink) !important;
          font-weight: 700 !important;
          font-size: 1.1rem !important;
          text-transform: capitalize;
          margin-bottom: 12px !important;
        }
        .react-datepicker__day-name {
          color: var(--color-muted) !important;
          font-weight: 700 !important;
          font-size: 0.8rem !important;
        }
        .react-datepicker__day {
          color: var(--color-ink) !important;
          border-radius: 50% !important;
          width: 2.2rem !important;
          height: 2.2rem !important;
          margin: 0.2rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          font-weight: 500 !important;
        }
        .react-datepicker__day:hover {
          background-color: var(--color-border) !important;
        }
        .react-datepicker__day--selected {
          background-color: var(--color-ink) !important;
          color: var(--color-bg) !important;
          font-weight: bold !important;
        }
        .react-datepicker__day--keyboard-selected:not(.react-datepicker__day--selected) {
          background-color: transparent !important;
        }
        .react-datepicker__day--outside-month {
          color: color-mix(in srgb, var(--color-muted) 50%, transparent) !important;
        }
        .react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle {
          fill: var(--color-surface) !important;
          color: var(--color-surface) !important;
          stroke: var(--color-border) !important;
        }
        .react-datepicker__navigation-icon::before {
          border-color: var(--color-muted) !important;
        }
        .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
          border-color: var(--color-ink) !important;
        }
      `}</style>

      {/* УБРАН blur и backdrop-filter, убран transition. Только сплошной фон. */}
      <div 
        className={`sticky top-0 px-4 md:px-6 pt-5 pb-3 flex items-center gap-4 bg-[var(--color-bg)] border-b border-[var(--color-border)] ${isCalendarOpen ? 'z-[60]' : 'z-50'}`}
      >
        <button 
          onClick={() => { triggerHaptic(); onBack(); }} 
          className="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm active:scale-90 transition-transform text-[var(--color-ink)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div>
          <h1 className="text-[17px] font-bold leading-tight text-[var(--color-ink)]">{t.title}</h1>
          <div className="text-[12px] font-medium text-[var(--color-muted)] capitalize mt-0.5">{monthName}</div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto relative">
        
        <div className="bg-[var(--color-surface)] p-5 md:p-6 rounded-[24px] border border-[var(--color-border)] shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[var(--color-muted)] text-[13px] font-bold capitalize">{t.totalFor} {displayMonthName}</span>
            <span className="text-[var(--color-muted)] text-[11px] font-bold px-2.5 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[8px] flex items-center gap-1.5 shadow-sm">
              {secCurrencyCode} {isRateLoading ? <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--color-muted)] border-t-[var(--color-ink)] animate-spin" /> : activeFiatRate.toFixed(2)}
            </span>
          </div>
          <div className="text-[44px] md:text-[52px] leading-none font-bold tracking-tight text-[var(--pigment-malachite, #047857)]">
            {currentMonthTotal.toLocaleString()} <span className="text-[22px] md:text-[26px] text-[var(--color-muted)] font-bold ml-1">{primaryCurrency}</span>
          </div>
          <div className="text-[14px] font-bold text-[var(--color-muted)] mt-2">
            ≈ {secCurrencySymbol}{(currentMonthTotal / activeFiatRate).toFixed(2)}
          </div>
          
          <div className="mt-5 pt-4 border-t border-[var(--color-border)] flex justify-between items-center">
            <span className="text-[var(--color-muted)] text-[13px] font-bold">{t.selectedDay} ({getShortDate(selectedDate)}):</span>
            <span className="text-[var(--color-ink)] font-bold text-[18px]">{selectedDayTotal.toLocaleString()} {primaryCurrency}</span>
          </div>
        </div>

        <div className="flex bg-[var(--color-bg)] p-1.5 rounded-[18px] border border-[var(--color-border)] shadow-inner">
          {['daily', 'settings', 'archive'].map(tab => (
            <button 
              key={tab}
              onClick={() => { triggerHaptic(); setActiveTab(tab as any); }}
              className={`flex-1 py-2.5 text-[13px] font-bold rounded-[14px] transition-colors ${
                activeTab === tab ? 'bg-[var(--color-ink)] text-[var(--color-bg)] shadow-sm' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {tab === 'daily' ? t.tabDaily : tab === 'settings' ? t.tabSettings : t.tabArchive}
            </button>
          ))}
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            {/* DAILY TAB */}
            {activeTab === 'daily' && (
              <motion.div key="daily" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5 w-full">
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex overflow-x-auto gap-2.5 pb-2 scrollbar-hide items-end">
                    {quickDates.map((date) => {
                      const isSelected = selectedDate === date;
                      const isToday = date === todayStr;
                      const hasData = checkHasData(date);
                      
                      let buttonClass = 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-ink)] shadow-sm';
                      let labelClass = 'text-[var(--color-ink)]';
                      
                      if (isSelected) {
                        buttonClass = 'bg-[var(--color-ink)] text-[var(--color-bg)] shadow-md border-[var(--color-ink)]';
                        labelClass = 'text-[var(--color-bg)] opacity-80';
                      } else if (isToday) {
                        buttonClass = 'bg-[color-mix(in_srgb,var(--color-ink)_10%,transparent)] text-[var(--color-ink)] border-[color-mix(in_srgb,var(--color-ink)_30%,transparent)]';
                        labelClass = 'text-[var(--color-ink)]';
                      }

                      return (
                        <button
                          key={date}
                          onClick={() => { triggerHaptic('light'); changeDate(date); }}
                          className={`relative flex-shrink-0 px-4 py-3 rounded-[16px] flex flex-col items-center justify-center min-w-[68px] border ${buttonClass}`}
                        >
                          <span className="text-[15px] font-bold tracking-wide">{getShortDate(date)}</span>
                          {isToday && (
                            <span className={`text-[10px] font-bold mt-0.5 ${labelClass}`}>
                              {t.today}
                            </span>
                          )}
                          {/* Индикатор наличия данных — четкая точка */}
                          {hasData && (
                            <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isSelected ? 'bg-[var(--color-bg)]' : 'bg-[var(--pigment-malachite, #047857)]'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <DatePicker 
                    selected={currentSelectedDateObj} 
                    onChange={(date: Date | null) => {
                      if (date) {
                        triggerHaptic('light');
                        changeDate(getLocalDateString(date));
                      }
                    }} 
                    onCalendarOpen={() => setIsCalendarOpen(true)}
                    onCalendarClose={() => setIsCalendarOpen(false)}
                    locale={getLocaleObj(lang)}
                    customInput={<CustomCalendarInput />}
                    popperPlacement="bottom-end"
                    renderDayContents={(day, date) => {
                      if (!date) return <span>{day}</span>;

                      const dateStr = getLocalDateString(date);
                      const hasData = checkHasData(dateStr);
                      const isSelected = selectedDate === dateStr;
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const isHol = isHoliday(date, lang);
                      const isOffDay = isWeekend || isHol;
                      
                      let circleClasses = 'border-[2px] border-transparent';
                      let textClasses = 'text-[var(--color-ink)]';

                      if (isSelected) {
                        circleClasses = 'bg-[var(--color-ink)] border-[var(--color-ink)]';
                        textClasses = 'text-[var(--color-bg)]';
                      } else {
                        // Жесткая красная обводка для выходных/праздников
                        if (isOffDay) {
                          circleClasses = 'border-[2px] border-[#EF4444]'; 
                          textClasses = 'text-[#EF4444]';
                        } else if (hasData) {
                          circleClasses = 'border-[2px] border-[var(--color-ink)]';
                        }
                      }
                      
                      return (
                        <div className={`flex items-center justify-center w-full h-full rounded-full box-border ${circleClasses}`}>
                          <span className={`text-[13px] font-bold ${textClasses}`}>{day}</span>
                        </div>
                      );
                    }}
                  />
                </div>

                {data.items.length > 0 && (
                  <div className="px-2 pt-1">
                    <h2 className="text-[16px] font-bold text-[var(--color-ink)]">
                      {t.entryFor} <span className="opacity-80 ml-1">{selectedDate === todayStr ? t.today + ' (' + getShortDateName(selectedDate, lang) + ')' : getShortDateName(selectedDate, lang)}</span>
                    </h2>
                  </div>
                )}

                {data.items.length === 0 ? (
                  <div className="bg-[var(--color-surface)] p-8 rounded-[24px] border border-[var(--color-border)] shadow-sm text-center">
                    <p className="text-[var(--color-muted)] font-bold text-[14px]">{t.noItems}</p>
                    <button onClick={() => setActiveTab('settings')} className="mt-4 text-[var(--color-ink)] font-bold underline decoration-2 underline-offset-4">{t.addInSettings}</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.items.map(item => (
                      <div key={item.id} className="bg-[var(--color-surface)] p-4 md:p-5 rounded-[24px] border border-[var(--color-border)] shadow-sm flex flex-col gap-4">
                        <div className="flex justify-between items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[16px] text-[var(--color-ink)] truncate">{item.name}</div>
                            <div className="text-[12px] font-medium text-[var(--color-muted)] mt-1">{data.rates[item.id]} {t.perPiece}</div>
                          </div>
                          
                          <div className="flex-shrink-0 flex items-center bg-[var(--color-bg)] rounded-[16px] p-1 border border-[var(--color-border)]">
                            <button onClick={() => adjustQty(item.id, -1)} className="w-10 h-10 flex items-center justify-center text-xl font-bold text-[var(--color-muted)] hover:text-[var(--color-ink)] active:bg-[color-mix(in_srgb,var(--color-ink)_10%,transparent)] rounded-[12px] transition-colors">-</button>
                            <input 
                              type="number" 
                              inputMode="numeric"
                              value={dayForm[item.id] ?? ''}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                              className="w-12 h-10 text-center text-[18px] bg-transparent font-black text-[var(--color-ink)] focus:outline-none tabular-nums"
                              placeholder="0"
                            />
                            <button onClick={() => adjustQty(item.id, 1)} className="w-10 h-10 flex items-center justify-center text-xl font-bold text-[var(--color-muted)] hover:text-[var(--color-ink)] active:bg-[color-mix(in_srgb,var(--color-ink)_10%,transparent)] rounded-[12px] transition-colors">+</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {[1, 5, 10, 20].map(num => (
                            <button 
                              key={num}
                              onClick={() => handleQuickAdd(item.id, num)}
                              className="py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] active:scale-95 active:bg-[var(--color-ink)] active:text-[var(--color-bg)] rounded-[14px] text-[13px] font-bold text-[var(--color-ink)] transition-transform shadow-sm"
                            >
                              +{num}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-[var(--color-surface)] p-5 rounded-[24px] border border-[var(--color-border)] shadow-sm mt-6">
                  <h3 className="font-bold text-[var(--color-muted)] mb-5 text-[11px] uppercase tracking-[0.2em]">{t.activity7Days}</h3>
                  <div className="flex items-end justify-between h-[120px] gap-2 mt-4">
                    {chartData.data.map((day, i) => {
                      const height = Math.max((day.total / chartData.max) * 100, day.total > 0 ? 8 : 0);
                      const isToday = i === 6; 
                      
                      return (
                        <div key={i} className="flex flex-col items-center h-full flex-1 group gap-2.5">
                          <div className="w-full flex-1 relative flex justify-center items-end">
                            <div 
                              style={{ height: `${height}%` }}
                              className={`w-full max-w-[32px] rounded-[6px] transition-all duration-500 ease-out ${
                                isToday 
                                  ? 'bg-[var(--color-ink)] shadow-md' 
                                  : 'bg-[var(--color-border)] group-hover:bg-[color-mix(in_srgb,var(--color-border)_80%,var(--color-ink))]'
                              }`}
                            />
                          </div>
                          <span className={`text-[10px] font-bold ${isToday ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]'}`}>
                            {day.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <motion.div key="settings" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4 w-full">
                <div className="bg-[var(--color-surface)] p-5 md:p-6 rounded-[24px] border border-[var(--color-border)] shadow-sm">
                  <h2 className="font-bold mb-4 text-[16px] text-[var(--color-ink)]">{t.addItem}</h2>
                  <div className="flex flex-col gap-3 mb-5">
                    <input 
                      type="text" 
                      placeholder={t.namePlaceholder}
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                      className="w-full p-4 bg-[var(--color-bg)] text-[var(--color-ink)] placeholder-[var(--color-muted)] font-medium rounded-[16px] border border-[var(--color-border)] focus:border-[var(--color-ink)] focus:outline-none transition-colors"
                    />
                    <input 
                      type="number" 
                      inputMode="decimal"
                      placeholder={t.pricePlaceholder}
                      value={newItemRate}
                      onChange={e => setNewItemRate(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-4 bg-[var(--color-bg)] text-[var(--color-ink)] placeholder-[var(--color-muted)] font-medium rounded-[16px] border border-[var(--color-border)] focus:border-[var(--color-ink)] focus:outline-none transition-colors tabular-nums"
                    />
                  </div>
                  <button 
                    onClick={handleAddNewItem}
                    disabled={saving || !newItemName || newItemRate === ''}
                    className="w-full bg-[var(--color-ink)] text-[var(--color-bg)] font-bold py-4 rounded-[16px] active:scale-[0.98] disabled:opacity-30 transition-transform shadow-md"
                  >
                    {t.addBtn}
                  </button>
                </div>

                <div className="space-y-3">
                  {data.items.map(item => (
                    <div key={item.id} className="bg-[var(--color-surface)] p-4 md:p-5 rounded-[20px] flex justify-between items-center border border-[var(--color-border)] shadow-sm">
                      <div className="min-w-0 pr-4">
                        <div className="font-bold text-[var(--color-ink)] truncate text-[16px]">{item.name}</div>
                        <div className="text-[12px] font-medium text-[var(--color-muted)] mt-1">{data.rates[item.id]} {t.perPiece}</div>
                      </div>
                      <button 
                        onClick={() => { if(confirm(t.confirmDelete)) deleteItem(item.id); }}
                        className="flex-shrink-0 w-11 h-11 flex items-center justify-center text-[var(--pigment-lac-dye, #E11D48)] bg-[color-mix(in_srgb,var(--pigment-lac-dye,#E11D48)_10%,var(--color-surface))] rounded-[14px] border border-[color-mix(in_srgb,var(--pigment-lac-dye,#E11D48)_30%,transparent)] active:scale-90 transition-transform"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ARCHIVE TAB */}
            {activeTab === 'archive' && (
              <motion.div key="archive" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4 w-full">
                <button 
                  onClick={() => { 
                    if(confirm(t.confirmArchive.replace('{month}', displayMonthName))) {
                      closeMonth(selectedMonth); 
                    }
                  }}
                  className="w-full bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)] text-[var(--color-ink)] hover:bg-[var(--color-border)] py-5 rounded-[24px] font-bold active:scale-[0.98] transition-colors uppercase tracking-wider text-[12px]"
                >
                  {t.archiveBtn} {displayMonthName}
                </button>
                
                {Object.keys(data.archive).length === 0 ? (
                  <p className="text-center text-[var(--color-muted)] font-bold mt-8 text-[14px]">{t.archiveEmpty}</p>
                ) : (
                  Object.entries(data.archive)
                    .sort(([monthA], [monthB]) => monthB.localeCompare(monthA))
                    .map(([month, archiveData]) => (
                      <div key={month} className="bg-[var(--color-surface)] p-5 rounded-[24px] border border-[var(--color-border)] shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-[16px] capitalize text-[var(--color-ink)]">{formatMonth(month, lang)}</h3>
                          <span className="font-black text-[20px] text-[var(--pigment-malachite, #047857)]">
                            {archiveData.stats.total.toLocaleString()} {primaryCurrency}
                          </span>
                        </div>
                        <div className="text-[12px] font-medium text-[var(--color-muted)] mb-4">
                          {t.daysWorked} <span className="font-bold text-[var(--color-ink)] ml-1">{archiveData.stats.days}</span>
                        </div>
                        
                        <div className="bg-[var(--color-bg)] p-4 rounded-[16px] border border-[var(--color-border)] text-[13px] space-y-3">
                          {Object.entries(archiveData.stats.quantities).map(([itemId, qty]) => {
                            if (!qty) return null;
                            const itemName = data.items.find(i => i.id === itemId)?.name || t.deletedItem;
                            return (
                              <div key={itemId} className="flex justify-between items-center">
                                <span className="text-[var(--color-muted)] font-medium">{itemName}</span>
                                <span className="font-bold text-[var(--color-ink)]">{qty} <span className="text-[10px] font-medium opacity-70 ml-0.5">{t.pcs}</span></span>
                              </div>
                            );
                          })}
                        </div>
                        
                        <button 
                          onClick={() => { if(confirm(t.confirmDeleteArchive)) deleteArchiveMonth(month); }}
                          className="mt-4 text-[11px] text-[var(--pigment-lac-dye, #E11D48)] w-full text-center py-2 active:opacity-50 transition-opacity uppercase tracking-wider font-bold"
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

      {/* Без транзишенов, чтобы избежать подергиваний при рендеринге */}
      <AnimatePresence>
        {activeTab === 'daily' && data.items.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }}
            className={`fixed bottom-6 left-0 right-0 px-4 pointer-events-none bg-transparent ${isCalendarOpen ? 'z-10' : 'z-50'}`}
          >
            <div className="max-w-2xl mx-auto pointer-events-auto">
              <button 
                onClick={handleSaveDay}
                disabled={saving || !hasChanges}
                className={`w-full font-bold text-[15px] py-4 rounded-[20px] active:scale-[0.98] transition-transform shadow-md ${
                  hasChanges 
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border border-[var(--color-ink)]' 
                    : 'bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]'
                }`}
              >
                {saving ? t.saving : hasChanges ? `${t.saveFor} ${getShortDateName(selectedDate, lang)}` : `${t.noChangesFor} ${getShortDateName(selectedDate, lang)} ${t.noChangesSuffix}`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
