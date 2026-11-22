import { useState, useEffect, useCallback } from 'react'
import { hapticError, hapticSuccess } from './haptics'

export const PIGMENTS_PRODUCT_ID = 'pro_pigments'
export const PIGMENTS_PRICE_STARS = 450
export const TRIAL_MATCH_LIMIT = 3

const TRIAL_STORAGE_KEY = 'cordwaine_pigments_trial_used_v1'
const PRO_CACHE_PREFIX = 'cordwaine_pigments_pro_v1_'

type TgMiniApp = {
  initData?: string
  initDataUnsafe?: { user?: { id?: number } }
  openInvoice?: (link: string, cb: (status: string) => void) => void
}

function getTg(): TgMiniApp | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { Telegram?: { WebApp?: TgMiniApp } }).Telegram?.WebApp
}

function readTrialUsed(): number {
  try {
    const raw = localStorage.getItem(TRIAL_STORAGE_KEY)
    const n = raw ? parseInt(raw, 10) : 0
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

function readCachedPro(userId: string | null): boolean {
  if (!userId) return false
  try {
    return localStorage.getItem(`${PRO_CACHE_PREFIX}${userId}`) === '1'
  } catch {
    return false
  }
}

function writeCachedPro(userId: string | null, val: boolean): void {
  if (!userId) return
  try {
    if (val) localStorage.setItem(`${PRO_CACHE_PREFIX}${userId}`, '1')
    else localStorage.removeItem(`${PRO_CACHE_PREFIX}${userId}`)
  } catch {
    // ignore
  }
}

export function usePigmentsAccess() {
  const tg = getTg()
  const tgUserId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null
  const initData = tg?.initData || ''

  const [isPro, setIsPro] = useState<boolean>(() => readCachedPro(tgUserId))
  const [checking, setChecking] = useState<boolean>(Boolean(initData && tgUserId))
  const [purchasing, setPurchasing] = useState<boolean>(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [trialUsed, setTrialUsed] = useState<number>(() => readTrialUsed())

  const trialRemaining = Math.max(0, TRIAL_MATCH_LIMIT - trialUsed)
  const hasFullAccess = isPro || trialRemaining > 0

  const verifyAccessFromServer = useCallback(async () => {
    const currentTg = getTg()
    const rawInitData = currentTg?.initData || ''
    const uid = currentTg?.initDataUnsafe?.user?.id
      ? String(currentTg.initDataUnsafe.user.id)
      : null

    if (!rawInitData || !uid) {
      setChecking(false)
      return false
    }

    try {
      const qs = new URLSearchParams({
        productId: PIGMENTS_PRODUCT_ID,
        userId: uid,
      })
      const res = await fetch(`/api/check-purchase?${qs.toString()}`, {
        method: 'GET',
        headers: {
          'X-Telegram-Init-Data': rawInitData,
        },
      })
      if (!res.ok) {
        setChecking(false)
        return false
      }
      const data = (await res.json()) as { purchased?: boolean }
      const purchased = Boolean(data.purchased)
      setIsPro(purchased)
      writeCachedPro(uid, purchased)
      setChecking(false)
      return purchased
    } catch {
      setChecking(false)
      return false
    }
  }, [])

  useEffect(() => {
    void verifyAccessFromServer()
  }, [verifyAccessFromServer])

  const consumeTrialMatch = useCallback(() => {
    if (isPro) return
    setTrialUsed((prev) => {
      const next = Math.min(TRIAL_MATCH_LIMIT, prev + 1)
      try {
        localStorage.setItem(TRIAL_STORAGE_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [isPro])

  const buyPro = useCallback(async (): Promise<boolean> => {
    setPurchaseError(null)
    const currentTg = getTg()
    const rawInitData = currentTg?.initData || ''
    const uid = currentTg?.initDataUnsafe?.user?.id
      ? String(currentTg.initDataUnsafe.user.id)
      : null

    if (!rawInitData || !uid || !currentTg?.openInvoice) {
      hapticError()
      setPurchaseError('Оплата в Telegram Stars доступна внутри Telegram Mini App.')
      return false
    }

    setPurchasing(true)
    try {
      const res = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': rawInitData,
        },
        body: JSON.stringify({
          userId: uid,
          productId: PIGMENTS_PRODUCT_ID,
          initData: rawInitData,
        }),
      })

      const data = (await res.json()) as {
        invoiceLink?: string
        alreadyPurchased?: boolean
        error?: string
      }

      if (res.status === 409 && data.alreadyPurchased) {
        setIsPro(true)
        writeCachedPro(uid, true)
        setPurchasing(false)
        hapticSuccess()
        return true
      }

      if (!res.ok || !data.invoiceLink) {
        hapticError()
        setPurchaseError(data.error || 'Не удалось создать счёт Telegram Stars')
        setPurchasing(false)
        return false
      }

      return await new Promise<boolean>((resolve) => {
        currentTg.openInvoice?.(data.invoiceLink!, (status: string) => {
          setPurchasing(false)
          if (status === 'paid') {
            setIsPro(true)
            writeCachedPro(uid, true)
            hapticSuccess()
            void verifyAccessFromServer()
            resolve(true)
          } else if (status === 'failed') {
            hapticError()
            setPurchaseError('Платёж не завершён. Попробуйте ещё раз.')
            resolve(false)
          } else {
            resolve(false)
          }
        })
      })
    } catch {
      hapticError()
      setPurchaseError('Ошибка сети при создании счёта.')
      setPurchasing(false)
      return false
    }
  }, [verifyAccessFromServer])

  return {
    isPro,
    checking,
    purchasing,
    purchaseError,
    trialUsed,
    trialRemaining,
    hasFullAccess,
    consumeTrialMatch,
    buyPro,
    verifyAccessFromServer,
  }
}

