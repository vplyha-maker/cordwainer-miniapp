import { motion } from 'framer-motion'
import { Lang } from '../App'

type Props = {
  lang: Lang
  onClose: () => void
}

export function ColorMethodology({ lang, onClose }: Props) {
  const isUk = lang === 'uk'

  const t = {
    title: isUk ? 'Методологія' : 'Методология',
    subtitle: isUk
      ? 'Спектральна колориметрія · Kubelka–Munk · CIEDE2000'
      : 'Спектральная колориметрия · Kubelka–Munk · CIEDE2000',
    whyTitle: isUk
      ? 'Чому це не просто піпетка кольору?'
      : 'Почему это не просто пипетка для цвета?',
    whyBody: isUk
      ? 'Якщо в звичайному графічному редакторі (у режимі RGB) змішати чистий жовтий і чистий синій, ви отримаєте сірий. Але будь-який художник знає: на реальній палітрі вийде зелений. Екрани випромінюють світло, а фарби його поглинають.\n\nЦей калькулятор вирішує фундаментальну проблему цифрової колористики — він змішує не пікселі, а фізичні спектри.'
      : 'Если в обычном графическом редакторе (в режиме RGB) смешать чистый жёлтый и чистый синий, вы получите серый. Но любой художник знает: на реальной палитре получится зелёный. Экраны излучают свет, а краски его поглощают.\n\nЭтот калькулятор решает фундаментальную проблему цифровой колористики — он смешивает не пиксели, а физические спектры.',
    howTitle: isUk ? 'Як це працює' : 'Как это работает',
    forsTitle: isUk
      ? 'Спектральні дані (FORS)'
      : 'Спектральные данные (FORS)',
    forsBody: isUk
      ? 'Ми не використовуємо базові RGB-значення. Під капотом завантажені реальні графіки спектроскопії відбиття (від 380 до 780 нм) для кожного окремого кольору.'
      : 'Мы не используем базовые RGB-значения. Под капотом загружены реальные графики спектроскопии отражения (от 380 до 780 нм) для каждого отдельного цвета.',
    kmTitle: isUk ? 'Теорія Кубелки–Мунка' : 'Теория Кубелки–Мунка',
    kmBody: isUk
      ? 'Математична модель фізики фарб. Калькулятор враховує коефіцієнти поглинання та розсіювання, імітуючи справжню укривистість, прозорі шари (лесирування) і вплив кольору основи.'
      : 'Математическая модель физики красок. Калькулятор учитывает коэффициенты поглощения и рассеяния, имитируя настоящую укрывистость, прозрачные слои (лессировки) и влияние цвета основы.',
    deTitle: isUk ? 'Точність CIEDE2000' : 'Точность CIEDE2000',
    deBody: isUk
      ? 'Для підбору ідеального рецепту використовується стандарт CIEDE2000. Алгоритм оцінює колірну різницю (Delta E) так само, як це робить людське око, виключаючи грубі математичні похибки.'
      : 'Для подбора идеального рецепта используется стандарт CIEDE2000. Алгоритм оценивает цветовое различие (Delta E) точно так же, как это делает человеческий глаз, исключая грубые математические погрешности.',
    baseTitle: isUk ? 'Наша база пігментів' : 'Наша база пигментов',
    histTitle: isUk
      ? 'Історичні та класичні'
      : 'Исторические и классические',
    histBody: isUk
      ? 'Єгипетський синій, аурипігмент, кіновар, тірський пурпур і землі — автентичні матеріали, якими століттями користувалися реставратори та майстри минулого.'
      : 'Египетский синий, аурипигмент, киноварь, тирский пурпур и земли — аутентичные материалы, которые веками использовали реставраторы и мастера прошлого.',
    modernTitle: isUk
      ? 'Сучасна хімія (Color Index)'
      : 'Современная химия (Color Index)',
    modernBody: isUk
      ? 'Точні спектри актуальних органічних і неорганічних пігментів (хінакрідони, фталоціаніни, нікель-титанові та вісмутові жовті), що використовуються в промисловості та Modern Art.'
      : 'Точные спектры актуальных органических и неорганических пигментов (хинакридоны, фталоцианины, никель-титановые и висмутовые жёлтые), используемых в современной промышленности и Modern Art.',
    anilineTitle: isUk ? 'Анілінові системи' : 'Анилиновые системы',
    anilineBody: isUk
      ? 'Спеціалізовані прозорі барвники для складної роботи зі шкірою — з симуляцією слабкого укриття та шарів.'
      : 'Специализированные прозрачные красители для сложной работы с кожей — с симуляцией слабого укрытия и слоёв.',
    useTitle: isUk ? 'Що робити з результатами?' : 'Что делать с результатами?',
    mixTitle: isUk
      ? 'Змішувати фарби в майстерні'
      : 'Смешивать краски в мастерской',
    mixBody: isUk
      ? 'Ви отримуєте математично вивірені пропорції (мл) для змішування на реальній палітрі.\n\nМи чесні: не обіцяємо 100% попадання. На фінальний результат впливають товщина шару, тип біндера, якість партії пігменту та освітлення. Рецепт — максимально точна відправна точка, яка економить час і матеріал.'
      : 'Вы получаете математически выверенные пропорции (мл) для смешивания на реальной палитре.\n\nМы честны: не обещаем 100% попадания. На финальный результат влияют толщина слоя, тип биндера, качество партии пигмента и освещение. Рецепт — максимально точная отправная точка, которая экономит время и материал.',
    shopTitle: isUk
      ? 'Замовляти фарбу в магазині'
      : 'Заказывать краску в магазине',
    shopBody: isUk
      ? 'Отриманий HEX-код можна показати колористам у будівельному магазині або студії автоемалей. Їхні машини переведуть код у потрібний колір для інтер’єрної, фасадної чи поліуретанової фарби.'
      : 'Полученный HEX-код можно показать колористам в строительном магазине или студии автоэмалей. Их машины переведут код в нужный цвет для интерьерной, фасадной или полиуретановой краски.',
    digTitle: isUk
      ? 'Використовувати в цифровому арті'
      : 'Использовать в цифровом арте',
    digBody: isUk
      ? 'Скопіюйте код у Procreate, Photoshop або Figma. Цифрові художники можуть працювати з кольорами, які поводяться як справжня олія чи акварель.'
      : 'Скопируйте код в Procreate, Photoshop или Figma. Цифровые художники могут работать с цветами, которые ведут себя как настоящее масло или акварель.',
    close: isUk ? 'Зрозуміло' : 'Понятно',
  }

  const Section = ({
    accent,
    title,
    body,
  }: {
    accent: string
    title: string
    body: string
  }) => (
    <div className="rounded-2xl bg-[#1C1816] border border-white/6 overflow-hidden">
      <div className="flex">
        <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: accent }} />
        <div className="px-4 py-3.5 flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-[#F5F1EA] mb-1.5 leading-snug">
            {title}
          </h3>
          <p className="text-[13px] leading-relaxed text-[#F5F1EA]/65 whitespace-pre-line">
            {body}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-[#0F0D0C] flex flex-col"
    >
      {/* Шапка */}
      <header className="flex-shrink-0 px-4 pt-safe pb-3 border-b border-white/6">
        <div className="flex items-center gap-2 py-3">
          <button
            onClick={onClose}
            className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-[#F5F1EA]/70 active:opacity-100"
            aria-label="Back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold tracking-tight text-[#F5F1EA]">
              {t.title}
            </h1>
            <p className="text-[11px] text-[#C4A35A]/80 truncate mt-0.5">
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Смуга пігментів */}
        <div className="flex gap-1.5 pb-1">
          {[
            '#B22F3D', // кіновар
            '#C4A35A', // охра
            '#3A5F8A', // ультрамарин
            '#2F6B5A', // малахіт
            '#6B3A5A', // пурпур
            '#E8D5A3', // свинцеві білила
          ].map((c) => (
            <div
              key={c}
              className="h-1.5 flex-1 rounded-full"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </header>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-28">
        {/* Вступ */}
        <div className="rounded-2xl bg-[#1C1816] border border-[#C4A35A]/25 px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#C4A35A]" />
            <h2 className="text-[15px] font-semibold text-[#C4A35A]">
              {t.whyTitle}
            </h2>
          </div>
          <p className="text-[13px] leading-relaxed text-[#F5F1EA]/70 whitespace-pre-line">
            {t.whyBody}
          </p>
        </div>

        <h2 className="text-[12px] font-semibold tracking-wide uppercase text-[#F5F1EA]/40 px-1 pt-1">
          {t.howTitle}
        </h2>

        <Section accent="#3A5F8A" title={t.forsTitle} body={t.forsBody} />
        <Section accent="#2F6B5A" title={t.kmTitle} body={t.kmBody} />
        <Section accent="#C4A35A" title={t.deTitle} body={t.deBody} />

        <h2 className="text-[12px] font-semibold tracking-wide uppercase text-[#F5F1EA]/40 px-1 pt-2">
          {t.baseTitle}
        </h2>

        <Section accent="#B22F3D" title={t.histTitle} body={t.histBody} />
        <Section accent="#6B3A5A" title={t.modernTitle} body={t.modernBody} />
        <Section accent="#3A5F8A" title={t.anilineTitle} body={t.anilineBody} />

        <h2 className="text-[12px] font-semibold tracking-wide uppercase text-[#F5F1EA]/40 px-1 pt-2">
          {t.useTitle}
        </h2>

        <Section accent="#C4A35A" title={'🎨 ' + t.mixTitle} body={t.mixBody} />
        <Section accent="#3A5F8A" title={'🏪 ' + t.shopTitle} body={t.shopBody} />
        <Section accent="#2F6B5A" title={'💻 ' + t.digTitle} body={t.digBody} />
      </div>

      {/* Нижня кнопка */}
      <div className="flex-shrink-0 px-4 pb-safe pt-3 border-t border-white/6 bg-[#0F0D0C]">
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl bg-[#C4A35A] text-[#1A1512] text-[15px] font-semibold active:scale-[0.98]"
        >
          {t.close}
        </button>
      </div>
    </motion.div>
  )
}
