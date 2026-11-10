/**
 * @file src/components/wholesale/orderHistoryStore.ts
 * @description Модуль управления историей («Мои заказы») и синхронизации корзины
 * для пользователей Telegram Mini App и веб-сайта www.cordwainer.app.
 *
 * КАК РЕШЕНА ПРОБЛЕМА ВЕБ-САЙТА (www.cordwainer.app) И TELEGRAM:
 * 1. Каждому покупателю создается универсальный `clientUid`:
 *    - В Telegram: `tg_<ID пользователя>`
 *    - На сайте www.cordwainer.app: уникальный постоянный ключ `web_<UUID>`, сохраняемый в браузере.
 * 2. Дополнительно при отправке заказа сохраняется нормализованный номер телефона покупателя.
 *    По этому номеру телефона и `clientUid` заказы сохраняются в базу Neon и подтягиваются
 *    в раздел «Мои заказы» даже если человек зашел с обычного браузера на www.cordwainer.app.
 * 3. Функция `clearWholesaleCartEverywhere()` полностью очищает корзину в localStorage
 *    и рассылает глобальное событие `cardio-cart-cleared`, чтобы накладная мгновенно
 *    очищалась и в прайс-каталоге, и на главной витрине.
 */

import type { CartItem } from '../../data/catalog';
import { CART_STORAGE_KEY } from './wholesaleData';
import { getTgWebApp } from './pdfLookbookEngine';

const CLIENT_UID_KEY = 'cardio_b2b_client_uid_v1';
const CLIENT_PHONE_KEY = 'cardio_b2b_client_phone_v1';
const LOCAL_HISTORY_KEY = 'cardio_b2b_orders_archive_v1';

/** Структура сохраненного заказа в архиве «Мои заказы» */
export interface ArchivedOrder {
  id: string;
  createdAt: string;
  managerName: string;
  clientContact: string;
  branchOrComment: string;
  totalPairs: number;
  totalUsd?: number;
  invoiceText: string;
  items?: CartItem[];
}

/**
 * Нормализует телефонный номер (оставляет только последние 9–12 цифр) для поиска в БД Neon.
 */
export function normalizePhoneForSearch(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-10) : digits;
}

/**
 * Возвращает единый идентификатор покупателя:
 * - `tg_12345678` если открыто внутри Telegram
 * - `web_...` если открыто через браузер на www.cordwainer.app
 */
export function getUniversalClientUid(): string {
  try {
    const tgId = getTgWebApp()?.initDataUnsafe?.user?.id;
    if (tgId) {
      return `tg_${tgId}`;
    }
  } catch {}

  try {
    const existing = localStorage.getItem(CLIENT_UID_KEY);
    if (existing) return existing;

    const generated = `web_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    localStorage.setItem(CLIENT_UID_KEY, generated);
    return generated;
  } catch {
    return 'web_guest';
  }
}

/**
 * Запоминает телефон клиента при оформлении заказа (для привязки истории на www.cordwainer.app).
 */
export function saveLastClientPhone(phone: string): void {
  try {
    if (phone && phone.trim()) {
      localStorage.setItem(CLIENT_PHONE_KEY, phone.trim());
    }
  } catch {}
}

export function getLastClientPhone(): string {
  try {
    return localStorage.getItem(CLIENT_PHONE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Читает локальный архив заказов из памяти устройства (доступен мгновенно без ожидания сети).
 */
export function getLocalArchivedOrders(): ArchivedOrder[] {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ArchivedOrder[]) : [];
  } catch {
    return [];
  }
}

/**
 * Сохраняет отправленный заказ в локальный архив устройства (до 30 последних заказов).
 */
export function saveOrderToLocalArchive(order: ArchivedOrder): ArchivedOrder[] {
  try {
    const current = getLocalArchivedOrders();
    const updated = [order, ...current.filter((o) => o.id !== order.id)].slice(0, 30);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));
    if (order.clientContact) {
      saveLastClientPhone(order.clientContact);
    }
    return updated;
  } catch {
    return [];
  }
}

/**
 * Подгружает историю заказов покупателя с сервера (из базы данных Neon) по его `clientUid`
 * или номеру телефона и объединяет с локальным архивом.
 */
export async function fetchAndMergeOrderHistory(
  customPhone?: string
): Promise<ArchivedOrder[]> {
  const localOrders = getLocalArchivedOrders();
  const clientUid = getUniversalClientUid();
  const phoneToQuery = normalizePhoneForSearch(customPhone || getLastClientPhone());

  try {
    const params = new URLSearchParams({
      action: 'history',
      clientUid,
    });
    if (phoneToQuery.length >= 7) {
      params.set('phone', phoneToQuery);
    }

    const res = await fetch(`/api/orders?${params.toString()}`);
    if (!res.ok) return localOrders;

    const data = await res.json();
    const serverOrders: ArchivedOrder[] = Array.isArray(data?.orders)
      ? data.orders
      : [];

    if (serverOrders.length === 0) return localOrders;

    // Объединяем серверные заказы из Neon и локальные без дубликатов
    const mergedMap = new Map<string, ArchivedOrder>();
    for (const o of [...serverOrders, ...localOrders]) {
      const key = `${o.createdAt.slice(0, 16)}_${o.totalPairs}_${o.managerName}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, o);
      }
    }

    const merged = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(merged.slice(0, 30)));
    return merged;
  } catch {
    return localOrders;
  }
}

/**
 * Полностью очищает текущую оптовую корзину во всех хранилищах (и в основном каталоге,
 * и в B2B прайс-каталоге) сразу после успешной отправки заказа.
 */
export function clearWholesaleCartEverywhere(): void {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem('cardio_cart');
    localStorage.removeItem('cardio_wholesale_cart');
    window.dispatchEvent(new Event('cardio-cart-cleared'));
    window.dispatchEvent(new Event('storage'));
  } catch {}
}

