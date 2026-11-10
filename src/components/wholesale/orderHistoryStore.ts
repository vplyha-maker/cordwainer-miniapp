/**
 * @file src/components/wholesale/orderHistoryStore.ts
 * @description Модуль управления историей («Мои заказы»), двухфакторной верификацией
 * через Telegram OTP и синхронизации корзины для Telegram Mini App и сайта www.cordwainer.app.
 *
 * КАК РАБОТАЕТ ЗАЩИТА «МОИХ ЗАКАЗОВ»:
 * 1. Внутри Telegram Mini App (`isTelegramMiniApp() === true`):
 *    Покупатель уже авторизован самим мессенджером (`tg_<ID>`). Заказы подгружаются автоматически,
 *    а его телефон привязывается к его Telegram ID в базе Neon.
 * 2. На внешнем сайте www.cordwainer.app (`isTelegramMiniApp() === false`):
 *    Простой перебор чужих номеров заблокирован. Чтобы подгрузить свои заказы по номеру телефона,
 *    вызывается `requestTelegramOtp(phone)` -> бот @Cordwainer_bot присылает 4-значный код ->
 *    `verifyTelegramOtp(phone, code)` проверяет код, сохраняет защищенный `sessionToken` и выдает архив.
 */

import type { CartItem } from '../../data/catalog';
import { CART_STORAGE_KEY } from './wholesaleData';
import { getTgWebApp } from './pdfLookbookEngine';

const CLIENT_UID_KEY = 'cardio_b2b_client_uid_v1';
const CLIENT_PHONE_KEY = 'cardio_b2b_client_phone_v1';
const LOCAL_HISTORY_KEY = 'cardio_b2b_orders_archive_v1';
const OTP_SESSION_KEY = 'cardio_b2b_otp_session_v1';

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

/** Структура подтвержденной OTP-сессии для веб-браузера */
export interface VerifiedPhoneSession {
  phone: string;
  sessionToken: string;
  verifiedAt: number;
}

/**
 * Нормализует телефонный номер до 10 цифр украинского формата (например: 0988901364).
 * Полностью совпадает с нормализацией на сервере в `api/orders.ts`.
 */
export function normalizePhoneForSearch(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('380') && digits.length >= 12) return digits.slice(2, 12);
  if (digits.startsWith('80') && digits.length >= 11) return digits.slice(1, 11);
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Проверяет, открыто ли приложение официально внутри Telegram Mini App.
 */
export function isTelegramMiniApp(): boolean {
  try {
    return Boolean(getTgWebApp()?.initDataUnsafe?.user?.id);
  } catch {
    return false;
  }
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
 * Запоминает телефон клиента при оформлении заказа.
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
 * Возвращает сохраненную подтвержденную OTP-сессию (если пользователь на сайте уже вводил код).
 */
export function getVerifiedPhoneSession(): VerifiedPhoneSession | null {
  try {
    const raw = localStorage.getItem(OTP_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VerifiedPhoneSession;
    if (parsed?.phone && parsed?.sessionToken) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Сохраняет токен подтвержденного телефона в localStorage браузера.
 */
function saveVerifiedPhoneSession(phone: string, sessionToken: string): void {
  try {
    const payload: VerifiedPhoneSession = {
      phone: normalizePhoneForSearch(phone),
      sessionToken,
      verifiedAt: Date.now(),
    };
    localStorage.setItem(OTP_SESSION_KEY, JSON.stringify(payload));
  } catch {}
}

/**
 * Сбрасывает подтвержденную сессию (если пользователь хочет сменить номер телефона на сайте).
 */
export function clearVerifiedPhoneSession(): void {
  try {
    localStorage.removeItem(OTP_SESSION_KEY);
  } catch {}
}

/**
 * Читает локальный архив заказов из памяти устройства.
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
 * Объединяет серверные заказы из базы Neon с локальными заказами без дубликатов.
 */
function mergeAndSaveOrders(serverOrders: ArchivedOrder[]): ArchivedOrder[] {
  const localOrders = getLocalArchivedOrders();
  if (!Array.isArray(serverOrders) || serverOrders.length === 0) {
    return localOrders;
  }

  const mergedMap = new Map<string, ArchivedOrder>();
  for (const o of [...serverOrders, ...localOrders]) {
    const key = o.id || `${o.createdAt.slice(0, 16)}_${o.totalPairs}_${o.managerName}`;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, o);
    }
  }

  const merged = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  try {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(merged.slice(0, 30)));
  } catch {}

  return merged;
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
 * Безопасно подгружает историю заказов с сервера `/api/orders`:
 * - В Telegram Mini App передает `clientUid = tg_...`
 * - На сайте www.cordwainer.app передает `sessionToken` (полученный после ввода 4-значного кода).
 * Без `sessionToken` чужие номера телефонов сервером игнорируются.
 */
export async function fetchAndMergeOrderHistory(
  customPhone?: string
): Promise<ArchivedOrder[]> {
  const localOrders = getLocalArchivedOrders();
  const clientUid = getUniversalClientUid();
  const verifiedSession = getVerifiedPhoneSession();

  const phoneToQuery = normalizePhoneForSearch(
     verifiedSession?.phone || customPhone || getLastClientPhone()
  );

  try {
    const params = new URLSearchParams({
      action: 'history',
      clientUid,
    });

    if (phoneToQuery.length >= 10) {
      params.set('phone', phoneToQuery);
    }
    if (verifiedSession?.sessionToken) {
      params.set('sessionToken', verifiedSession.sessionToken);
    }

    const res = await fetch(`/api/orders?${params.toString()}`);
    if (!res.ok) return localOrders;

    const data = await res.json();
    const serverOrders: ArchivedOrder[] = Array.isArray(data?.orders)
      ? data.orders
      : [];

    return mergeAndSaveOrders(serverOrders);
  } catch {
    return localOrders;
  }
}

/**
 * ШАГ 1 ВЕРИФИКАЦИИ НА САЙТЕ: Запрашивает отправку 4-значного кода в Telegram (@Cordwainer_bot).
 */
export async function requestTelegramOtp(phone: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const cleanPhone = normalizePhoneForSearch(phone);
  if (cleanPhone.length < 10) {
    return {
      success: false,
      error: 'Введите корректный 10-значный номер телефона.',
    };
  }

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request_otp',
        phone: cleanPhone,
      }),
    });

    const data = await res.json();
    if (res.ok && data?.success) {
      return {
        success: true,
        message: data.message || 'Код отправлен в ваш Telegram!',
      };
    }

    return {
      success: false,
      error: data?.error || 'Не удалось отправить код в Telegram.',
    };
  } catch {
    return {
      success: false,
      error: 'Ошибка соединения с сервером.',
    };
  }
}

/**
 * ШАГ 2 ВЕРИФИКАЦИИ НА САЙТЕ: Проверяет 4-значный код из Telegram,
 * сохраняет защищенный `sessionToken` и возвращает найденные заказы покупателя.
 */
export async function verifyTelegramOtp(
  phone: string,
  code: string
): Promise<{
  success: boolean;
  orders?: ArchivedOrder[];
  error?: string;
}> {
  const cleanPhone = normalizePhoneForSearch(phone);
  const cleanCode = (code || '').replace(/\D/g, '').trim();

  if (cleanPhone.length < 10 || cleanCode.length !== 4) {
    return {
      success: false,
      error: 'Введите 4-значный код из Telegram.',
    };
  }

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_otp',
        phone: cleanPhone,
        code: cleanCode,
      }),
    });

    const data = await res.json();
    if (res.ok && data?.success && data?.sessionToken) {
      saveVerifiedPhoneSession(cleanPhone, data.sessionToken);
      saveLastClientPhone(phone);

      const serverOrders: ArchivedOrder[] = Array.isArray(data.orders)
        ? data.orders
        : [];
      const merged = mergeAndSaveOrders(serverOrders);

      return {
        success: true,
        orders: merged,
      };
    }

    return {
      success: false,
      error: data?.error || 'Неверный код подтверждения.',
    };
  } catch {
    return {
      success: false,
      error: 'Ошибка соединения с сервером.',
    };
  }
}

/**
 * Полностью очищает текущую оптовую корзину во всех хранилищах сразу после отправки заказа.
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
