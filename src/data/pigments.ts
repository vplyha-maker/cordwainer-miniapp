import { SpectrumPoint, parseSpectrum, spectrumToRGB, rgbToHex, RGB } from '../utils/colorScience'

export interface Pigment {
  id: string
  name: {
    uk: string
    ru: string
    en: string
  }
  spectrumText?: string
  spectrum?: SpectrumPoint[]
  color?: RGB
  hex?: string
}

export const PIGMENTS: Pigment[] = [
  // Белые
  { id: 'titanium_white', name: { uk: 'Титанові білила', ru: 'Титановые белила', en: 'Titanium White' } },
  { id: 'zinc_white', name: { uk: 'Цинкові білила', ru: 'Цинковые белила', en: 'Zinc White' } },
  { id: 'lead_white', name: { uk: 'Свинцеві білила', ru: 'Свинцовые белила', en: 'Lead White' } },
  { id: 'antimony_white', name: { uk: 'Сурьмяні білила', ru: 'Сурьмяные белила', en: 'Antimony White' } },
  { id: 'lithopone', name: { uk: 'Літопон', ru: 'Литопон', en: 'Lithopone' } },
  { id: 'chalk', name: { uk: 'Крейда', ru: 'Мел', en: 'Chalk' } },
  { id: 'gypsum', name: { uk: 'Гіпс', ru: 'Гипс', en: 'Gypsum' } },

  // Жёлтые
  { id: 'cadmium_yellow', name: { uk: 'Кадмій жовтий', ru: 'Кадмий жёлтый', en: 'Cadmium Yellow' } },
  { id: 'chrome_yellow', name: { uk: 'Хромова жовта', ru: 'Хромовая жёлтая', en: 'Chrome Yellow' } },
  { id: 'naples_yellow', name: { uk: 'Неаполітанська жовта', ru: 'Неаполитанская жёлтая', en: 'Naples Yellow' } },
  { id: 'hansa_yellow', name: { uk: 'Ганза жовта', ru: 'Ганза жёлтая', en: 'Hansa Yellow' } },
  { id: 'arylide_yellow', name: { uk: 'Арилід жовтий', ru: 'Арилид жёлтый', en: 'Arylide Yellow' } },
  { id: 'nickel_azo_yellow', name: { uk: 'Нікель-азо жовтий', ru: 'Никель-азо жёлтый', en: 'Nickel Azo Yellow' } },
  { id: 'cobalt_yellow', name: { uk: 'Кобальт жовтий', ru: 'Кобальт жёлтый', en: 'Cobalt Yellow' } },
  { id: 'lead_tin_yellow_i', name: { uk: 'Свинцево-олов\'яна жовта I', ru: 'Свинцово-оловянная жёлтая I', en: 'Lead Tin Yellow I' } },
  { id: 'lead_tin_yellow_ii', name: { uk: 'Свинцево-олов\'яна жовта II', ru: 'Свинцово-оловянная жёлтая II', en: 'Lead Tin Yellow II' } },
  { id: 'massicot', name: { uk: 'Масикот', ru: 'Массикот', en: 'Massicot' } },
  { id: 'orpiment', name: { uk: 'Аурипігмент', ru: 'Аурипигмент', en: 'Orpiment' } },
  { id: 'gamboge', name: { uk: 'Гуммігут', ru: 'Гуммигут', en: 'Gamboge' } },
  { id: 'saffron', name: { uk: 'Шафран', ru: 'Шафран', en: 'Saffron' } },
  { id: 'curcuma', name: { uk: 'Куркума', ru: 'Куркума', en: 'Curcuma' } },
  { id: 'stil_de_grain', name: { uk: 'Стиль-де-грен', ru: 'Стиль-де-грен', en: 'Stil de Grain' } },
  { id: 'yellow_ochre', name: { uk: 'Вохра жовта', ru: 'Охра жёлтая', en: 'Yellow Ochre' } },
  { id: 'yellow_lake_reseda', name: { uk: 'Жовтий лак резеда', ru: 'Жёлтый лак резеда', en: 'Yellow Lake Reseda' } },
  { id: 'safflower', name: { uk: 'Сафлор', ru: 'Сафлор', en: 'Safflower' } },

  // Красные
  { id: 'cadmium_red', name: { uk: 'Кадмій червоний', ru: 'Кадмий красный', en: 'Cadmium Red' } },
  { id: 'vermilion', name: { uk: 'Кіновар (штучна)', ru: 'Киноварь (искусственная)', en: 'Vermilion Artificial' } },
  { id: 'vermilion_nat', name: { uk: 'Кіновар (натуральна)', ru: 'Киноварь (натуральная)', en: 'Vermilion Natural' } },
  { id: 'red_lead', name: { uk: 'Свинцевий сурик', ru: 'Свинцовый сурик', en: 'Red Lead' } },
  { id: 'red_ochre', name: { uk: 'Вохра червона', ru: 'Охра красная', en: 'Red Ochre' } },
  { id: 'realgar', name: { uk: 'Реальгар', ru: 'Реальгар', en: 'Realgar' } },
  { id: 'alizarine', name: { uk: 'Алізарин', ru: 'Ализарин', en: 'Alizarine' } },
  { id: 'carmine_lake', name: { uk: 'Кармінний лак', ru: 'Карминный лак', en: 'Carmine Lake' } },
  { id: 'madder_lake', name: { uk: 'Крап-лак', ru: 'Крапп-лак', en: 'Madder Lake' } },
  { id: 'lac_dye', name: { uk: 'Лак-дай', ru: 'Лак-дай', en: 'Lac Dye' } },
  { id: 'naphthol_red', name: { uk: 'Нафтол червоний', ru: 'Нафтол красный', en: 'Naphthol Red' } },
  { id: 'pyrrole_red', name: { uk: 'Піррол червоний', ru: 'Пиррол красный', en: 'Pyrrole Red' } },
  { id: 'rhodamine', name: { uk: 'Родамін', ru: 'Родамин', en: 'Rhodamine' } },

  // Синие
  { id: 'phthalo_blue', name: { uk: 'Фталоціанін синій', ru: 'Фталоцианин синий', en: 'Phthalo Blue' } },
  { id: 'ultramarine', name: { uk: 'Ультрамарин (штучний)', ru: 'Ультрамарин (искусственный)', en: 'Ultramarine Artificial' } },
  { id: 'ultramarine_nat', name: { uk: 'Ультрамарин (натуральний)', ru: 'Ультрамарин (натуральный)', en: 'Ultramarine Natural' } },
  { id: 'cobalt_blue', name: { uk: 'Кобальт синій', ru: 'Кобальт синий', en: 'Cobalt Blue' } },
  { id: 'cobalt_cerulean', name: { uk: 'Кобальт небесно-блакитний', ru: 'Кобальт небесно-голубой', en: 'Cobalt Cerulean' } },
  { id: 'cobalt_chromite_blue', name: { uk: 'Кобальт хромітовий синій', ru: 'Кобальт хромитовый синий', en: 'Cobalt Chromite Blue' } },
  { id: 'prussian_blue', name: { uk: 'Берлінська лазур', ru: 'Берлинская лазурь', en: 'Prussian Blue' } },
  { id: 'azurite', name: { uk: 'Азурит', ru: 'Азурит', en: 'Azurite' } },
  { id: 'blue_bice', name: { uk: 'Блакитна біса', ru: 'Голубая биса', en: 'Blue Bice' } },
  { id: 'egyptian_blue', name: { uk: 'Єгипетський синій', ru: 'Египетский синий', en: 'Egyptian Blue' } },
  { id: 'han_blue', name: { uk: 'Ханьський синій', ru: 'Ханьский синий', en: 'Han Blue' } },
  { id: 'maya_blue', name: { uk: 'Майя-синій', ru: 'Майя-синий', en: 'Maya Blue' } },
  { id: 'smalt', name: { uk: 'Смальта', ru: 'Смальта', en: 'Smalt' } },
  { id: 'indigo', name: { uk: 'Індиго', ru: 'Индиго', en: 'Indigo' } },
  { id: 'methylene_blue', name: { uk: 'Метиленовий синій', ru: 'Метиленовый синий', en: 'Methylene Blue' } },
  { id: 'tyrian_purple', name: { uk: 'Тірійський пурпур', ru: 'Тирский пурпур', en: 'Tyrian Purple' } },

  // Зелёные
  { id: 'phthalo_green', name: { uk: 'Фталоціанін зелений', ru: 'Фталоцианин зелёный', en: 'Phthalo Green' } },
  { id: 'viridian', name: { uk: 'Віридіанова зелень', ru: 'Виридоновая зелень', en: 'Viridian' } },
  { id: 'chrome_oxide_green', name: { uk: 'Оксид хрому зелений', ru: 'Оксид хрома зелёный', en: 'Chrome Oxide Green' } },
  { id: 'cadmium_green', name: { uk: 'Кадмій зелений', ru: 'Кадмий зелёный', en: 'Cadmium Green' } },
  { id: 'cobalt_titanate_green', name: { uk: 'Кобальт титанатовий зелений', ru: 'Кобальт титанатовый зелёный', en: 'Cobalt Titanate Green' } },
  { id: 'green_earth', name: { uk: 'Зелена земля', ru: 'Зелёная земля', en: 'Green Earth' } },
  { id: 'malachite', name: { uk: 'Малахіт', ru: 'Малахит', en: 'Malachite' } },
  { id: 'verdigris', name: { uk: 'Ярь-медянка', ru: 'Ярь-медянка', en: 'Verdigris' } },
  { id: 'copper_resinate', name: { uk: 'Мідний резинат', ru: 'Медный резинат', en: 'Copper Resinate' } },
  { id: 'naphthol_green', name: { uk: 'Нафтол зелений', ru: 'Нафтол зелёный', en: 'Naphthol Green' } },
  { id: 'vivianite', name: { uk: 'Вівіаніт', ru: 'Вивианит', en: 'Vivianite' } },

  // Коричневые
  { id: 'burnt_sienna', name: { uk: 'Сієна палена', ru: 'Сиена жжёная', en: 'Burnt Sienna' } },
  { id: 'raw_sienna', name: { uk: 'Сієна натуральна', ru: 'Сиена натуральная', en: 'Raw Sienna' } },
  { id: 'burnt_umber', name: { uk: 'Умбра палена', ru: 'Умбра жжёная', en: 'Burnt Umber' } },
  { id: 'raw_umber', name: { uk: 'Умбра натуральна', ru: 'Умбра натуральная', en: 'Raw Umber' } },
  { id: 'van_dyke_brown', name: { uk: 'Ван Дік коричневий', ru: 'Ван Дик коричневый', en: 'Van Dyke Brown' } },
  { id: 'sepia', name: { uk: 'Сепія', ru: 'Сепия', en: 'Sepia' } },
  { id: 'bitumen', name: { uk: 'Бітум', ru: 'Битум', en: 'Bitumen' } },

  // Чёрные
  { id: 'bone_black', name: { uk: 'Кісткова сажа', ru: 'Костяная сажа', en: 'Bone Black' } },
  { id: 'ivory_black', name: { uk: 'Чорна зі слонової кістки', ru: 'Чёрная из слоновой кости', en: 'Ivory Black' } },
  { id: 'lamp_black', name: { uk: 'Сажа газова', ru: 'Сажа газовая', en: 'Lamp Black' } },
  { id: 'vine_black', name: { uk: 'Виноградна сажа', ru: 'Виноградная сажа', en: 'Vine Black' } },
  { id: 'aniline_black', name: { uk: 'Анілінова чорна', ru: 'Анилиновая чёрная', en: 'Aniline Black' } },

  // Фиолетовые
  { id: 'cobalt_violet', name: { uk: 'Кобальт фіолетовий', ru: 'Кобальт фиолетовый', en: 'Cobalt Violet' } },
  { id: 'manganese_violet', name: { uk: 'Марганцева фіолетова', ru: 'Марганцевая фиолетовая', en: 'Manganese Violet' } },

  // Прочие
  { id: 'iron_gall_ink', name: { uk: 'Залізогалові чорнила', ru: 'Железогалловые чернила', en: 'Iron Gall Ink' } },
  { id: 'bismuth', name: { uk: 'Вісмут', ru: 'Висмут', en: 'Bismuth' } },
  { id: 'acrylic_binder', name: { uk: 'Акриловий біндер', ru: 'Акриловый биндер', en: 'Acrylic Binder' } },
  { id: 'cardboard', name: { uk: 'Картон', ru: 'Картон', en: 'Cardboard' } },
]

export function initPigment(pigment: Pigment, spectrumText: string): Pigment {
  const spectrum = parseSpectrum(spectrumText)
  const color = spectrumToRGB(spectrum)
  const hex = rgbToHex(color)

  return {
    ...pigment,
    spectrumText,
    spectrum,
    color,
    hex,
  }
}
