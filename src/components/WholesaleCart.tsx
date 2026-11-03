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

// Расширенный справочник городов Украины с поддержкой поиска на укр., рус. и суржике
const UKRAINE_CITIES_DIRECTORY: CityOption[] = [
  ...POPULAR_CITIES,
  { name: 'Николаев', uaName: 'Миколаїв', fullLabel: 'г. Миколаїв / Николаев (Миколаївська обл.)', ref: 'db5c888c-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Сумы', uaName: 'Суми', fullLabel: 'г. Суми / Сумы (Сумська обл.)', ref: 'db5c88e5-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.85 },
  { name: 'Черкассы', uaName: 'Черкаси', fullLabel: 'г. Черкаси / Черкассы (Черкаська обл.)', ref: 'db5c8902-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.95 },
  { name: 'Чернигов', uaName: 'Чернігів', fullLabel: 'г. Чернігів / Чернигов (Чернігівська обл.)', ref: 'db5c897c-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.0 },
  { name: 'Житомир', uaName: 'Житомир', fullLabel: 'г. Житомир (Житомирська обл.)', ref: 'db5c88c4-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Хмельницкий', uaName: 'Хмельницький', fullLabel: 'г. Хмельницький / Хмельницкий', ref: 'db5c88ac-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Черновцы', uaName: 'Чернівці', fullLabel: 'г. Чернівці / Черновцы (Чернівецька обл.)', ref: 'e221d627-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.1 },
  { name: 'Ровно', uaName: 'Рівне', fullLabel: 'г. Рівне / Ровно (Рівненська обл.)', ref: 'db5c896a-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Луцк', uaName: 'Луцьк', fullLabel: 'г. Луцьк / Луцк (Волинська обл.)', ref: 'db5c893b-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.1 },
  { name: 'Тернополь', uaName: 'Тернопіль', fullLabel: 'г. Тернопіль / Тернополь (Тернопільська обл.)', ref: 'db5c8900-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.1 },
  { name: 'Ивано-Франковск', uaName: 'Івано-Франківськ', fullLabel: 'г. Івано-Франківськ / Ивано-Франковск', ref: 'db5c8904-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.1 },
  { name: 'Ужгород', uaName: 'Ужгород', fullLabel: 'г. Ужгород (Закарпатська обл.)', ref: 'e221d642-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.15 },
  { name: 'Кропивницкий', uaName: 'Кропивницький', fullLabel: 'г. Кропивницький / Кропивницкий', ref: 'db5c891b-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.95 },
  { name: 'Херсон', uaName: 'Херсон', fullLabel: 'г. Херсон (Херсонська обл.)', ref: 'db5c88cc-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Кривой Рог', uaName: 'Кривий Ріг', fullLabel: 'г. Кривий Ріг / Кривой Рог (Дніпропетровська обл.)', ref: 'db5c890d-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.95 },
  { name: 'Кременчуг', uaName: 'Кременчук', fullLabel: 'г. Кременчук / Кременчуг (Полтавська обл.)', ref: 'db5c8915-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.9 },
  { name: 'Белая Церковь', uaName: 'Біла Церква', fullLabel: 'г. Біла Церква / Белая Церковь (Київська обл.)', ref: 'db5c88d8-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.0 },
  { name: 'Каменское', uaName: 'Кам’янське', fullLabel: 'г. Кам’янське / Каменское (Дніпропетровська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Павлоград', uaName: 'Павлоград', fullLabel: 'г. Павлоград (Дніпропетровська обл.)', ref: '', zoneMultiplier: 0.85 },
  { name: 'Никополь', uaName: 'Нікополь', fullLabel: 'г. Нікополь / Никополь (Дніпропетровська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Новомосковск / Самар', uaName: 'Самар', fullLabel: 'г. Самар / Новомосковск (Дніпропетровська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Марганец', uaName: 'Марганець', fullLabel: 'г. Марганець / Марганец (Дніпропетровська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Желтые Воды', uaName: 'Жовті Води', fullLabel: 'г. Жовті Води / Желтые Воды (Дніпропетровська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Покров', uaName: 'Покров', fullLabel: 'г. Покров (Дніпропетровська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Умань', uaName: 'Умань', fullLabel: 'г. Умань (Черкаська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Бровары', uaName: 'Бровари', fullLabel: 'г. Бровари / Бровары (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Борисполь', uaName: 'Бориспіль', fullLabel: 'г. Бориспіль / Борисполь (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Ирпень', uaName: 'Ірпінь', fullLabel: 'г. Ірпінь / Ирпень (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Буча', uaName: 'Буча', fullLabel: 'г. Буча (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Фастов', uaName: 'Фастів', fullLabel: 'г. Фастів / Фастов (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Обухов', uaName: 'Обухів', fullLabel: 'г. Обухів / Обухов (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Васильков', uaName: 'Васильків', fullLabel: 'г. Васильків / Васильков (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Вишневое', uaName: 'Вишневе', fullLabel: 'г. Вишневе / Вишневое (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Боярка', uaName: 'Боярка', fullLabel: 'г. Боярка (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Переяслав', uaName: 'Переяслав', fullLabel: 'г. Переяслав (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Славутич', uaName: 'Славутич', fullLabel: 'г. Славутич (Київська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Яготин', uaName: 'Яготин', fullLabel: 'г. Яготин (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Вышгород', uaName: 'Вишгород', fullLabel: 'г. Вишгород / Вышгород (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Мироновка', uaName: 'Миронівка', fullLabel: 'г. Миронівка / Мироновка (Київська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Бердичев', uaName: 'Бердичів', fullLabel: 'г. Бердичів / Бердичев (Житомирська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Коростень', uaName: 'Коростень', fullLabel: 'г. Коростень (Житомирська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Звягель / Новоград-Волынский', uaName: 'Звягель', fullLabel: 'г. Звягель / Новоград-Волинський (Житомирська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Малин', uaName: 'Малин', fullLabel: 'г. Малин (Житомирська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Коростышев', uaName: 'Коростишів', fullLabel: 'г. Коростишів / Коростышев (Житомирська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Нежин', uaName: 'Ніжин', fullLabel: 'г. Ніжин / Нежин (Чернігівська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Прилуки', uaName: 'Прилуки', fullLabel: 'г. Прилуки (Чернігівська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Бахмач', uaName: 'Бахмач', fullLabel: 'г. Бахмач (Чернігівська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Конотоп', uaName: 'Конотоп', fullLabel: 'г. Конотоп (Сумська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Шостка', uaName: 'Шостка', fullLabel: 'г. Шостка (Сумська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Ахтырка', uaName: 'Охтирка', fullLabel: 'г. Охтирка / Ахтырка (Сумська обл.)', ref: '', zoneMultiplier: 0.85 },
  { name: 'Ромны', uaName: 'Ромни', fullLabel: 'г. Ромни / Ромны (Сумська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Глухов', uaName: 'Глухів', fullLabel: 'г. Глухів / Глухов (Сумська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Тростянец', uaName: 'Тростянець', fullLabel: 'г. Тростянець / Тростянец (Сумська обл.)', ref: '', zoneMultiplier: 0.85 },
  { name: 'Кролевец', uaName: 'Кролевець', fullLabel: 'г. Кролевець / Кролевец (Сумська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Лебедин', uaName: 'Лебедин', fullLabel: 'г. Лебедин (Сумська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Лубны', uaName: 'Лубни', fullLabel: 'г. Лубни / Лубны (Полтавська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Миргород', uaName: 'Миргород', fullLabel: 'г. Миргород (Полтавська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Горишни Плавни', uaName: 'Горішні Плавні', fullLabel: 'г. Горішні Плавні (Полтавська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Гадяч', uaName: 'Гадяч', fullLabel: 'г. Гадяч (Полтавська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Пирятин', uaName: 'Пирятин', fullLabel: 'г. Пирятин (Полтавська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Карловка', uaName: 'Карлівка', fullLabel: 'г. Карлівка / Карловка (Полтавська обл.)', ref: '', zoneMultiplier: 0.85 },
  { name: 'Кобеляки', uaName: 'Кобеляки', fullLabel: 'г. Кобеляки (Полтавська обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Александрия', uaName: 'Олександрія', fullLabel: 'г. Олександрія / Александрия (Кіровоградська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Светловодск', uaName: 'Світловодськ', fullLabel: 'г. Світловодськ / Светловодск (Кіровоградська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Знаменка', uaName: 'Знам’янка', fullLabel: 'г. Знам’янка / Знаменка (Кіровоградська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Долинская', uaName: 'Долинська', fullLabel: 'г. Долинська / Долинская (Кіровоградська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Смела', uaName: 'Сміла', fullLabel: 'г. Сміла / Смела (Черкаська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Золотоноша', uaName: 'Золотоноша', fullLabel: 'г. Золотоноша (Черкаська обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Канев', uaName: 'Канів', fullLabel: 'г. Канів / Канев (Черкаська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Корсунь-Шевченковский', uaName: 'Корсунь-Шевченківський', fullLabel: 'г. Корсунь-Шевченківський (Черкаська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Звенигородка', uaName: 'Звенигородка', fullLabel: 'г. Звенигородка (Черкаська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Шпола', uaName: 'Шпола', fullLabel: 'г. Шпола (Черкаська обл.)', ref: '', zoneMultiplier: 1.0 },
  { name: 'Измаил', uaName: 'Ізмаїл', fullLabel: 'г. Ізмаїл / Измаил (Одеська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Черноморск', uaName: 'Чорноморськ', fullLabel: 'г. Чорноморськ / Черноморск (Одеська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Белгород-Днестровский', uaName: 'Білгород-Дністровський', fullLabel: 'г. Білгород-Дністровський (Одеська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Подольск', uaName: 'Подільськ', fullLabel: 'г. Подільськ / Подольск (Одеська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Южное / Пивденное', uaName: 'Південне', fullLabel: 'г. Південне / Южное (Одеська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Килиия', uaName: 'Кілія', fullLabel: 'г. Кілія / Килия (Одеська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Рени', uaName: 'Рені', fullLabel: 'г. Рені / Рени (Одеська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Балта', uaName: 'Балта', fullLabel: 'г. Балта (Одеська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Раздельная', uaName: 'Роздільна', fullLabel: 'г. Роздільна / Раздельная (Одеська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Болград', uaName: 'Болград', fullLabel: 'г. Болград (Одеська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Арциз', uaName: 'Арциз', fullLabel: 'г. Арциз (Одеська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Первомайск', uaName: 'Первомайськ', fullLabel: 'г. Первомайськ / Первомайск (Миколаївська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Вознесенск', uaName: 'Вознесенськ', fullLabel: 'г. Вознесенськ / Вознесенск (Миколаївська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Южноукраинск', uaName: 'Південноукраїнськ', fullLabel: 'г. Південноукраїнськ / Южноукраинск (Миколаївська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Новый Буг', uaName: 'Новий Буг', fullLabel: 'г. Новий Буг / Новый Буг (Миколаївська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Очаков', uaName: 'Очаків', fullLabel: 'г. Очаків / Очаков (Миколаївська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Баштанка', uaName: 'Баштанка', fullLabel: 'г. Баштанка (Миколаївська обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Каменец-Подольский', uaName: 'Кам’янець-Подільський', fullLabel: 'г. Кам’янець-Подільський (Хмельницька обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Шепетовка', uaName: 'Шепетівка', fullLabel: 'г. Шепетівка / Шепетовка (Хмельницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Нетешин', uaName: 'Нетішин', fullLabel: 'г. Нетішин / Нетешин (Хмельницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Славута', uaName: 'Славута', fullLabel: 'г. Славута (Хмельницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Староконстантинов', uaName: 'Старокостянтинів', fullLabel: 'г. Старокостянтинів (Хмельницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Полонное', uaName: 'Полонне', fullLabel: 'г. Полонне / Полонное (Хмельницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Волочиск', uaName: 'Волочиськ', fullLabel: 'г. Волочиськ / Волочиск (Хмельницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Жмеринка', uaName: 'Жмеринка', fullLabel: 'г. Жмеринка (Вінницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Могилев-Подольский', uaName: 'Могилів-Подільський', fullLabel: 'г. Могилів-Подільський (Вінницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Хмельник', uaName: 'Хмільник', fullLabel: 'г. Хмільник / Хмельник (Вінницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Гайсин', uaName: 'Гайсин', fullLabel: 'г. Гайсин (Вінницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Казатин', uaName: 'Козятин', fullLabel: 'г. Козятин / Казатин (Вінницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Ладыжин', uaName: 'Ладижин', fullLabel: 'г. Ладижин / Ладыжин (Вінницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Калиновка', uaName: 'Калинівка', fullLabel: 'г. Калинівка / Калиновка (Вінницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Бар', uaName: 'Бар', fullLabel: 'г. Бар (Вінницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Тульчин', uaName: 'Тульчин', fullLabel: 'г. Тульчин (Вінницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Бершадь', uaName: 'Бершадь', fullLabel: 'г. Бершадь (Вінницька обл.)', ref: '', zoneMultiplier: 1.05 },
  { name: 'Ковель', uaName: 'Ковель', fullLabel: 'г. Ковель (Волинська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Нововолынск', uaName: 'Нововолинськ', fullLabel: 'г. Нововолинськ (Волинська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Владимир', uaName: 'Володимир', fullLabel: 'г. Володимир / Владимир (Волинська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Вараш', uaName: 'Вараш', fullLabel: 'г. Вараш (Рівненська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Дубно', uaName: 'Дубно', fullLabel: 'г. Дубно (Рівненська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Костополь', uaName: 'Костопіль', fullLabel: 'г. Костопіль / Костополь (Рівненська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Сарны', uaName: 'Сарни', fullLabel: 'г. Сарни / Сарны (Рівненська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Здолбунов', uaName: 'Здолбунів', fullLabel: 'г. Здолбунів / Здолбунов (Рівненська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Дрогобыч', uaName: 'Дрогобич', fullLabel: 'г. Дрогобич (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Стрый', uaName: 'Стрий', fullLabel: 'г. Стрий / Стрый (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Шептицкий / Червоноград', uaName: 'Шептицький', fullLabel: 'г. Шептицький / Червоноград (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Самбор', uaName: 'Самбір', fullLabel: 'г. Самбір / Самбор (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Трускавец', uaName: 'Трускавець', fullLabel: 'г. Трускавець / Трускавец (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Борислав', uaName: 'Борислав', fullLabel: 'г. Борислав (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Новояворовск', uaName: 'Новояворівськ', fullLabel: 'г. Новояворівськ (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Золочев', uaName: 'Золочів', fullLabel: 'г. Золочів / Золочев (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Броды', uaName: 'Броди', fullLabel: 'г. Броди / Броды (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Сокаль', uaName: 'Сокаль', fullLabel: 'г. Сокаль (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Стебник', uaName: 'Стебник', fullLabel: 'г. Стебник (Львівська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Калуш', uaName: 'Калуш', fullLabel: 'г. Калуш (Івано-Франківська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Коломыя', uaName: 'Коломия', fullLabel: 'г. Коломия / Коломыя (Івано-Франківська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Надворная', uaName: 'Надвірна', fullLabel: 'г. Надвірна / Надворная (Івано-Франківська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Долина', uaName: 'Долина', fullLabel: 'г. Долина (Івано-Франківська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Бурштын', uaName: 'Бурштин', fullLabel: 'г. Бурштин / Бурштын (Івано-Франківська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Яремче', uaName: 'Яремче', fullLabel: 'г. Яремче (Івано-Франківська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Чортков', uaName: 'Чортків', fullLabel: 'г. Чортків / Чортков (Тернопільська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Кременец', uaName: 'Кременець', fullLabel: 'г. Кременець / Кременец (Тернопільська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Бережаны', uaName: 'Бережани', fullLabel: 'г. Бережани / Бережаны (Тернопільська обл.)', ref: '', zoneMultiplier: 1.1 },
  { name: 'Мукачево', uaName: 'Мукачево', fullLabel: 'г. Мукачево (Закарпатська обл.)', ref: '', zoneMultiplier: 1.15 },
  { name: 'Хуст', uaName: 'Хуст', fullLabel: 'г. Хуст (Закарпатська обл.)', ref: '', zoneMultiplier: 1.15 },
  { name: 'Виноградов', uaName: 'Виноградів', fullLabel: 'г. Виноградів / Виноградов (Закарпатська обл.)', ref: '', zoneMultiplier: 1.15 },
  { name: 'Берегово', uaName: 'Берегове', fullLabel: 'г. Берегове / Берегово (Закарпатська обл.)', ref: '', zoneMultiplier: 1.15 },
  { name: 'Свалява', uaName: 'Свалява', fullLabel: 'г. Свалява (Закарпатська обл.)', ref: '', zoneMultiplier: 1.15 },
  { name: 'Рахов', uaName: 'Рахів', fullLabel: 'г. Рахів / Рахов (Закарпатська обл.)', ref: '', zoneMultiplier: 1.15 },
  { name: 'Тячев', uaName: 'Тячів', fullLabel: 'г. Тячів / Тячев (Закарпатська обл.)', ref: '', zoneMultiplier: 1.15 },
  { name: 'Лозовая', uaName: 'Лозова', fullLabel: 'г. Лозова / Лозовая (Харківська обл.)', ref: '', zoneMultiplier: 0.8 },
  { name: 'Чугуев', uaName: 'Чугуїв', fullLabel: 'г. Чугуїв / Чугуев (Харківська обл.)', ref: '', zoneMultiplier: 0.75 },
  { name: 'Изюм', uaName: 'Ізюм', fullLabel: 'г. Ізюм / Изюм (Харківська обл.)', ref: '', zoneMultiplier: 0.8 },
  { name: 'Берестин / Красноград', uaName: 'Берестин', fullLabel: 'г. Берестин / Красноград (Харківська обл.)', ref: '', zoneMultiplier: 0.8 },
  { name: 'Златополь / Первомайский', uaName: 'Златопіль', fullLabel: 'г. Златопіль / Первомайский (Харківська обл.)', ref: '', zoneMultiplier: 0.8 },
  { name: 'Балаклея', uaName: 'Балаклія', fullLabel: 'г. Балаклія / Балаклея (Харківська обл.)', ref: '', zoneMultiplier: 0.8 },
  { name: 'Мерефа', uaName: 'Мерефа', fullLabel: 'г. Мерефа (Харківська обл.)', ref: '', zoneMultiplier: 0.75 },
  { name: 'Люботин', uaName: 'Люботин', fullLabel: 'г. Люботин (Харківська обл.)', ref: '', zoneMultiplier: 0.75 },
  { name: 'Дергачи', uaName: 'Дергачі', fullLabel: 'г. Дергачі / Дергачи (Харківська обл.)', ref: '', zoneMultiplier: 0.75 },
  { name: 'Богодухов', uaName: 'Богодухів', fullLabel: 'г. Богодухів / Богодухов (Харківська обл.)', ref: '', zoneMultiplier: 0.8 },
  { name: 'Змиев', uaName: 'Зміїв', fullLabel: 'г. Зміїв / Змиев (Харківська обл.)', ref: '', zoneMultiplier: 0.75 },
  { name: 'Валки', uaName: 'Валки', fullLabel: 'г. Валки (Харківська обл.)', ref: '', zoneMultiplier: 0.75 },
  { name: 'Краматорск', uaName: 'Краматорськ', fullLabel: 'г. Краматорськ / Краматорск (Донецька обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Славянск', uaName: 'Слов’янськ', fullLabel: 'г. Слов’янськ / Славянск (Донецька обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Покровск', uaName: 'Покровськ', fullLabel: 'г. Покровськ / Покровск (Донецька обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Мирноград', uaName: 'Мирноград', fullLabel: 'г. Мирноград (Донецька обл.)', ref: '', zoneMultiplier: 0.95 },
  { name: 'Дружковка', uaName: 'Дружківка', fullLabel: 'г. Дружківка / Дружковка (Донецька обл.)', ref: '', zoneMultiplier: 0.9 },
  { name: 'Доброполье', uaName: 'Добропілля', fullLabel: 'г. Добропілля / Доброполье (Донецька обл.)', ref: '', zoneMultiplier: 0.95 },
];

// Нормализация текста для поиска (миколаив === миколаїв)
function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’`"]/g, '')
    .replace(/[іїйы]/g, 'и')
    .replace(/[єэё]/g, 'е')
    .replace(/ґ/g, 'г')
    .trim();
}

// Перевод частых русскоязычных/суржиковых вводов в украинский формат для API Новой Почты
function toUkrainianApiQuery(raw: string): string {
  const clean = raw.trim();
  const lower = clean.toLowerCase();

  const dictionary: Record<string, string> = {
    николаев: 'Миколаїв',
    миколаив: 'Миколаїв',
    миколаев: 'Миколаїв',
    киев: 'Київ',
    днепр: 'Дніпро',
    харьков: 'Харків',
    одесса: 'Одеса',
    львов: 'Львів',
    запорожье: 'Запоріжжя',
    винница: 'Вінниця',
    ровно: 'Рівне',
    ривне: 'Рівне',
    черновцы: 'Чернівці',
    чернигов: 'Чернігів',
    черкассы: 'Черкаси',
    сумы: 'Суми',
    луцк: 'Луцьк',
    тернополь: 'Тернопіль',
    хмельницкий: 'Хмельницький',
    кропивницкий: 'Кропивницький',
    кривой: 'Кривий Ріг',
    кременчуг: 'Кременчук',
    каменское: 'Кам’янське',
    белая: 'Біла Церква',
    ивано: 'Івано-Франківськ',
  };

  for (const [ruKey, uaVal] of Object.entries(dictionary)) {
    if (lower.startsWith(ruKey)) {
      return uaVal;
    }
  }

  return clean;
}

// Резервный генератор отделений на случай, если API-ключ НП не задан в Vercel
function buildFallbackWarehouses(cityName: string): WarehouseOption[] {
  const list: WarehouseOption[] = [];
  for (let i = 1; i <= 50; i++) {
    list.push({
      ref: `fallback-wh-${i}`,
      number: String(i),
      description: `Отделение НП №${i} (г. ${cityName})`,
    });
  }
  return list;
}

export function WholesaleCart({ items, onUpdateQuantity, onRemove, onClear, onClose }: WholesaleCartProps) {
  const [selectedCity, setSelectedCity] = useState<CityOption>(POPULAR_CITIES[0]);
  const [cityQuery, setCityQuery] = useState(POPULAR_CITIES[0].fullLabel);
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

  // 1. Мгновенный поиск по встроенной базе + живой поиск через API Новой Почты
  useEffect(() => {
    const trimmed = cityQuery.trim();
    if (trimmed.length < 1) {
      setCityResults(POPULAR_CITIES);
      setCitySearching(false);
      return;
    }

    const qNorm = normalizeSearch(trimmed);

    // Фильтрация по названию города (сначала те, которые НАЧИНАЮТСЯ с запроса)
    const startsWithMatches: CityOption[] = [];
    const includesMatches: CityOption[] = [];

    for (const c of UKRAINE_CITIES_DIRECTORY) {
      const nameNorm = normalizeSearch(c.name);
      const uaNorm = normalizeSearch(c.uaName);

      if (nameNorm.startsWith(qNorm) || uaNorm.startsWith(qNorm)) {
        startsWithMatches.push(c);
      } else if (qNorm.length >= 2 && (nameNorm.includes(qNorm) || uaNorm.includes(qNorm))) {
        includesMatches.push(c);
      }
    }

    const localMatches = [...startsWithMatches, ...includesMatches];
    setCityResults(localMatches);

    if (trimmed.length < 2) {
      setCitySearching(false);
      return;
    }

    let cancelled = false;
    setCitySearching(true);

    const timer = setTimeout(async () => {
      try {
        const apiSearchString = toUkrainianApiQuery(trimmed);

        const fetchCitiesByQuery = async (searchStr: string) => {
          const res = await fetch('https://api.novaposhta.ua/v2.0/json/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: NP_API_KEY,
              modelName: 'Address',
              calledMethod: 'getCities',
              methodProperties: {
                FindByString: searchStr,
                Limit: '30',
              },
            }),
          });
          return res.json();
        };

        let dataCities = await fetchCitiesByQuery(apiSearchString);

        // Если ввели русскую «и» в украинском названии (напр. «миколаив»), пробуем заменить и -> і
        if (
          (!Array.isArray(dataCities?.data) || dataCities.data.length === 0) &&
          apiSearchString.toLowerCase().includes('и')
        ) {
          const uaVariant = apiSearchString.replace(/и/gi, 'і');
          dataCities = await fetchCitiesByQuery(uaVariant);
        }

        if (cancelled) return;

        const combined: CityOption[] = [...localMatches];
        const seenNames = new Set(localMatches.map((m) => normalizeSearch(m.uaName)));

        if (Array.isArray(dataCities?.data)) {
          for (const item of dataCities.data as Array<Record<string, string>>) {
            const ua = item.Description || '';
            const ru = item.DescriptionRu || ua;
            const area = item.AreaDescriptionRu || item.AreaDescription || '';
            const key = normalizeSearch(ua);

            const existingIdx = combined.findIndex((c) => normalizeSearch(c.uaName) === key);
            if (existingIdx >= 0 && item.Ref) {
              combined[existingIdx] = { ...combined[existingIdx], ref: item.Ref };
            } else if (item.Ref && !seenNames.has(key)) {
              seenNames.add(key);
              combined.push({
                name: ru,
                uaName: ua,
                fullLabel: area ? `г. ${ua} / ${ru} (${area} обл.)` : `г. ${ua}`,
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
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cityQuery]);

  // 2. Автоматическая подгрузка отделений Новой Почты выбранного города
  useEffect(() => {
    let cancelled = false;
    setWarehousesLoading(true);

    const loadWarehouses = async () => {
      try {
        let cityRef = selectedCity.ref;

        // Если для города еще не сохранен Ref, запрашиваем его по названию
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

        const methodProperties: Record<string, string> = {
          Limit: '500',
        };
        if (cityRef) {
          methodProperties.CityRef = cityRef;
        } else {
          methodProperties.CityName = selectedCity.uaName;
        }

        const resWh = await fetch('https://api.novaposhta.ua/v2.0/json/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: NP_API_KEY,
            modelName: 'Address',
            calledMethod: 'getWarehouses',
            methodProperties,
          }),
        });
        const dataWh = await resWh.json();

        if (cancelled) return;

        if (dataWh?.success && Array.isArray(dataWh.data) && dataWh.data.length > 0) {
          const list: WarehouseOption[] = dataWh.data.map((w: Record<string, string>) => ({
            ref: w.Ref,
            number: w.Number || '',
            description: w.DescriptionRu || w.Description || '',
          }));
          setWarehouses(list);
        } else {
          // Если API-ключ не задан или вернул пустой ответ — включаем резервный список отделений
          setWarehouses(buildFallbackWarehouses(selectedCity.uaName));
        }
      } catch {
        if (!cancelled) {
          setWarehouses(buildFallbackWarehouses(selectedCity.uaName));
        }
      } finally {
        if (!cancelled) setWarehousesLoading(false);
      }
    };

    loadWarehouses();

    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  // 3. Расчет стоимости доставки через API Новой Почты (с резервным тарифом по зонам)
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

  // Умная фильтрация и сортировка отделений НП (точное совпадение номера — всегда на 1 месте)
  const getFilteredWarehouses = (): WarehouseOption[] => {
    const q = branchOrComment.trim().toLowerCase();
    const digitsOnly = q.replace(/\D/g, '');

    if (!q) {
      return warehouses.slice(0, 35);
    }

    const exactNumberMatches: WarehouseOption[] = [];
    const prefixNumberMatches: WarehouseOption[] = [];
    const textMatches: WarehouseOption[] = [];

    for (const w of warehouses) {
      const wNum = w.number.toLowerCase();
      const wDesc = w.description.toLowerCase();

      if (digitsOnly && wNum === digitsOnly) {
        exactNumberMatches.push(w);
      } else if (digitsOnly && wNum.startsWith(digitsOnly)) {
        prefixNumberMatches.push(w);
      } else if (wNum.includes(q) || wDesc.includes(q)) {
        textMatches.push(w);
      }
    }

    const merged = [...exactNumberMatches, ...prefixNumberMatches, ...textMatches];

    // Если пользователь ввел номер (например 125), которого нет в первых 50 резервных
    if (merged.length === 0 && digitsOnly) {
      return [
        {
          ref: `custom-wh-${digitsOnly}`,
          number: digitsOnly,
          description: `Отделение НП №${digitsOnly} (г. ${selectedCity.uaName})`,
        },
        {
          ref: `custom-postomat-${digitsOnly}`,
          number: digitsOnly,
          description: `Почтомат НП №${digitsOnly} (г. ${selectedCity.uaName})`,
        },
      ];
    }

    return merged.slice(0, 35);
  };

  const filteredWarehouses = getFilteredWarehouses();

  const handleSelectCity = (city: CityOption) => {
    setSelectedCity(city);
    setCityQuery(city.fullLabel);
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
    padding: '10px 34px 10px 12px',
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
                onFocus={() => {
                  if (cityQuery === selectedCity.fullLabel) {
                    setCityQuery('');
                  }
                  setShowCityDropdown(true);
                }}
                onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                onChange={(e) => {
                  setCityQuery(e.target.value);
                  setShowCityDropdown(true);
                }}
                style={inputStyle}
              />

              {cityQuery.length > 0 && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setCityQuery('');
                    setShowCityDropdown(true);
                  }}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    fontSize: '14px',
                    color: '#777',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Очистить"
                >
                  ✕
                </button>
              )}

              {showCityDropdown && (
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
                  ) : cityResults.length === 0 && cityQuery.trim().length > 0 ? (
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
                    : `№ отделения НП в ${selectedCity.uaName} (напр. 12)...`
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

              {branchOrComment.length > 0 && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setBranchOrComment('');
                    setShowWarehouseDropdown(true);
                  }}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    fontSize: '14px',
                    color: '#777',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Очистить"
                >
                  ✕
                </button>
              )}

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
