import { useState, useEffect } from 'react';
import { type CartItem } from '../data/catalog';

declare global {
  interface ImportMeta {
    readonly env: Record<string, string | undefined>;
  }
}

type WholesaleCartProps = {
  items: CartItem[];
  onUpdateQuantity: (uid: string, newBoxesCount: number) => void;
  onRemove: (uid: string) => void;
  onClear: () => void;
  onClose: () => void;
};

type CityOption = {
  name: string;
  uaName: string;
  fullLabel: string;
  ref: string;
  zoneMultiplier: number;
};

type WarehouseOption = {
  ref: string;
  number: string;
  description: string;
};

const MANAGERS = [
  { label: 'Отправить заказ • Борис', telegramId: '8529254699', name: 'Борис' },
  { label: 'Отправить заказ • Георгий', telegramId: '6034597342', name: 'Георгий' },
  { label: 'Отправить заказ • Test', telegramId: '8686072747', name: 'Test' },
];

const NP_API_KEY = import.meta.env.VITE_NP_API_KEY || '';
const KHARKIV_CITY_REF = 'db5c88e0-391c-11dd-90d9-001a92567626';

const POPULAR_CITIES: CityOption[] = [
  { name: 'Киев', uaName: 'Київ', fullLabel: 'г. Киев (Київ)', ref: '8d5a980d-391c-11dd-90d9-001a92567626', zoneMultiplier: 1 },
  { name: 'Днепр', uaName: 'Дніпро', fullLabel: 'г. Днепр (Дніпро)', ref: 'db5c88f0-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.9 },
  { name: 'Одесса', uaName: 'Одеса', fullLabel: 'г. Одесса (Одеса)', ref: 'db5c88d0-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Львов', uaName: 'Львів', fullLabel: 'г. Львов (Львів)', ref: 'db5c88f5-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.1 },
  { name: 'Харьков', uaName: 'Харків', fullLabel: 'г. Харьков (Харків)', ref: 'db5c88e0-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.7 },
  { name: 'Полтава', uaName: 'Полтава', fullLabel: 'г. Полтава', ref: 'db5c8892-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.85 },
  { name: 'Запорожье', uaName: 'Запоріжжя', fullLabel: 'г. Запорожье (Запоріжжя)', ref: 'db5c88c6-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.95 },
  { name: 'Винница', uaName: 'Вінниця', fullLabel: 'г. Винница (Вінниця)', ref: 'db5c88de-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
];

// Встроенный справочник городов Украины для мгновенного поиска на укр. и рус. языках
const UKRAINE_CITIES_DIRECTORY: CityOption[] = [
  ...POPULAR_CITIES,
  { name: 'Миколаїв', uaName: 'Миколаїв', fullLabel: 'г. Миколаїв / Николаев (Миколаївська обл.)', ref: 'db5c888c-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Суми', uaName: 'Суми', fullLabel: 'г. Суми / Сумы (Сумська обл.)', ref: 'db5c88e5-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.85 },
  { name: 'Черкаси', uaName: 'Черкаси', fullLabel: 'г. Черкаси / Черкассы (Черкаська обл.)', ref: 'db5c8902-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.95 },
  { name: 'Чернігів', uaName: 'Чернігів', fullLabel: 'г. Чернігів / Чернигов (Чернігівська обл.)', ref: 'db5c897c-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.0 },
  { name: 'Житомир', uaName: 'Житомир', fullLabel: 'г. Житомир (Житомирська обл.)', ref: 'db5c88c4-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Хмельницький', uaName: 'Хмельницький', fullLabel: 'г. Хмельницький / Хмельницкий', ref: 'db5c88ac-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Чернівці', uaName: 'Чернівці', fullLabel: 'г. Чернівці / Черновцы (Чернівецька обл.)', ref: 'e221d627-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.1 },
  { name: 'Рівне', uaName: 'Рівне', fullLabel: 'г. Рівне / Ровно (Рівненська обл.)', ref: 'db5c896a-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Луцьк', uaName: 'Луцьк', fullLabel: 'г. Луцьк / Луцк (Волинська обл.)', ref: 'db5c893b-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.1 },
  { name: 'Тернопіль', uaName: 'Тернопіль', fullLabel: 'г. Тернопіль / Тернополь (Тернопільська обл.)', ref: 'db5c8900-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.1 },
  { name: 'Івано-Франківськ', uaName: 'Івано-Франківськ', fullLabel: 'г. Івано-Франківськ / Ивано-Франковск', ref: 'db5c8904-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.1 },
  { name: 'Ужгород', uaName: 'Ужгород', fullLabel: 'г. Ужгород (Закарпатська обл.)', ref: 'e221d642-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.15 },
  { name: 'Кропивницький', uaName: 'Кропивницький', fullLabel: 'г. Кропивницький / Кропивницкий', ref: 'db5c891b-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.95 },
  { name: 'Херсон', uaName: 'Херсон', fullLabel: 'г. Херсон (Херсонська обл.)', ref: 'db5c88cc-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Кривий Ріг', uaName: 'Кривий Ріг', fullLabel: 'г. Кривий Ріг / Кривой Рог (Дніпропетровська обл.)', ref: 'db5c890d-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.95 },
  { name: 'Кременчук', uaName: 'Кременчук', fullLabel: 'г. Кременчук / Кременчуг (Полтавська обл.)', ref: 'db5c8915-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.9 },
  { name: 'Біла Церква', uaName: 'Біла Церква', fullLabel: 'г. Біла Церква / Белая Церковь (Київська обл.)', ref: 'db5c88de-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.0 },
  { name: 'Кам’янське', uaName: 'Кам’янське', fullLabel: 'г. Кам’янське / Каменское (Дніпропетровська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Павлоград', uaName: 'Павлоград', fullLabel: 'г. Павлоград (Дніпропетровська обл.)', ref: '', zoneMultiplier: 0.85 },
  { name: 'Нікополь', uaName: 'Нікополь', fullLabel: 'г. Нікополь / Никополь (Дніпропетровська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Умань', uaName: 'Умань', fullLabel: 'г. Умань (Черкаська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Бровари', uaName: 'Бровари', fullLabel: 'г. Бровари / Бровары (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Бориспіль', uaName: 'Бориспіль', fullLabel: 'г. Бориспіль / Борисполь (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Ірпінь', uaName: 'Ірпінь', fullLabel: 'г. Ірпінь / Ирпень (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Буча', uaName: 'Буча', fullLabel: 'г. Буча (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Фастів', uaName: 'Фастів', fullLabel: 'г. Фастів / Фастов (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Обухів', uaName: 'Обухів', fullLabel: 'г. Обухів / Обухов (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Бердичів', uaName: 'Бердичів', fullLabel: 'г. Бердичів / Бердичев (Житомирська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Коростень', uaName: 'Коростень', fullLabel: 'г. Коростень (Житомирська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Звягель', uaName: 'Звягель', fullLabel: 'г. Звягель / Новоград-Волинський (Житомирська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Ніжин', uaName: 'Ніжин', fullLabel: 'г. Ніжин / Нежин (Чернігівська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Прилуки', uaName: 'Прилуки', fullLabel: 'г. Прилуки (Чернігівська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Конотоп', uaName: 'Конотоп', fullLabel: 'г. Конотоп (Сумська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Шостка', uaName: 'Шостка', fullLabel: 'г. Шостка (Сумська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Охтирка', uaName: 'Охтирка', fullLabel: 'г. Охтирка / Ахтырка (Сумська обл.)', ref: '', zoneMultiplier: 0.85 },
  { name: 'Ромни', uaName: 'Ромни', fullLabel: 'г. Ромни / Ромны (Сумська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Лубни', uaName: 'Лубни', fullLabel: 'г. Лубни / Лубны (Полтавська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Миргород', uaName: 'Миргород', fullLabel: 'г. Миргород (Полтавська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Горішні Плавні', uaName: 'Горішні Плавні', fullLabel: 'г. Горішні Плавні (Полтавська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Олександрія', uaName: 'Олександрія', fullLabel: 'г. Олександрія / Александрия (Кіровоградська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Світловодськ', uaName: 'Світловодськ', fullLabel: 'г. Світловодськ / Светловодск (Кіровоградська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Сміла', uaName: 'Сміла', fullLabel: 'г. Сміла / Смела (Черкаська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Золотоноша', uaName: 'Золотоноша', fullLabel: 'г. Золотоноша (Черкаська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Ізмаїл', uaName: 'Ізмаїл', fullLabel: 'г. Ізмаїл / Измаил (Одеська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Чорноморськ', uaName: 'Чорноморськ', fullLabel: 'г. Чорноморськ / Черноморск (Одеська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Білгород-Дністровський', uaName: 'Білгород-Дністровський', fullLabel: 'г. Білгород-Дністровський (Одеська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Подільськ', uaName: 'Подільськ', fullLabel: 'г. Подільськ / Подольск (Одеська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Первомайськ', uaName: 'Первомайськ', fullLabel: 'г. Первомайськ / Первомайск (Миколаївська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Вознесенськ', uaName: 'Вознесенськ', fullLabel: 'г. Вознесенськ / Вознесенск (Миколаївська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Південноукраїнськ', uaName: 'Південноукраїнськ', fullLabel: 'г. Південноукраїнськ / Южноукраинск (Миколаївська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Кам’янець-Подільський', uaName: 'Кам’янець-Подільський', fullLabel: 'г. Кам’янець-Подільський (Хмельницька обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Шепетівка', uaName: 'Шепетівка', fullLabel: 'г. Шепетівка / Шепетовка (Хмельницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Ковель', uaName: 'Ковель', fullLabel: 'г. Ковель (Волинська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Нововолинськ', uaName: 'Нововолинськ', fullLabel: 'г. Нововолинськ (Волинська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Володимир', uaName: 'Володимир', fullLabel: 'г. Володимир / Владимир (Волинська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Дрогобич', uaName: 'Дрогобич', fullLabel: 'г. Дрогобич (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Стрий', uaName: 'Стрий', fullLabel: 'г. Стрий / Стрый (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Шептицький', uaName: 'Червоноград', fullLabel: 'г. Шептицький / Червоноград (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Самбір', uaName: 'Самбір', fullLabel: 'г. Самбір / Самбор (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Трускавець', uaName: 'Трускавець', fullLabel: 'г. Трускавець / Трускавец (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Калуш', uaName: 'Калуш', fullLabel: 'г. Калуш (Івано-Франківська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Коломия', uaName: 'Коломия', fullLabel: 'г. Коломия / Коломыя (Івано-Франківська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Мукачево', uaName: 'Мукачево', fullLabel: 'г. Мукачево (Закарпатська обл.)', ref: '', zoneMultiplier: 1.15 },
  { name: 'Хуст', uaName: 'Хуст', fullLabel: 'г. Хуст (Закарпатська обл.)', ref: '', zoneMultiplier: 1.15 },
  { name: 'Лозова', uaName: 'Лозова', fullLabel: 'г. Лозова / Лозовая (Харківська обл.)', ref: '', zoneMultiplier: 0.8 },
  { name: 'Чугуїв', uaName: 'Чугуїв', fullLabel: 'г. Чугуїв / Чугуев (Харківська обл.)', ref: '', zoneMultiplier: 0.75 },
  { name: 'Ізюм', uaName: 'Ізюм', fullLabel: 'г. Ізюм / Изюм (Харківська обл.)', ref: '', zoneMultiplier: 0.8 },
  { name: 'Берестин', uaName: 'Красноград', fullLabel: 'г. Берестин / Красноград (Харківська обл.)', ref: '', zoneMultiplier: 0.8 },
];

export function WholesaleCart({ items, onUpdateQuantity, onRemove, onClear, onClose }: WholesaleCartProps) {
  const [selectedCity, setSelectedCity] = useState<CityOption>(POPULAR_CITIES[0]);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<CityOption[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);

  const [branchOrComment, setBranchOrComment] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [deliveryCost, setDeliveryCost] = useState<number>(0);
  const [calcLoading, setCalcLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const grandTotalPairs = items.reduce((sum, item) => sum + item.totalPairs, 0);
  const grandTotalBoxes = Math.max(1, Math.ceil(grandTotalPairs / 8));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Мгновенный поиск по встроенной базе + живой поиск через API Новой Почты
  useEffect(() => {
    const trimmed = cityQuery.trim();
    if (trimmed.length < 1) {
      setCityResults([]);
      setCitySearching(false);
      return;
    }

    const qLower = trimmed.toLowerCase();

    // 1. Мгновенная фильтрация по встроенному справочнику городов Украины (0 мс)
    const localMatches = UKRAINE_CITIES_DIRECTORY.filter(
      (c) =>
        c.name.toLowerCase().includes(qLower) ||
        c.uaName.toLowerCase().includes(qLower) ||
        c.fullLabel.toLowerCase().includes(qLower)
    );
    setCityResults(localMatches);

    if (!NP_API_KEY || trimmed.length < 2) {
      setCitySearching(false);
      return;
    }

    // 2. Догрузка любых городов, ПГТ и сел из базы Новой Почты
    let cancelled = false;
    setCitySearching(true);

    const timer = setTimeout(async () => {
      try {
        const resCities = await fetch('https://api.novaposhta.ua/v2.0/json/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: NP_API_KEY,
            modelName: 'Address',
            calledMethod: 'getCities',
            methodProperties: {
              FindByString: trimmed,
              Limit: '25',
            },
          }),
        });
        const dataCities = await resCities.json();
        if (cancelled) return;

        const combined: CityOption[] = [...localMatches];
        const seenNames = new Set(localMatches.map((m) => m.uaName.toLowerCase()));

        if (Array.isArray(dataCities?.data)) {
          for (const item of dataCities.data as Array<Record<string, string>>) {
            const ua = item.Description || '';
            const ru = item.DescriptionRu || ua;
            const area = item.AreaDescriptionRu || item.AreaDescription || '';
            const key = ua.toLowerCase();

            // Обновляем Ref у совпавших локальных городов или добавляем новые
            const existingIdx = combined.findIndex((c) => c.uaName.toLowerCase() === key);
            if (existingIdx >= 0 && item.Ref) {
              combined[existingIdx] = { ...combined[existingIdx], ref: item.Ref };
            } else if (item.Ref && !seenNames.has(key)) {
              seenNames.add(key);
              combined.push({
                name: ru,
                uaName: ua,
                fullLabel: area ? `г. ${ru} (${area} обл.)` : `г. ${ru}`,
                ref: item.Ref,
                zoneMultiplier: 1,
              });
            }
          }
        }

        if (!cancelled) {
          setCityResults(combined);
        }
      } catch {
        // Оставляем результаты из встроенного справочника
      } finally {
        if (!cancelled) {
          setCitySearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cityQuery]);

  // Автоматическая подгрузка отделений выбранного города
  useEffect(() => {
    if (!NP_API_KEY) {
      setWarehouses([]);
      return;
    }

    let cancelled = false;
    setWarehousesLoading(true);

    const loadWarehouses = async () => {
      try {
        let cityRef = selectedCity.ref;

        // Если для города еще не закэширован Ref, получаем его по названию
        if (!cityRef) {
          const resCity = await fetch('https://api.novaposhta.ua/v2.0/json/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: NP_API_KEY,
              modelName: 'Address',
              calledMethod: 'getCities',
              methodProperties: {
                FindByString: selectedCity.uaName,
                Limit: '5',
              },
            }),
          });
          const dataCity = await resCity.json();
          if (Array.isArray(dataCity?.data) && dataCity.data[0]?.Ref) {
            cityRef = dataCity.data[0].Ref;
          }
        }

        if (!cityRef || cancelled) {
          if (!cancelled) setWarehouses([]);
          return;
        }

        const resWh = await fetch('https://api.novaposhta.ua/v2.0/json/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: NP_API_KEY,
            modelName: 'Address',
            calledMethod: 'getWarehouses',
            methodProperties: {
              CityRef: cityRef,
              Limit: '500',
            },
          }),
        });
        const dataWh = await resWh.json();

        if (cancelled) return;
        if (dataWh?.success && Array.isArray(dataWh.data)) {
          const list: WarehouseOption[] = dataWh.data.map((w: Record<string, string>) => ({
            ref: w.Ref,
            number: w.Number || '',
            description: w.DescriptionRu || w.Description || '',
          }));
          setWarehouses(list);
        } else {
          setWarehouses([]);
        }
      } catch {
        if (!cancelled) setWarehouses([]);
      } finally {
        if (!cancelled) setWarehousesLoading(false);
      }
    };

    loadWarehouses();

    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  // Расчет стоимости доставки через API Новой Почты (с резервным тарифом по зонам)
  useEffect(() => {
    if (grandTotalPairs === 0) {
      setDeliveryCost(0);
      return;
    }

    const totalWeight = Math.max(2, Math.round(grandTotalPairs * 1.9));

    const calculateFallback = () => {
      if (grandTotalPairs === 1) {
        return Math.round(95 * selectedCity.zoneMultiplier);
      }
      const base = 140 + (grandTotalPairs - 1) * 13;
      return Math.round(base * selectedCity.zoneMultiplier);
    };

    if (!NP_API_KEY || !selectedCity.ref) {
      setDeliveryCost(calculateFallback());
      return;
    }

    let cancelled = false;
    setCalcLoading(true);

    fetch('https://api.novaposhta.ua/v2.0/json/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: NP_API_KEY,
        modelName: 'InternetDocument',
        calledMethod: 'getDocumentPrice',
        methodProperties: {
          CitySender: KHARKIV_CITY_REF,
          CityRecipient: selectedCity.ref,
          Weight: String(totalWeight),
          ServiceType: 'WarehouseWarehouse',
          Cost: String(grandTotalPairs * 1500),
          CargoType: 'Cargo',
          SeatsAmount: String(grandTotalBoxes),
        },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success && data?.data?.[0]?.Cost) {
          setDeliveryCost(Number(data.data[0].Cost));
        } else {
          setDeliveryCost(calculateFallback());
        }
      })
      .catch(() => {
        if (!cancelled) setDeliveryCost(calculateFallback());
      })
      .finally(() => {
        if (!cancelled) setCalcLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [grandTotalPairs, grandTotalBoxes, selectedCity]);

  const filteredWarehouses = warehouses
    .filter((w) => {
      const q = branchOrComment.trim().toLowerCase();
      if (!q) return true;
      return (
        w.number.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q)
      );
    })
    .slice(0, 30);

  const handleSelectCity = (city: CityOption) => {
    setSelectedCity(city);
    setCityQuery('');
    setShowCityDropdown(false);
    setBranchOrComment('');
  };

  const buildInvoiceText = () => {
    const lines = items.map((item, idx) => {
      const variantStr = item.shoe.variant ? ` ${item.shoe.variant}` : '';
      return (
        `${idx + 1}. Модель № ${item.shoe.modelNumber}${variantStr} (${item.shoe.color})\n` +
        `   • ${item.formulaText}\n` +
        `   • Итого по модели: ${item.totalPairs} пар`
      );
    });

    const contactLine = clientContact.trim() ? `\n👤 Клиент: ${clientContact.trim()}` : '';
    const branchLine = branchOrComment.trim() ? `\n📍 Отделение / Прим.: ${branchOrComment.trim()}` : '';

    return (
      `📦 ОПТОВЫЙ ЗАКАЗ • CARDIO (Харьков)\n` +
      `════════════════════\n` +
      `${lines.join('\n\n')}\n` +
      `════════════════════\n` +
      `📊 Позиций в заказе: ${items.length}\n` +
      `👟 Общий объем: ${grandTotalPairs} пар (мест НП: ~${grandTotalBoxes})\n` +
      `🚚 Доставка НП: ${selectedCity.fullLabel} (≈ ${deliveryCost} ₴)` +
      `${contactLine}${branchLine}\n` +
      `════════════════════\n` +
      `Подтвердите наличие/сроки отшива и реквизиты.`
    );
  };

  const sendToManager = async (manager: { label: string; telegramId: string; name: string }) => {
    if (!manager.telegramId) return;
    const text = buildInvoiceText();

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: manager.telegramId,
          managerName: manager.name,
          clientContact: clientContact,
          branchOrComment: branchOrComment,
          totalPairs: grandTotalPairs,
          deliveryCost: deliveryCost,
          invoiceText: text,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('✓ Заказ успешно отправлен руководителю и сохранен в базу!');
      } else {
        alert(`Ошибка отправки: ${data.error || 'Не удалось отправить'}`);
      }
    } catch {
      alert('Ошибка соединения с сервером.');
    }
  };

  const copyInvoice = async () => {
    try {
      await navigator.clipboard.writeText(buildInvoiceText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    border: '1px solid #BDBDBD',
    fontSize: '15px',
    backgroundColor: '#FFFFFF',
    color: '#111111',
    WebkitTextFillColor: '#111111',
    caretColor: '#111111',
    colorScheme: 'light',
    outline: 'none',
  };

  return (
    <div
      className="wholesale-cart-light"
      style={{
        backgroundColor: '#F7F6F2',
        minHeight: '100vh',
        padding: '16px',
        color: '#1A1A1A',
        colorScheme: 'light',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        .wholesale-cart-light input,
        .wholesale-cart-light select,
        .wholesale-cart-light textarea {
          color-scheme: light !important;
          color: #111111 !important;
          -webkit-text-fill-color: #111111 !important;
          caret-color: #111111 !important;
          background-color: #FFFFFF !important;
          opacity: 1 !important;
        }
        .wholesale-cart-light input::placeholder {
          color: #777777 !important;
          -webkit-text-fill-color: #777777 !important;
          opacity: 1 !important;
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #E2DFD7',
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: '#FFFFFF',
            border: '1px solid #CCC',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#1A1A1A',
          }}
        >
          ← Добавить еще модели
        </button>

        {items.length > 0 && (
          <button
            onClick={onClear}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '12px',
              color: '#B91C1C',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Очистить всё
          </button>
        )}
      </div>

      <h1 style={{ fontFamily: 'serif', fontSize: '26px', margin: '0 0 14px 0', fontWeight: 600 }}>
        Оптовая накладная ({items.length})
      </h1>

      {items.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EAE8E3',
            padding: '32px 16px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 16px 0' }}>
            В вашем оптовом заказе пока нет выбранных моделей.
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              backgroundColor: '#1A1A1A',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Перейти в каталог
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {items.map((item, idx) => {
              const isSample = item.orderMode === 'sample';

              return (
                <div
                  key={item.uid}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EAE8E3',
                    padding: '12px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  <img
                    src={item.shoe.image}
                    alt={item.shoe.modelNumber}
                    style={{
                      width: '68px',
                      height: '68px',
                      objectFit: 'contain',
                      border: '1px solid #F0EFEA',
                      flexShrink: 0,
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'serif' }}>
                      {idx + 1}. Модель № {item.shoe.modelNumber} {item.shoe.variant || ''}
                    </div>
                    <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
                      Цвет: <strong>{item.shoe.color}</strong> ({item.shoe.category})
                    </div>
                    <div style={{ fontSize: '11px', color: '#333', marginTop: '4px', lineHeight: 1.35 }}>
                      {item.formulaText}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '8px',
                        borderTop: '1px dashed #EAE8E3',
                        paddingTop: '6px',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>
                        Итого: {item.totalPairs} пар
                      </span>

                      {!isSample && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#666' }}>Ростовок:</span>
                          <button
                            onClick={() => onUpdateQuantity(item.uid, item.boxesCount - 1)}
                            style={{
                              width: '24px',
                              height: '24px',
                              border: '1px solid #CCC',
                              backgroundColor: '#FAF9F6',
                              color: '#1A1A1A',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            −
                          </button>
                          <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>
                            {item.boxesCount}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.uid, item.boxesCount + 1)}
                            style={{
                              width: '24px',
                              height: '24px',
                              border: '1px solid #CCC',
                              backgroundColor: '#FAF9F6',
                              color: '#1A1A1A',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onRemove(item.uid)}
                    style={{
                      background: '#FAF9F6',
                      border: '1px solid #DDD',
                      width: '30px',
                      height: '30px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#555',
                      flexShrink: 0,
                    }}
                    title="Удалить позицию"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E2DC',
              padding: '14px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
              📦 Логистика всей партии (из Харькова)
            </div>

            <div style={{ fontSize: '13px', color: '#222', marginBottom: '8px' }}>
              Населенный пункт получателя: <strong>{selectedCity.fullLabel}</strong>
            </div>

            {/* Быстрые кнопки популярных городов */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
              {POPULAR_CITIES.map((city) => {
                const isSelected = selectedCity.uaName === city.uaName;
                return (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    style={{
                      padding: '5px 9px',
                      fontSize: '11px',
                      border: isSelected ? '1px solid #1A1A1A' : '1px solid #DDD',
                      backgroundColor: isSelected ? '#1A1A1A' : '#FAF9F6',
                      color: isSelected ? '#FFFFFF' : '#333',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {city.name}
                  </button>
                );
              })}
            </div>

            {/* Поле живого поиска любого города Украины */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="🔍 Введите город Украины (напр. Миколаїв, Суми, Умань)..."
                value={cityQuery}
                onFocus={() => setShowCityDropdown(true)}
                onChange={(e) => {
                  setCityQuery(e.target.value);
                  setShowCityDropdown(true);
                }}
                style={inputStyle}
              />

              {showCityDropdown && cityQuery.trim().length >= 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 30,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #1A1A1A',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {cityResults.length === 0 && citySearching ? (
                    <div style={{ padding: '10px', fontSize: '13px', color: '#444' }}>
                      Поиск в базе Новой Почты...
                    </div>
                  ) : cityResults.length === 0 ? (
                    <div
                      onMouseDown={() =>
                        handleSelectCity({
                          name: cityQuery.trim(),
                          uaName: cityQuery.trim(),
                          fullLabel: `г. ${cityQuery.trim()}`,
                          ref: '',
                          zoneMultiplier: 1.05,
                        })
                      }
                      onClick={() =>
                        handleSelectCity({
                          name: cityQuery.trim(),
                          uaName: cityQuery.trim(),
                          fullLabel: `г. ${cityQuery.trim()}`,
                          ref: '',
                          zoneMultiplier: 1.05,
                        })
                      }
                      style={{
                        padding: '10px 12px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: '#111111',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      ✓ Выбрать населенный пункт: <strong>{cityQuery.trim()}</strong>
                    </div>
                  ) : (
                    cityResults.map((c, i) => (
                      <div
                        key={`${c.uaName}-${i}`}
                        onMouseDown={() => handleSelectCity(c)}
                        onClick={() => handleSelectCity(c)}
                        style={{
                          padding: '10px 12px',
                          fontSize: '13px',
                          borderBottom: '1px solid #F0EFEA',
                          cursor: 'pointer',
                          color: '#111111',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        {c.fullLabel}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Контакт клиента */}
            <div style={{ marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Ваше Имя и Телефон (для накладной)..."
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Выбор отделения НП или свой комментарий */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder={
                  warehousesLoading
                    ? 'Загрузка отделений Новой Почты...'
                    : warehouses.length > 0
                    ? `№ отделения НП в ${selectedCity.name} (доступно: ${warehouses.length})...`
                    : '№ отделения Новой Почты или комментарий...'
                }
                value={branchOrComment}
                onFocus={() => setShowWarehouseDropdown(true)}
                onBlur={() => setTimeout(() => setShowWarehouseDropdown(false), 200)}
                onChange={(e) => {
                  setBranchOrComment(e.target.value);
                  setShowWarehouseDropdown(true);
                }}
                style={inputStyle}
              />

              {showWarehouseDropdown && filteredWarehouses.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 25,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #1A1A1A',
                    maxHeight: '210px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {filteredWarehouses.map((w) => (
                    <div
                      key={w.ref}
                      onMouseDown={() => {
                        setBranchOrComment(w.description);
                        setShowWarehouseDropdown(false);
                      }}
                      onClick={() => {
                        setBranchOrComment(w.description);
                        setShowWarehouseDropdown(false);
                      }}
                      style={{
                        padding: '9px 12px',
                        fontSize: '12px',
                        borderBottom: '1px solid #F0EFEA',
                        cursor: 'pointer',
                        color: '#111111',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      {w.description}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                borderTop: '1px solid #EAE8E3',
                paddingTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '13px', color: '#333' }}>
                Всего: <strong>{grandTotalPairs} пар</strong> (~{grandTotalBoxes} ящ.)
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>
                {calcLoading ? 'Расчет...' : `Доставка ≈ ${deliveryCost} ₴`}
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #1A1A1A',
              padding: '14px',
              marginBottom: '32px',
            }}
          >
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#555', marginBottom: '10px', fontWeight: 700 }}>
              Отправить готовую накладную ({items.length} мод.):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {MANAGERS.map((mgr, idx) => (
                <button
                  key={idx}
                  onClick={() => sendToManager(mgr)}
                  style={{
                    width: '100%',
                    padding: '13px',
                    backgroundColor: idx === 0 ? '#1A1A1A' : '#333333',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  ✈️ {mgr.label}
                </button>
              ))}

              <button
                onClick={copyInvoice}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#FAF9F6',
                  color: '#1A1A1A',
                  border: '1px solid #CCC',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {copied ? '✓ Накладная скопирована!' : '📋 Скопировать накладную (для Viber / Telegram)'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
