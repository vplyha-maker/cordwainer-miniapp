import React from 'react'

export type Lang = 'ru' | 'uk' | 'de'

interface AboutViewProps {
  lang: Lang
  themeColors: any
  isDark: boolean
}

const CONTENT = {
  ru: {
    title: 'Проект: Cordwainer',
    subtitle: 'Telegram Mini-App Footwear Index',
    intro: 'Cordwainer — это высокопроизводительное серверлесс-приложение (Mini-App) для экосистемы Telegram, представляющее собой агрегатор и умный каталог кроссовок. Продукт спроектирован с упором на автоматизацию сбора данных, минимизацию инфраструктурных расходов и нативный пользовательский опыт (UX).',
    stackTitle: 'Технологический стек',
    stack: [
      '**Frontend:** React, Vite, TypeScript, Telegram Web Apps API.',
      '**Backend & API:** Vercel (Serverless Functions), Node.js.',
      '**Database:** Neon PostgreSQL (Serverless Cloud DB).',
      '**CI/CD & Automation:** GitHub Actions.',
      '**Media Hosting:** ImgBB API (распределенная доставка контента).'
    ],
    hacksTitle: 'Нестандартные инженерные решения (Growth Hacks)',
    hacksIntro: 'Основой проекта стала стратегия максимального использования бесплатных облачных лимитов и умный парсинг данных.',
    sections: [
      {
        title: '1. Reverse Engineering чужого API (Сбор данных)',
        text: 'Вместо покупки дорогих коммерческих API для получения актуальных каталогов обуви, был применен метод перехвата открытых поисковых индексов. Скрипт на базе axios обращается напрямую к поисковому движку Algolia, обслуживающему крупную платформу (GOAT), используя их публичный Application ID и API Key. Настроен обход пагинации и динамическая генерация поисковых запросов по 50+ мировым брендам, что позволяет легально и незаметно собирать "сырые" данные о тысячах моделей кроссовок.'
      },
      {
        title: '2. Построение бесплатного CDN-конвейера',
        text: 'Хранение тысяч высококачественных фотографий требует дорогого S3-хранилища. В качестве обходного пути интегрирован бесплатный сервис ImgBB. Скрипт-парсер на лету скачивает изображение из исходного источника (в виде arraybuffer), конвертирует его в base64 и отправляет POST-запросом через API ImgBB. База данных Neon сохраняет только финальную короткую прямую ссылку, что снижает нагрузку на БД до нескольких мегабайт и обеспечивает мгновенную загрузку картинок у конечного пользователя.'
      },
      {
        title: '3. Serverless Автоматизация (Бесплатный Cron-сервер)',
        text: 'Для поддержания актуальности базы без затрат на аренду выделенного сервера (VPS) настроен CI/CD пайплайн в GitHub Actions. Написан YML-workflow, который автоматически пробуждается 4 раза в сутки по расписанию (cron). Скрипт выполняет UPSERT запросы (ON CONFLICT DO NOTHING) в Neon DB. Он сканирует рынок, находит новые релизы и добавляет их в базу, игнорируя дубликаты. Инфраструктура полностью автономна.'
      },
      {
        title: '4. Нормализация данных и Умный поиск (Smart Search)',
        text: 'Так как данные собираются из сторонних источников, они часто приходят "грязными".\n• Обработка дат: Написан умный обработчик, который парсит даты релизов из множества нестандартных форматов и приводит их к единому стандарту release_year, устраняя ошибку "фейкового 2024 года".\n• Устранение SEO-дублей (Regex): Реализован алгоритм очистки поисковых запросов. Если в названии модели уже содержится название бренда, регулярное выражение вырезает дубликат. Это превращает некорректный запрос "UGG UGG Classic" в точный "UGG Classic купить", повышая конверсию.\n• Изолированный поиск: SQL-запросы используют ILIKE и проверку по массиву известных брендов, чтобы поиск бренда "ON" не выдавал кроссовки "Salomon".'
      },
      {
        title: '5. Telegram Identity & Защита от само-DDoS',
        text: '• Бесшовная авторизация: Внедрена прямая связь с initDataUnsafe от Telegram. Приложение автоматически захватывает уникальный user_id и подтягивает сохраненный архив из базы Neon. Независимо от того, с какого устройства зашел пользователь, его данные синхронизированы.\n• Предотвращение бесконечных циклов: В процессе разработки была успешно локализована и устранена проблема утечки памяти (Memory Leak) в React. Вынос объектов перевода за пределы жизненного цикла компонента предотвратил каскадный ререндеринг, который приводил к DDoS-нагрузке на собственные Vercel-сервера.'
      }
    ],
    outro: 'Проект представляет собой полноценный, масштабируемый MVP, созданный с применением агрессивной оптимизации ресурсов. Примечательно, что управление архитектурой, контроль CI/CD пайплайнов, деплой на Vercel и прямые SQL-миграции в базе данных выполнялись преимущественно с мобильного устройства, что подчеркивает гибкость выбранного облачного стека.'
  },
  uk: {
    title: 'Проєкт: Cordwainer',
    subtitle: 'Telegram Mini-App Footwear Index',
    intro: 'Cordwainer — це високопродуктивний безсерверний застосунок (Mini-App) для екосистеми Telegram, що є агрегатором та розумним каталогом кросівок. Продукт спроєктований з акцентом на автоматизацію збору даних, мінімізацію інфраструктурних витрат та нативний користувацький досвід (UX).',
    stackTitle: 'Технологічний стек',
    stack: [
      '**Frontend:** React, Vite, TypeScript, Telegram Web Apps API.',
      '**Backend & API:** Vercel (Serverless Functions), Node.js.',
      '**Database:** Neon PostgreSQL (Serverless Cloud DB).',
      '**CI/CD & Automation:** GitHub Actions.',
      '**Media Hosting:** ImgBB API (розподілена доставка контенту).'
    ],
    hacksTitle: 'Нестандартні інженерні рішення (Growth Hacks)',
    hacksIntro: 'Основою проєкту стала стратегія максимального використання безкоштовних хмарних лімітів та розумний парсинг даних.',
    sections: [
      {
        title: '1. Reverse Engineering чужого API (Збір даних)',
        text: 'Замість купівлі дорогих комерційних API для отримання актуальних каталогів взуття, було застосовано метод перехоплення відкритих пошукових індексів. Скрипт на базі axios звертається безпосередньо до пошукового рушія Algolia, що обслуговує велику платформу (GOAT), використовуючи їхній публічний Application ID та API Key. Налаштовано обхід пагінації та динамічну генерацію пошукових запитів за 50+ світовими брендами, що дозволяє легально та непомітно збирати "сирі" дані про тисячі моделей кросівок.'
      },
      {
        title: '2. Побудова безкоштовного CDN-конвеєра',
        text: 'Зберігання тисяч високоякісних фотографій вимагає дорогого S3-сховища. Як обхідний шлях інтегровано безкоштовний сервіс ImgBB. Скрипт-парсер на льоту завантажує зображення з вихідного джерела (у вигляді arraybuffer), конвертує його в base64 та відправляє POST-запитом через API ImgBB. База даних Neon зберігає лише фінальне коротке пряме посилання, що знижує навантаження на БД до декількох мегабайтів і забезпечує миттєве завантаження картинок у кінцевого користувача.'
      },
      {
        title: '3. Serverless Автоматизація (Безкоштовний Cron-сервер)',
        text: 'Для підтримки актуальності бази без витрат на оренду виділеного сервера (VPS) налаштовано CI/CD пайплайн у GitHub Actions. Написано YML-workflow, який автоматично пробуджується 4 рази на добу за розкладом (cron). Скрипт виконує UPSERT запити (ON CONFLICT DO NOTHING) у Neon DB. Він сканує ринок, знаходить нові релізи та додає їх до бази, ігноруючи дублікати. Інфраструктура повністю автономна.'
      },
      {
        title: '4. Нормалізація даних та Розумний пошук (Smart Search)',
        text: 'Оскільки дані збираються зі сторонніх джерел, вони часто приходять "брудними".\n• Обробка дат: Написано розумний обробник, який парсить дати релізів з безлічі нестандартних форматів і приводить їх до єдиного стандарту release_year, усуваючи помилку "фейкового 2024 року".\n• Усунення SEO-дублів (Regex): Реалізовано алгоритм очищення пошукових запитів. Якщо в назві моделі вже міститься назва бренду, регулярний вираз вирізає дублікат. Це перетворює некоректний запит "UGG UGG Classic" на точний "UGG Classic купити", підвищуючи конверсію.\n• Ізольований пошук: SQL-запити використовують ILIKE та перевірку за масивом відомих брендів, щоб пошук бренду "ON" не видавав кросівки "Salomon".'
      },
      {
        title: '5. Telegram Identity & Захист від само-DDoS',
        text: '• Безшовна авторизація: Впроваджено прямий зв\'язок з initDataUnsafe від Telegram. Застосунок автоматично захоплює унікальний user_id і підтягує збережений архів з бази Neon. Незалежно від того, з якого пристрою зайшов користувач, його дані синхронізовані.\n• Запобігання нескінченним циклам: У процесі розробки було успішно локалізовано та усунуто проблему витоку пам\'яті (Memory Leak) у React. Винесення об\'єктів перекладу за межі життєвого циклу компонента запобігло каскадному ререндерингу, який призводив до DDoS-навантаження на власні Vercel-сервери.'
      }
    ],
    outro: 'Проєкт являє собою повноцінний, масштабований MVP, створений із застосуванням агресивної оптимізації ресурсів. Примітно, що управління архітектурою, контроль CI/CD пайплайнів, деплой на Vercel і прямі SQL-міграції в базі даних виконувалися переважно з мобільного пристрою, що підкреслює гнучкість обраного хмарного стека.'
  },
  de: {
    title: 'Projekt: Cordwainer',
    subtitle: 'Telegram Mini-App Footwear Index',
    intro: 'Cordwainer ist eine leistungsstarke Serverless-Anwendung (Mini-App) für das Telegram-Ökosystem, die als Aggregator und intelligenter Sneaker-Katalog fungiert. Das Produkt ist mit Schwerpunkt auf automatisierte Datenerfassung, Minimierung der Infrastrukturkosten und eine native User Experience (UX) konzipiert.',
    stackTitle: 'Technologie-Stack',
    stack: [
      '**Frontend:** React, Vite, TypeScript, Telegram Web Apps API.',
      '**Backend & API:** Vercel (Serverless Functions), Node.js.',
      '**Database:** Neon PostgreSQL (Serverless Cloud DB).',
      '**CI/CD & Automation:** GitHub Actions.',
      '**Media Hosting:** ImgBB API (Distributed Content Delivery).'
    ],
    hacksTitle: 'Innovative Engineering-Lösungen (Growth Hacks)',
    hacksIntro: 'Die Grundlage des Projekts ist eine Strategie zur maximalen Nutzung kostenloser Cloud-Kontingente und intelligentes Data-Parsing.',
    sections: [
      {
        title: '1. Reverse Engineering fremder APIs (Datenerfassung)',
        text: 'Anstatt teure kommerzielle APIs zu kaufen, wurde die Methode des Abfangens offener Suchindizes angewendet. Ein axios-basiertes Skript greift direkt auf die Algolia-Suchmaschine zu, die eine große Plattform (GOAT) bedient, indem es deren öffentliche Application ID und den API Key nutzt. Ein Pagination-Bypass und die dynamische Generierung von Suchanfragen für 50+ globale Marken ermöglichen es, legal und unauffällig Rohdaten zu Tausenden von Sneaker-Modellen zu sammeln.'
      },
      {
        title: '2. Aufbau einer kostenlosen CDN-Pipeline',
        text: 'Die Speicherung tausender hochauflösender Fotos erfordert teuren S3-Speicher. Als Workaround wurde der kostenlose Dienst ImgBB integriert. Das Parser-Skript lädt das Bild on-the-fly aus der Originalquelle herunter, konvertiert es in base64 und sendet es per POST-Request über die ImgBB-API. Die Neon-Datenbank speichert nur den finalen, kurzen Direktlink, was die Datenbanklast auf wenige Megabyte reduziert und blitzschnelle Ladezeiten beim Endbenutzer gewährleistet.'
      },
      {
        title: '3. Serverless-Automatisierung (Kostenloser Cron-Server)',
        text: 'Um die Datenbank ohne Kosten für einen dedizierten Server (VPS) aktuell zu halten, wurde eine CI/CD-Pipeline in GitHub Actions eingerichtet. Es wurde ein YML-Workflow geschrieben, der automatisch 4 Mal täglich nach Zeitplan (Cron) ausgeführt wird. Das Skript führt UPSERT-Abfragen in der Neon-DB durch. Es scannt den Markt, findet neue Releases und fügt sie der Datenbank hinzu, wobei Duplikate ignoriert werden. Die Infrastruktur ist vollständig autonom.'
      },
      {
        title: '4. Daten-Normalisierung und Smart Search',
        text: 'Da Daten aus Drittquellen oft unstrukturiert sind:\n• Datumsverarbeitung: Ein intelligenter Handler parst Release-Daten aus verschiedenen Nicht-Standard-Formaten und konvertiert sie in einen einheitlichen release_year-Standard.\n• Beseitigung von SEO-Duplikaten (Regex): Ein Algorithmus bereinigt Suchanfragen. Wenn der Modellname bereits den Markennamen enthält, entfernt ein regulärer Ausdruck das Duplikat. Dies macht aus einer fehlerhaften "UGG UGG Classic" Anfrage eine präzise "UGG Classic kaufen" Anfrage.\n• Isolierte Suche: SQL-Abfragen nutzen ILIKE und ein Array bekannter Marken, damit eine Suche nach der Marke "ON" keine "Salomon" Sneaker liefert.'
      },
      {
        title: '5. Telegram Identity & Self-DDoS-Schutz',
        text: '• Nahtlose Autorisierung: Direkte Integration von Telegrams initDataUnsafe. Die App erfasst automatisch die eindeutige user_id und lädt das gespeicherte Archiv aus der Neon-Datenbank.\n• Vermeidung von Endlosschleifen: Ein Memory Leak in React wurde lokalisiert und behoben. Das Auslagern von Übersetzungsobjekten aus dem Lebenszyklus der Komponente verhinderte kaskadierendes Re-Rendering, das zu einer DDoS-Last auf den eigenen Vercel-Servern führte.'
      }
    ],
    outro: 'Das Projekt ist ein vollwertiges, skalierbares MVP, das mit aggressiver Ressourcenoptimierung erstellt wurde. Bemerkenswert ist, dass das Architekturmanagement, die CI/CD-Kontrolle, das Vercel-Deployment und direkte SQL-Migrationen in der Datenbank überwiegend von einem Mobilgerät aus durchgeführt wurden, was die Flexibilität des gewählten Cloud-Stacks unterstreicht.'
  }
}

export default function AboutView({ lang, themeColors, isDark }: AboutViewProps) {
  const content = CONTENT[lang]

  const formatBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-serif font-medium">{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  const renderTextWithBreaks = (text: string) => {
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i !== text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))
  }

  return (
    <div className="flex flex-col pb-20 animate-fade-in text-[13px] font-sans font-light leading-relaxed max-w-2xl">
      <div className="mb-10">
        <h1 className="font-serif text-3xl md:text-5xl leading-none tracking-[-0.02em] mb-3">
          {content.title}
        </h1>
        <p className="text-[11px] font-sans uppercase tracking-widest" style={{ color: themeColors.textMuted }}>
          {content.subtitle}
        </p>
      </div>

      <p className="mb-10 text-[14px]" style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}>
        {content.intro}
      </p>

      <div className="mb-10 p-6 rounded-sm" style={{ backgroundColor: themeColors.imageBg, border: `1px solid ${themeColors.borderFaint}` }}>
        <h2 className="font-serif text-xl mb-4">{content.stackTitle}</h2>
        <ul className="flex flex-col gap-2">
          {content.stack.map((item, idx) => (
            <li key={idx} style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
              <span className="opacity-50 mr-2">—</span>
              {formatBold(item)}
            </li>
          ))}
        </ul>
      </div>

      <h2 className="font-serif text-2xl mb-4">{content.hacksTitle}</h2>
      <p className="mb-8" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
        {content.hacksIntro}
      </p>

      <div className="flex flex-col gap-8 mb-12">
        {content.sections.map((sec, idx) => (
          <div key={idx} className="border-l-[1px] pl-5" style={{ borderColor: themeColors.border }}>
            <h3 className="font-serif text-lg mb-2">{sec.title}</h3>
            <p style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
              {renderTextWithBreaks(sec.text)}
            </p>
          </div>
        ))}
      </div>

      <div 
        className="pt-8 text-[12px] italic" 
        style={{ borderTop: `1px solid ${themeColors.borderFaint}`, color: themeColors.textMuted }}
      >
        {content.outro}
      </div>
    </div>
  )
}

