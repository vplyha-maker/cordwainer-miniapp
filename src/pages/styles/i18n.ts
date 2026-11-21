import {
  FREE_STYLES_COUNT,
  PREVIEW_TAG_COUNT,
  PRO_VIDEOS_PRICE_STARS,
  type SupportedLang,
} from './types'

export function getUiText(lang: SupportedLang, totalCount: number) {
  const lockedCount = Math.max(0, totalCount - FREE_STYLES_COUNT)
  const extraCount = Math.max(0, lockedCount - PREVIEW_TAG_COUNT)

  const dict = {
    ru: {
      back: 'Назад',
      aboutStyle: 'О фасоне',
      hideDesc: 'Скрыть',
      copied: 'Ссылка скопирована',
      up: 'Наверх',
      down: 'Вернуться',
      moreStyles: `+ ещё ${extraCount} фасонов и новые AI-релизы`,
      loadingVideo: 'Загрузка кадра...',
      videoErrorRetry: 'Повтор загрузки...',
      errTgOnly: 'Оплата через Telegram Stars доступна внутри приложения Telegram.',
      errPayment: 'Оплата была отменена или не завершена.',
      errVerifyFailed:
        'Платёж ещё не подтверждён сервером. Подождите пару секунд и попробуйте снова.',
      errPending: 'Платёж обрабатывается Telegram. Доступ откроется автоматически после подтверждения.',
      errServer: 'Ошибка соединения',
      paywall: {
        tag: `ЗАКРЫТАЯ AI-КОЛЛЕКЦИЯ • +${lockedCount} ФАСОНОВ`,
        title: 'Полный\nЛукбук',
        desc: `Вы посмотрели ${FREE_STYLES_COUNT} из ${totalCount} фасонов. Разблокируйте полный доступ ко всей видео-энциклопедии обуви и всем будущим AI-пополнениям навсегда.`,
        priceNote: `Разовый платёж • Все ${totalCount}+ фасонов и будущие обновления навсегда`,
        btn: `ОТКРЫТЬ ВЕСЬ ЛУКБУК • ${PRO_VIDEOS_PRICE_STARS} ⭐️`,
        loading: 'ПОДГОТОВКА СЧЕТА...',
        verifying: 'ПРОВЕРКА ОПЛАТЫ...',
      },
    },
    uk: {
      back: 'Назад',
      aboutStyle: 'Про фасон',
      hideDesc: 'Сховати',
      copied: 'Посилання скопійовано',
      up: 'Вгору',
      down: 'Повернутися',
      moreStyles: `+ ще ${extraCount} фасонів та нові AI-релізи`,
      loadingVideo: 'Завантаження кадру...',
      videoErrorRetry: 'Повторне завантаження...',
      errTgOnly: 'Оплата через Telegram Stars доступна всередині додатку Telegram.',
      errPayment: 'Оплату було скасовано або не завершено.',
      errVerifyFailed:
        'Платіж ще не підтверджено сервером. Зачекайте кілька секунд і спробуйте знову.',
      errPending:
        'Платіж обробляється Telegram. Доступ відкриється автоматично після підтвердження.',
      errServer: 'Помилка з’єднання',
      paywall: {
        tag: `ЗАКРИТА AI-КОЛЕКЦІЯ • +${lockedCount} ФАСОНІВ`,
        title: 'Повний\nЛукбук',
        desc: `Ви переглянули ${FREE_STYLES_COUNT} з ${totalCount} фасонів. Розблокуйте повний доступ до всієї відео-енциклопедії взуття та всіх майбутніх AI-поповнень назавжди.`,
        priceNote: `Разовий платіж • Усі ${totalCount}+ фасонів та майбутні оновлення назавжди`,
        btn: `ВІДКРИТИ ВЕСЬ ЛУКБУК • ${PRO_VIDEOS_PRICE_STARS} ⭐️`,
        loading: 'ПІДГОТОВКА РАХУНКУ...',
        verifying: 'ПЕРЕВІРКА ОПЛАТИ...',
      },
    },
    de: {
      back: 'Zurück',
      aboutStyle: 'Details',
      hideDesc: 'Schließen',
      copied: 'Link kopiert',
      up: 'Nach oben',
      down: 'Zurück',
      moreStyles: `+ ${extraCount} weitere Stile & neue KI-Releases`,
      loadingVideo: 'Video wird geladen...',
      videoErrorRetry: 'Erneut versuchen...',
      errTgOnly: 'Zahlung mit Telegram Stars ist nur in der Telegram-App verfügbar.',
      errPayment: 'Zahlung wurde abgebrochen.',
      errVerifyFailed:
        'Zahlung noch nicht vom Server bestätigt. Bitte warten Sie kurz und versuchen Sie es erneut.',
      errPending:
        'Zahlung wird von Telegram verarbeitet. Der Zugang wird nach Bestätigung freigeschaltet.',
      errServer: 'Verbindungsfehler',
      paywall: {
        tag: `EXKLUSIVE KI-KOLLEКTION • +${lockedCount} STILE`,
        title: 'Volles\nLookbook',
        desc: `Sie haben ${FREE_STYLES_COUNT} von ${totalCount} Stilen gesehen. Schalten Sie den dauerhaften Zugang zur gesamten Video-Enzyklopädie inklusive aller künftigen KI-Updates frei.`,
        priceNote: `Einmalige Zahlung • Alle ${totalCount}+ Stile & künftige Updates dauerhaft`,
        btn: `VOLLES LOOKBOOK FREISCHALTEN • ${PRO_VIDEOS_PRICE_STARS} ⭐️`,
        loading: 'WIRD GELADEN...',
        verifying: 'ZAHLUNG PRÜFEN...',
      },
    },
  }

  return dict[lang] ?? dict.ru
}

export type UiText = ReturnType<typeof getUiText>

