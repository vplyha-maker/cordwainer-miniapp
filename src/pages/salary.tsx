import React, { useState, useMemo } from 'react';
import { useSalary } from '../hooks/useSalary';
import { getToday, formatDay, formatMonth, calcDayTotal, getCurrentMonth } from '../lib/salaryHelpers';

// Заглушка для получения ID пользователя (Telegram Mini App)
const TELEGRAM_USER_ID = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id 
  ? (window as any).Telegram.WebApp.initDataUnsafe.user.id 
  : 123456789; 

export default function SalaryCalcPage() {
  const {
    data, loading, saving, error,
    addItem, deleteItem, saveDay, closeMonth, deleteArchiveMonth
  } = useSalary({ userId: TELEGRAM_USER_ID });

  const [activeTab, setActiveTab] = useState<'daily' | 'settings' | 'archive'>('daily');
  
  // Состояния для формы добавления записи за день
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [dayForm, setDayForm] = useState<Record<string, number>>({});
  
  // Состояния для добавления нового изделия
  const [newItemName, setNewItemName] = useState('');
  const [newItemRate, setNewItemRate] = useState<number | ''>('');

  // Подсчет итогов текущего месяца на лету
  const currentMonthTotal = useMemo(() => {
    let total = 0;
    const month = getCurrentMonth();
    Object.entries(data.days).forEach(([date, record]) => {
      if (date.startsWith(month)) {
        total += calcDayTotal(record.quantities, record.rates);
      }
    });
    return total;
  }, [data.days]);

  if (loading) return <div className="p-4 text-center text-gray-500 animate-pulse">Загрузка данных...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Ошибка: {error}</div>;

  const handleSaveDay = async () => {
    if (Object.keys(dayForm).length === 0) return;
    await saveDay(selectedDate, dayForm);
    setDayForm({}); 
  };

  const handleAddNewItem = async () => {
    if (!newItemName || newItemRate === '') return;
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

  const currentMonth = getCurrentMonth();
  const currentMonthRecords = Object.entries(data.days)
    .filter(([date]) => date.startsWith(currentMonth))
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)); 

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-20 text-gray-800 font-sans">
      <div className="bg-blue-600 text-white p-4 rounded-b-2xl shadow-md">
        <h1 className="text-xl font-bold">Сдельная зарплата</h1>
        <div className="mt-2 text-3xl font-black">{currentMonthTotal.toLocaleString()} ₴</div>
        <div className="text-blue-200 text-sm">{formatMonth(currentMonth, 'ru')}</div>
      </div>

      <div className="flex justify-around bg-white p-2 mt-4 mx-4 rounded-xl shadow-sm">
        <button 
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'daily' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
        >
          Записи
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
        >
          Изделия
        </button>
        <button 
          onClick={() => setActiveTab('archive')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'archive' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
        >
          Архив
        </button>
      </div>

      {activeTab === 'daily' && (
        <div className="p-4 space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h2 className="font-bold mb-3">Внести выработку</h2>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2 border rounded-lg mb-4 bg-gray-50"
            />
            
            {data.items.length === 0 ? (
              <p className="text-sm text-gray-500 text-center">Сначала добавьте изделия во вкладке "Изделия"</p>
            ) : (
              <div className="space-y-3">
                {data.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">{data.rates[item.id]} ₴ / шт</div>
                    </div>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="0"
                      value={dayForm[item.id] || ''}
                      onChange={(e) => handleQtyChange(item.id, e.target.value)}
                      className="w-20 p-2 text-center border rounded-lg bg-gray-50"
                    />
                  </div>
                ))}
                <button 
                  onClick={handleSaveDay}
                  disabled={saving}
                  className="w-full mt-2 bg-blue-600 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                >
                  {saving ? 'Сохранение...' : 'Сохранить день'}
                </button>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold text-gray-500 mb-2 px-1">История за месяц</h3>
            {currentMonthRecords.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Нет записей в этом месяце</p>
            ) : (
              <div className="space-y-2">
                {currentMonthRecords.map(([date, record]) => (
                  <div key={date} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center border border-gray-50">
                    <div className="font-medium">{formatDay(date)}</div>
                    <div className="font-bold text-green-600">
                      +{calcDayTotal(record.quantities, record.rates).toLocaleString()} ₴
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {currentMonthRecords.length > 0 && (
              <button 
                onClick={() => closeMonth().catch(e => alert(e.message))}
                disabled={saving}
                className="w-full mt-6 bg-gray-800 text-white py-3 rounded-xl font-medium"
              >
                Закрыть месяц (в архив)
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="p-4 space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h2 className="font-bold mb-3">Новое изделие</h2>
            <div className="flex gap-2 mb-2">
              <input 
                type="text" 
                placeholder="Название (напр. Деталь А)"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                className="flex-1 p-2 border rounded-lg bg-gray-50"
              />
              <input 
                type="number" 
                placeholder="Цена, ₴"
                value={newItemRate}
                onChange={e => setNewItemRate(Number(e.target.value))}
                className="w-24 p-2 border rounded-lg bg-gray-50"
              />
            </div>
            <button 
              onClick={handleAddNewItem}
              disabled={saving || !newItemName || newItemRate === '' || data.items.length >= 10}
              className="w-full bg-blue-100 text-blue-700 font-bold py-2 rounded-lg disabled:opacity-50"
            >
              Добавить
            </button>
            {data.items.length >= 10 && <p className="text-xs text-red-400 mt-2 text-center">Достигнут лимит (10 изделий)</p>}
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-gray-500 mb-2 px-1">Мои изделия</h3>
            {data.items.map(item => (
              <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center">
                <div>
                  <div className="font-bold">{item.name}</div>
                  <div className="text-sm text-gray-500">{data.rates[item.id]} ₴ / шт</div>
                </div>
                <button 
                  onClick={() => { if(confirm('Удалить изделие?')) deleteItem(item.id) }}
                  className="text-red-500 p-2 bg-red-50 rounded-lg"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'archive' && (
        <div className="p-4 space-y-3">
          {Object.keys(data.archive).length === 0 ? (
            <p className="text-center text-gray-400 mt-10">Архив пуст</p>
          ) : (
            Object.entries(data.archive)
              .sort(([monthA], [monthB]) => monthB.localeCompare(monthA))
              .map(([month, archiveData]) => (
                <div key={month} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg">{formatMonth(month, 'ru')}</h3>
                    <span className="font-black text-xl text-green-600">
                      {archiveData.stats.total.toLocaleString()} ₴
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-3">
                    Отработано дней: <span className="font-bold">{archiveData.stats.days}</span>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                    {Object.entries(archiveData.stats.quantities).map(([itemId, qty]) => {
                      if (!qty) return null;
                      const itemName = data.items.find(i => i.id === itemId)?.name || 'Удаленное изделие';
                      return (
                        <div key={itemId} className="flex justify-between">
                          <span>{itemName}</span>
                          <span className="font-medium">{qty} шт.</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <button 
                    onClick={() => { if(confirm('Точно удалить этот месяц из архива?')) deleteArchiveMonth(month) }}
                    className="mt-3 text-xs text-red-400 w-full text-center py-2"
                  >
                    Удалить запись
                  </button>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}

