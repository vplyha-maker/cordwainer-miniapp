import { useCallback, useEffect, useState } from 'react'
import type { TranslationDict } from './colorsTranslations'
import { hapticSave, triggerHaptic as unifiedTriggerHaptic } from './haptics'

export type PaymentState =
  | 'idle'
  | 'creating_invoice'
  | 'invoice_open'
  | 'verifying_payment'
  | 'purchased'
  | 'failed'

export type TelegramWebApp = {
  initData?: string
  initDataUnsafe?: { user?: { id?: number } }
  colorScheme?: 'light' | 'dark'
  HapticFeedback?: {
    impactOccurred: (style: string) => void
    selectionChanged?: () => void
    notificationOccurred?: (type: string) => void
  }
  openInvoice?: (link: string, cb: (status: string) => void) => void
  expand?: () => void
  ready?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
}

export function getTelegramWebApp(): TelegramWebApp | undefined {
  try {
    return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp
  } catch {
    return undefined
  }
}

export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  unifiedTriggerHaptic(style)
}

export function expandTelegramWebApp() {
  try {
    const tg = getTelegramWebApp()
    tg?.ready?.()
    tg?.expand?.()
  } catch {}
}

export function useTelegramProPayment(t: TranslationDict) {
  const [paymentState, setPaymentState] = useState<PaymentState>('idle')
  const [paymentErrorMsg, setPaymentErrorMsg] = useState<string | null>(null)
  const [showProModal, setShowProModal] = useState(false)

  const isProPurchased = paymentState === 'purchased'
  const isPaymentBusy =
    paymentState === 'creating_invoice' || paymentState === 'verifying_payment'

  const verifyPurchaseOnServer = useCallback(async (): Promise<boolean> => {
    const tg = getTelegramWebApp()
    const userId = tg?.initDataUnsafe?.user?.id
    const rawInitData = tg?.initData || ''
    if (!userId) return false

    try {
      const res = await fetch(
        '/api/check-purchase?userId=' + encodeURIComponent(String(userId)) + '&productId=pro_colors',
        {
          method: 'GET',
          headers: rawInitData ? { 'X-Telegram-Init-Data': rawInitData } : undefined,
        }
      )
      if (!res.ok) return false
      const data = (await res.json()) as { purchased?: boolean }
      if (data.purchased === true) {
        setPaymentState('purchased')
        return true
      }
      return false
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Ошибка проверки покупки:', err)
      }
      return false
    }
  }, [])

  useEffect(() => {
    void verifyPurchaseOnServer()
  }, [verifyPurchaseOnServer])

  const openProModal = useCallback(() => {
    triggerHaptic('medium')
    setPaymentErrorMsg(null)
    setShowProModal(true)
  }, [])

  const closeProModal = useCallback(() => {
    if (isPaymentBusy) return
    setShowProModal(false)
    if (paymentState === 'invoice_open') {
      setPaymentState('idle')
    }
  }, [isPaymentBusy, paymentState])

  const handleProClick = useCallback(async () => {
    if (isPaymentBusy || paymentState === 'invoice_open' || isProPurchased) return
    const tg = getTelegramWebApp()
    const userId = tg?.initDataUnsafe?.user?.id
    const rawInitData = tg?.initData || ''

    if (!userId || !tg?.openInvoice) {
      setPaymentErrorMsg(t.paymentTelegramOnly)
      return
    }

    setPaymentErrorMsg(null)
    setPaymentState('creating_invoice')
    triggerHaptic('light')

    try {
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(rawInitData ? { 'X-Telegram-Init-Data': rawInitData } : {}),
        },
        body: JSON.stringify({
          userId,
          productId: 'pro_colors',
          initData: rawInitData,
        }),
      })

      const data = (await response.json()) as {
        invoiceLink?: string
        error?: string
        alreadyPurchased?: boolean
      }

      if (response.status === 409 && data.alreadyPurchased) {
        hapticSave()
        setPaymentState('purchased')
        setShowProModal(false)
        return
      }

      if (!response.ok || !data.invoiceLink) {
        throw new Error(data.error || t.paymentInvoiceError)
      }

      setPaymentState('invoice_open')

      tg.openInvoice(data.invoiceLink, async (status: string) => {
        if (status === 'paid') {
          setPaymentState('verifying_payment')
          let verified = await verifyPurchaseOnServer()
          if (!verified) {
            await new Promise((r) => setTimeout(r, 850))
            verified = await verifyPurchaseOnServer()
          }
          if (!verified) {
            await new Promise((r) => setTimeout(r, 1200))
            verified = await verifyPurchaseOnServer()
          }

          if (verified) {
            hapticSave()
            setPaymentState('purchased')
            setShowProModal(false)
          } else {
            setPaymentState('failed')
            setPaymentErrorMsg(t.paymentVerifyFailed)
          }
        } else if (status === 'pending') {
          setPaymentState('verifying_payment')
          let verified = await verifyPurchaseOnServer()
          if (!verified) {
            await new Promise((r) => setTimeout(r, 900))
            verified = await verifyPurchaseOnServer()
          }

          if (verified) {
            hapticSave()
            setPaymentState('purchased')
            setShowProModal(false)
          } else {
            setPaymentState('idle')
            setPaymentErrorMsg(t.paymentPendingMsg)
          }
        } else if (status === 'cancelled' || status === 'closed') {
          setPaymentState('idle')
        } else {
          setPaymentState('failed')
          setPaymentErrorMsg(t.paymentGenericFailed)
        }
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      if (import.meta.env.DEV) {
        console.error(error)
      }
      setPaymentState('failed')
      setPaymentErrorMsg(t.paymentInvoiceError + ': ' + message)
    }
  }, [isPaymentBusy, paymentState, isProPurchased, t, verifyPurchaseOnServer])

  return {
    paymentState,
    paymentErrorMsg,
    showProModal,
    isProPurchased,
    isPaymentBusy,
    openProModal,
    closeProModal,
    handleProClick,
  }
}
