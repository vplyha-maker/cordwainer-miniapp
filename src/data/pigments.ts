import { SpectrumPoint, parseSpectrum, spectrumToRGB, rgbToHex, RGB } from '../utils/colorScience'

export interface Pigment {
  id: string
  name: {
    uk: string
    ru: string
    en: string
    de: string
  }
  spectrumText?: string
  spectrum?: SpectrumPoint[]
  color?: RGB
  hex?: string
}

export const PIGMENTS: Pigment[] = [
  // Белые
  { id: 'titanium_white', name: { uk: 'Титанові білила', ru: 'Титановые белила', en: 'Titanium White', de: 'Titanweiß' } },
  { id: 'zinc_white', name: { uk: 'Цинкові білила', ru: 'Цинковые белила', en: 'Zinc White', de: 'Zinkweiß' } },
  { id: 'lead_white', name: { uk: 'Свинцеві білила', ru: 'Свинцовые белила', en: 'Lead White', de: 'Bleiweiß' } },
  { id: 'antimony_white', name: { uk: 'Сурьмяні білила', ru: 'Сурьмяные белила', en: 'Antimony White', de: 'Antimonweiß' } },
  { id: 'lithopone', name: { uk: 'Літопон', ru: 'Литопон', en: 'Lithopone', de: 'Lithopone' } },
  { id: 'chalk', name: { uk: 'Крейда', ru: 'Мел', en: 'Chalk', de: 'Kreide' } },
  { id: 'gypsum', name: { uk: 'Гіпс', ru: 'Гипс', en: 'Gypsum', de: 'Gips' } },

  // Жёлтые
  { id: 'cadmium_yellow', name: { uk: 'Кадмій жовтий', ru: 'Кадмий жёлтый', en: 'Cadmium Yellow', de: 'Kadmiumgelb' } },
  { id: 'chrome_yellow', name: { uk: 'Хромова жовта', ru: 'Хромовая жёлтая', en: 'Chrome Yellow', de: 'Chromgelb' } },
  { id: 'naples_yellow', name: { uk: 'Неаполітанська жовта', ru: 'Неаполитанская жёлтая', en: 'Naples Yellow', de: 'Neapelgelb' } },
  { id: 'hansa_yellow', name: { uk: 'Ганза жовта', ru: 'Ганза жёлтая', en: 'Hansa Yellow', de: 'Hansagelb' } },
  { id: 'arylide_yellow', name: { uk: 'Арилід жовтий', ru: 'Арилид жёлтый', en: 'Arylide Yellow', de: 'Arylidgelb' } },
  { id: 'nickel_azo_yellow', name: { uk: 'Нікель-азо жовтий', ru: 'Никель-азо жёлтый', en: 'Nickel Azo Yellow', de: 'Nickel-Azo-Gelb' } },
  { id: 'cobalt_yellow', name: { uk: 'Кобальт жовтий', ru: 'Кобальт жёлтый', en: 'Cobalt Yellow', de: 'Kobaltgelb (Aureolin)' } },
  { id: 'lead_tin_yellow_i', name: { uk: 'Свинцево-олов\'яна жовта I', ru: 'Свинцово-оловянная жёлтая I', en: 'Lead Tin Yellow I', de: 'Blei-Zinn-Gelb I' } },
  { id: 'lead_tin_yellow_ii', name: { uk: 'Свинцево-олов\'яна жовта II', ru: 'Свинцово-оловянная жёлтая II', en: 'Lead Tin Yellow II', de: 'Blei-Zinn-Gelb II' } },
  { id: 'massicot', name: { uk: 'Масикот', ru: 'Массикот', en: 'Massicot', de: 'Massicot (Bleiglätte)' } },
  { id: 'orpiment', name: { uk: 'Аурипігмент', ru: 'Аурипигмент', en: 'Orpiment', de: 'Auripigment' } },
  { id: 'gamboge', name: { uk: 'Гуммігут', ru: 'Гуммигут', en: 'Gamboge', de: 'Gummigutt' } },
  { id: 'saffron', name: { uk: 'Шафран', ru: 'Шафран', en: 'Saffron', de: 'Safran' } },
  { id: 'curcuma', name: { uk: 'Куркума', ru: 'Куркума', en: 'Curcuma', de: 'Kurkuma' } },
  { id: 'stil_de_grain', name: { uk: 'Стиль-де-грен', ru: 'Стиль-де-грен', en: 'Stil de Grain', de: 'Schüttgelb (Stil de Grain)' } },
  { id: 'yellow_ochre', name: { uk: 'Вохра жовта', ru: 'Охра жёлтая', en: 'Yellow Ochre', de: 'Gelber Ocker' } },
  { id: 'yellow_lake_reseda', name: { uk: 'Жовтий лак резеда', ru: 'Жёлтый лак резеда', en: 'Yellow Lake Reseda', de: 'Reseda-Gelblack' } },
  { id: 'safflower', name: { uk: 'Сафлор', ru: 'Сафлор', en: 'Safflower', de: 'Saflor' } },

  // Красные
  { id: 'cadmium_red', name: { uk: 'Кадмій червоний', ru: 'Кадмий красный', en: 'Cadmium Red', de: 'Kadmiumrot' } },
  { id: 'vermilion', name: { uk: 'Кіновар (штучна)', ru: 'Киноварь (искусственная)', en: 'Vermilion Artificial', de: 'Zinnober (künstlich)' } },
  { id: 'vermilion_nat', name: { uk: 'Кіновар (натуральна)', ru: 'Киноварь (натуральная)', en: 'Vermilion Natural', de: 'Zinnober (natürlich)' } },
  { id: 'red_lead', name: { uk: 'Свинцевий сурик', ru: 'Свинцовый сурик', en: 'Red Lead', de: 'Bleimennige' } },
  { id: 'red_ochre', name: { uk: 'Вохра червона', ru: 'Охра красная', en: 'Red Ochre', de: 'Roter Ocker' } },
  { id: 'realgar', name: { uk: 'Реальгар', ru: 'Реальгар', en: 'Realgar', de: 'Realgar' } },
  { id: 'alizarine', name: { uk: 'Алізарин', ru: 'Ализарин', en: 'Alizarine', de: 'Alizarin' } },
  { id: 'carmine_lake', name: { uk: 'Кармінний лак', ru: 'Карминный лак', en: 'Carmine Lake', de: 'Karminlack' } },
  { id: 'madder_lake', name: { uk: 'Крап-лак', ru: 'Крапп-лак', en: 'Madder Lake', de: 'Krapplack' } },
  { id: 'lac_dye', name: { uk: 'Лак-дай', ru: 'Лак-дай', en: 'Lac Dye', de: 'Lac Dye (Färberlack)' } },
  { id: 'naphthol_red', name: { uk: 'Нафтол червоний', ru: 'Нафтол красный', en: 'Naphthol Red', de: 'Naphtholrot' } },
  { id: 'pyrrole_red', name: { uk: 'Піррол червоний', ru: 'Пиррол красный', en: 'Pyrrole Red', de: 'Pyrrolrot' } },
  { id: 'rhodamine', name: { uk: 'Родамін', ru: 'Родамин', en: 'Rhodamine', de: 'Rhodamin' } },

  // Синие
  { id: 'phthalo_blue', name: { uk: 'Фталоціанін синій', ru: 'Фталоцианин синий', en: 'Phthalo Blue', de: 'Phthaloblau' } },
  { id: 'ultramarine', name: { uk: 'Ультрамарин (штучний)', ru: 'Ультрамарин (искусственный)', en: 'Ultramarine Artificial', de: 'Ultramarin (künstlich)' } },
  { id: 'ultramarine_nat', name: { uk: 'Ультрамарин (натуральний)', ru: 'Ультрамарин (натуральный)', en: 'Ultramarine Natural', de: 'Ultramarin (natürlich)' } },
  { id: 'cobalt_blue', name: { uk: 'Кобальт синій', ru: 'Кобальт синий', en: 'Cobalt Blue', de: 'Kobaltblau' } },
  { id: 'cobalt_cerulean', name: { uk: 'Кобальт небесно-блакитний', ru: 'Кобальт небесно-голубой', en: 'Cobalt Cerulean', de: 'Coelinblau' } },
  { id: 'cobalt_chromite_blue', name: { uk: 'Кобальт хромітовий синій', ru: 'Кобальт хромитовый синий', en: 'Cobalt Chromite Blue', de: 'Kobaltchromitblau' } },
  { id: 'prussian_blue', name: { uk: 'Берлінська лазур', ru: 'Берлинская лазурь', en: 'Prussian Blue', de: 'Preußischblau' } },
  { id: 'azurite', name: { uk: 'Азурит', ru: 'Азурит', en: 'Azurite', de: 'Azurit' } },
  { id: 'blue_bice', name: { uk: 'Блакитна біса', ru: 'Голубая биса', en: 'Blue Bice', de: 'Bergblau (Blue Bice)' } },
  { id: 'egyptian_blue', name: { uk: 'Єгипетський синій', ru: 'Египетский синий', en: 'Egyptian Blue', de: 'Ägyptischblau' } },
  { id: 'han_blue', name: { uk: 'Ханьський синій', ru: 'Ханьский синий', en: 'Han Blue', de: 'Han-Blau' } },
  { id: 'maya_blue', name: { uk: 'Майя-синій', ru: 'Майя-синий', en: 'Maya Blue', de: 'Maya-Blau' } },
  { id: 'smalt', name: { uk: 'Смальта', ru: 'Смальта', en: 'Smalt', de: 'Smalte' } },
  { id: 'indigo', name: { uk: 'Індиго', ru: 'Индиго', en: 'Indigo', de: 'Indigo' } },
  { id: 'methylene_blue', name: { uk: 'Метиленовий синій', ru: 'Метиленовый синий', en: 'Methylene Blue', de: 'Methylenblau' } },
  { id: 'tyrian_purple', name: { uk: 'Тірійський пурпур', ru: 'Тирский пурпур', en: 'Tyrian Purple', de: 'Tyrischer Purpur' } },

  // Зелёные
  { id: 'phthalo_green', name: { uk: 'Фталоціанін зелений', ru: 'Фталоцианин зелёный', en: 'Phthalo Green', de: 'Phthalogrün' } },
  { id: 'viridian', name: { uk: 'Віридіанова зелень', ru: 'Виридоновая зелень', en: 'Viridian', de: 'Viridiangrün' } },
  { id: 'chrome_oxide_green', name: { uk: 'Оксид хрому зелений', ru: 'Оксид хрома зелёный', en: 'Chrome Oxide Green', de: 'Chromoxidgrün' } },
  { id: 'cadmium_green', name: { uk: 'Кадмій зелений', ru: 'Кадмий зелёный', en: 'Cadmium Green', de: 'Kadmiumgrün' } },
  { id: 'cobalt_titanate_green', name: { uk: 'Кобальт титанатовий зелений', ru: 'Кобальт титанатовый зелёный', en: 'Cobalt Titanate Green', de: 'Kobalttitanatgrün' } },
  { id: 'green_earth', name: { uk: 'Зелена земля', ru: 'Зелёна земля', en: 'Green Earth', de: 'Grüne Erde' } },
  { id: 'malachite', name: { uk: 'Малахіт', ru: 'Малахит', en: 'Malachite', de: 'Malachit' } },
  { id: 'verdigris', name: { uk: 'Ярь-медянка', ru: 'Ярь-медянка', en: 'Verdigris', de: 'Grünspan' } },
  { id: 'copper_resinate', name: { uk: 'Мідний резинат', ru: 'Медный резинат', en: 'Copper Resinate', de: 'Kupferresinat' } },
  { id: 'naphthol_green', name: { uk: 'Нафтол зелений', ru: 'Нафтол зелёный', en: 'Naphthol Green', de: 'Naphtholgrün' } },
  { id: 'vivianite', name: { uk: 'Вівіаніт', ru: 'Вивианит', en: 'Vivianite', de: 'Vivianit' } },

  // Коричневые
  { id: 'burnt_sienna', name: { uk: 'Сієна палена', ru: 'Сиена жжёная', en: 'Burnt Sienna', de: 'Gebrannte Siena' } },
  { id: 'raw_sienna', name: { uk: 'Сієна натуральна', ru: 'Сиена натуральная', en: 'Raw Sienna', de: 'Rohe Siena' } },
  { id: 'burnt_umber', name: { uk: 'Умбра палена', ru: 'Умбра жжёная', en: 'Burnt Umber', de: 'Gebrannte Umbra' } },
  { id: 'raw_umber', name: { uk: 'Умбра натуральна', ru: 'Умбра натуральная', en: 'Raw Umber', de: 'Rohe Umbra' } },
  { id: 'van_dyke_brown', name: { uk: 'Ван Дік коричневий', ru: 'Ван Дик коричневый', en: 'Van Dyke Brown', de: 'Van-Dyck-Braun' } },
  { id: 'sepia', name: { uk: 'Сепія', ru: 'Сепия', en: 'Sepia', de: 'Sepia' } },
  { id: 'bitumen', name: { uk: 'Бітум', ru: 'Битум', en: 'Bitumen', de: 'Asphalt (Bitumen)' } },

  // Чёрные
  { id: 'bone_black', name: { uk: 'Кісткова сажа', ru: 'Костяная сажа', en: 'Bone Black', de: 'Knochenschwarz' } },
  { id: 'ivory_black', name: { uk: 'Чорна зі слонової кістки', ru: 'Чёрная из слоновой кости', en: 'Ivory Black', de: 'Elfenbeinschwarz' } },
  { id: 'lamp_black', name: { uk: 'Сажа газова', ru: 'Сажа газовая', en: 'Lamp Black', de: 'Lampenschwarz' } },
  { id: 'vine_black', name: { uk: 'Виноградна сажа', ru: 'Виноградная сажа', en: 'Vine Black', de: 'Rebenschwarz' } },
  { id: 'aniline_black', name: { uk: 'Анілінова чорна', ru: 'Анилиновая чёрная', en: 'Aniline Black', de: 'Anilinschwarz' } },

  // Фиолетовые
  { id: 'cobalt_violet', name: { uk: 'Кобальт фіолетовий', ru: 'Кобальт фиолетовый', en: 'Cobalt Violet', de: 'Kobaltviolett' } },
  { id: 'manganese_violet', name: { uk: 'Марганцева фіолетова', ru: 'Марганцевая фиолетовая', en: 'Manganese Violet', de: 'Manganviolett' } },

  // Прочие
  { id: 'iron_gall_ink', name: { uk: 'Залізогалові чорнила', ru: 'Железогалловые чернила', en: 'Iron Gall Ink', de: 'Eisengallustinte' } },
  { id: 'bismuth', name: { uk: 'Вісмут', ru: 'Висмут', en: 'Bismuth', de: 'Bismut' } },
  { id: 'acrylic_binder', name: { uk: 'Акриловий біндер', ru: 'Акриловый биндер', en: 'Acrylic Binder', de: 'Acrylbinder' } },
  { id: 'cardboard', name: { uk: 'Картон', ru: 'Картон', en: 'Cardboard', de: 'Karton' } },

  // ==========================================
  // Modern Art / Colour Index (FORS)
  // ==========================================

  // Белые (современные)
  { id: 'pw_6_anatase', name: { uk: 'Анатаз (PW 6)', ru: 'Анатаз (PW 6)', en: 'Anatase (PW 6)', de: 'Anatas (PW 6)' } },
  { id: 'pw_7_zinc_sulfide', name: { uk: 'Сульфід цинку (PW 7)', ru: 'Сульфид цинка (PW 7)', en: 'Zinc Sulfide (PW 7)', de: 'Zinksulfid (PW 7)' } },
  { id: 'pw_11_antimony_white', name: { uk: 'Сурьмяні білила (PW 11)', ru: 'Сурьмяные белила (PW 11)', en: 'Antimony White (PW 11)', de: 'Antimonweiß (PW 11)' } },
  { id: 'pw_21_barium_sulfate', name: { uk: 'Сульфат барію (PW 21)', ru: 'Сульфат бария (PW 21)', en: 'Barium Sulfate (PW 21)', de: 'Bariumsulfat (PW 21)' } },

  // Чёрные
  { id: 'pbk_1_aniline_black', name: { uk: 'Анілінова чорна (PBk 1)', ru: 'Анилиновая чёрная (PBk 1)', en: 'Aniline Black (PBk 1)', de: 'Anilinschwarz (PBk 1)' } },

  // Жовті
  { id: 'py_32_strontium_yellow', name: { uk: 'Стронцієва жовта (PY 32)', ru: 'Стронциевая жёлтая (PY 32)', en: 'Strontium Yellow (PY 32)', de: 'Strontiumgelb (PY 32)' } },
  { id: 'py_53_nickel_titanium_yellow', name: { uk: 'Нікель-титанова жовта (PY 53)', ru: 'Никель-титановая жёлтая (PY 53)', en: 'Nickel Titanium Yellow (PY 53)', de: 'Nickeltitangelb (PY 53)' } },
  { id: 'py_83_diarylide_yellow_hr', name: { uk: 'Діарилід жовтий HR (PY 83)', ru: 'Диарилид жёлтый HR (PY 83)', en: 'Diarylide Yellow HR (PY 83)', de: 'Diarylidgelb HR (PY 83)' } },
  { id: 'py_108_anthrapyrimidine_yellow', name: { uk: 'Антрапіримідинова жовта (PY 108)', ru: 'Антрапиримидиновая жёлтая (PY 108)', en: 'Anthrapyrimidine Yellow (PY 108)', de: 'Anthrapyrimidingelb (PY 108)' } },
  { id: 'py_109_isoindole_yellow', name: { uk: 'Ізоіндол жовтий (PY 109)', ru: 'Изоиндол жёлтый (PY 109)', en: 'Isoindole Yellow (PY 109)', de: 'Isoindolgelb (PY 109)' } },
  { id: 'py_110_isoindolinone_yellow', name: { uk: 'Ізоіндолінонова жовта (PY 110)', ru: 'Изоиндолиноновая жёлтая (PY 110)', en: 'Isoindolinone Yellow (PY 110)', de: 'Isoindolinongelb (PY 110)' } },
  { id: 'py_129_irgazin_yellow', name: { uk: 'Іргазин жовтий (PY 129)', ru: 'Иргазин жёлтый (PY 129)', en: 'Irgazin Yellow (PY 129)', de: 'Irgazingelb (PY 129)' } },
  { id: 'py_139_isoindoline_yellow', name: { uk: 'Ізоіндолінова жовта (PY 139)', ru: 'Изоиндолиновая жёлтая (PY 139)', en: 'Isoindoline Yellow (PY 139)', de: 'Isoindolingelb (PY 139)' } },
  { id: 'py_150_nickel_azo_yellow', name: { uk: 'Нікель-азо жовтий (PY 150)', ru: 'Никель-азо жёлтый (PY 150)', en: 'Nickel Azo Yellow (PY 150)', de: 'Nickel-Azo-Gelb (PY 150)' } },
  { id: 'py_151_benzimidazolone_yellow_h4g', name: { uk: 'Бензимідазолон жовтий H4G (PY 151)', ru: 'Бензимидазолон жёлтый H4G (PY 151)', en: 'Benzimidazolone Yellow H4G (PY 151)', de: 'Benzimidazolongelb H4G (PY 151)' } },
  { id: 'py_154_benzimidazolone_yellow_h3g', name: { uk: 'Бензимідазолон жовтий H3G (PY 154)', ru: 'Бензимидазолон жёлтый H3G (PY 154)', en: 'Benzimidazolone Yellow H3G (PY 154)', de: 'Benzimidazolongelb H3G (PY 154)' } },
  { id: 'py_159_praseodymium_yellow', name: { uk: 'Празеодимова жовта (PY 159)', ru: 'Празеодимовая жёлтая (PY 159)', en: 'Praseodymium Yellow (PY 159)', de: 'Praseodymgelb (PY 159)' } },
  { id: 'py_184_bismuth_vanadate_yellow', name: { uk: 'Ванадат вісмуту жовтий (PY 184)', ru: 'Ванадат висмута жёлтый (PY 184)', en: 'Bismuth Vanadate Yellow (PY 184)', de: 'Bismutvanadatgelb (PY 184)' } },
  { id: 'py_213_hostaperm_yellow_h5g', name: { uk: 'Hostaperm Yellow H5G (PY 213)', ru: 'Hostaperm Yellow H5G (PY 213)', en: 'Hostaperm Yellow H5G (PY 213)', de: 'Hostapermgelb H5G (PY 213)' } },
  { id: 'py_216_rutile_tin_zinc', name: { uk: 'Рутил олово-цинк (PY 216)', ru: 'Рутил олово-цинк (PY 216)', en: 'Rutile Tin Zinc (PY 216)', de: 'Rutil-Zinn-Zink (PY 216)' } },

  // Помаранчеві
  { id: 'po_5_hansa_orange_r', name: { uk: 'Ганза помаранчева R (PO 5)', ru: 'Ганза оранжевая R (PO 5)', en: 'Hansa Orange R (PO 5)', de: 'Hansaorange R (PO 5)' } },
  { id: 'po_48_quinacridone_burnt_orange', name: { uk: 'Хінакрідон палений помаранчевий (PO 48)', ru: 'Хинакридон жжёный оранжевый (PO 48)', en: 'Quinacridone Burnt Orange (PO 48)', de: 'Chinacridon Gebranntes Orange (PO 48)' } },
  { id: 'po_61_isoindole_orange', name: { uk: 'Ізоіндол помаранчевий (PO 61)', ru: 'Изоиндол оранжевый (PO 61)', en: 'Isoindole Orange (PO 61)', de: 'Isoindolorange (PO 61)' } },
  { id: 'po_73_pyrrole_orange', name: { uk: 'Піррол помаранчевий (PO 73)', ru: 'Пиррол оранжевый (PO 73)', en: 'Pyrrole Orange (PO 73)', de: 'Pyrrolorange (PO 73)' } },

  // Червоні
  { id: 'pr_3_toluidine_red', name: { uk: 'Толуїдин червоний (PR 3)', ru: 'Толуидин красный (PR 3)', en: 'Toluidine Red (PR 3)', de: 'Toluidinrot (PR 3)' } },
  { id: 'pr_9_naphthol_red_as', name: { uk: 'Нафтол червоний AS (PR 9)', ru: 'Нафтол красный AS (PR 9)', en: 'Naphthol Red AS (PR 9)', de: 'Naphtholrot AS (PR 9)' } },
  { id: 'pr_12_permanent_bordeaux_trr', name: { uk: 'Permanent Bordeaux TRR (PR 12)', ru: 'Permanent Bordeaux TRR (PR 12)', en: 'Permanent Bordeaux TRR (PR 12)', de: 'Permanentbordeaux TRR (PR 12)' } },
  { id: 'pr_81_rhodamine_6g', name: { uk: 'Родамін 6G (PR 81)', ru: 'Родамин 6G (PR 81)', en: 'Rhodamine 6G (PR 81)', de: 'Rhodamin 6G (PR 81)' } },
  { id: 'pr_90_eosin_y', name: { uk: 'Еозин Y (PR 90)', ru: 'Эозин Y (PR 90)', en: 'Eosin Y (PR 90)', de: 'Eosin Y (PR 90)' } },
  { id: 'pr_112_naphthol_red_as_d', name: { uk: 'Нафтол червоний AS-D (PR 112)', ru: 'Нафтол красный AS-D (PR 112)', en: 'Naphthol Red AS-D (PR 112)', de: 'Naphtholrot AS-D (PR 112)' } },
  { id: 'pr_122_quinacridone_magenta', name: { uk: 'Хінакрідон маджента (PR 122)', ru: 'Хинакридон маджента (PR 122)', en: 'Quinacridone Magenta (PR 122)', de: 'Chinacridon Magenta (PR 122)' } },
  { id: 'pr_144_azo_red', name: { uk: 'Азо червоний (PR 144)', ru: 'Азо красный (PR 144)', en: 'Azo Red (PR 144)', de: 'Azorot (PR 144)' } },
  { id: 'pr_166_azo_condensation_red', name: { uk: 'Азо-конденсаційний червоний (PR 166)', ru: 'Азо-конденсационный красный (PR 166)', en: 'Azo Condensation Red (PR 166)', de: 'Azo-Kondensationsrot (PR 166)' } },
  { id: 'pr_168_anthraquinone_scarlet', name: { uk: 'Антрахіноновий алий (PR 168)', ru: 'Антрахиноновый алый (PR 168)', en: 'Anthraquinone Scarlet (PR 168)', de: 'Anthrachinonscharlach (PR 168)' } },
  { id: 'pr_170_1_napthol_red_deep', name: { uk: 'Нафтол червоний глибокий (PR 170)', ru: 'Нафтол красный глубокий (PR 170)', en: 'Naphthol Red Deep (PR 170)', de: 'Naphtholrot Dunkel (PR 170)' } },
  { id: 'pr_172_erythrosin_b', name: { uk: 'Еритрозин B (PR 172)', ru: 'Эритрозин B (PR 172)', en: 'Erythrosin B (PR 172)', de: 'Erythrosin B (PR 172)' } },
  { id: 'pr_173_rhodamine_b', name: { uk: 'Родамін B (PR 173)', ru: 'Родамин B (PR 173)', en: 'Rhodamine B (PR 173)', de: 'Rhodamin B (PR 173)' } },
  { id: 'pr_175_benzimidazolone_red_hft', name: { uk: 'Бензимідазолон червоний HFT (PR 175)', ru: 'Бензимидазолон красный HFT (PR 175)', en: 'Benzimidazolone Red HFT (PR 175)', de: 'Benzimidazolonrot HFT (PR 175)' } },
  { id: 'pr_176_benzimidazolone_carmine', name: { uk: 'Бензимідазолон кармін (PR 176)', ru: 'Бензимидазолон кармин (PR 176)', en: 'Benzimidazolone Carmine (PR 176)', de: 'Benzimidazolonkarmin (PR 176)' } },
  { id: 'pr_177_anthraquinone_red', name: { uk: 'Антрахіноновий червоний (PR 177)', ru: 'Антрахиноновый красный (PR 177)', en: 'Anthraquinone Red (PR 177)', de: 'Anthrachinonrot (PR 177)' } },
  { id: 'pr_179_perylene_maroon', name: { uk: 'Перилен бордовий (PR 179)', ru: 'Перилен бордовый (PR 179)', en: 'Perylene Maroon (PR 179)', de: 'Perylenkardinal (PR 179)' } },
  { id: 'pr_206_quinacridone_burnt_scarlet', name: { uk: 'Хінакрідон палений алий (PR 206)', ru: 'Хинакридон жжёный алый (PR 206)', en: 'Quinacridone Burnt Scarlet (PR 206)', de: 'Chinacridon Gebranntes Scharlach (PR 206)' } },
  { id: 'pr_254_pyrrole_red', name: { uk: 'Піррол червоний (PR 254)', ru: 'Пиррол красный (PR 254)', en: 'Pyrrole Red (PR 254)', de: 'Pyrrolrot (PR 254)' } },
  { id: 'pr_255_pyrrole_scarlet', name: { uk: 'Піррол алий (PR 255)', ru: 'Пиррол алый (PR 255)', en: 'Pyrrole Scarlet (PR 255)', de: 'Pyrrolscharlach (PR 255)' } },
  { id: 'pr_259_ultramarine_pink', name: { uk: 'Ультрамарин рожевий (PR 259)', ru: 'Ультрамарин розовый (PR 259)', en: 'Ultramarine Pink (PR 259)', de: 'Ultramarinrosa (PR 259)' } },
  { id: 'pr_264_pyrrole_red_rubine', name: { uk: 'Піррол червоний рубіновий (PR 264)', ru: 'Пиррол красный рубиновый (PR 264)', en: 'Pyrrole Red Rubine (PR 264)', de: 'Pyrrolrot Rubin (PR 264)' } },
  { id: 'pr_265_cerium_sulfide_red', name: { uk: 'Сульфід церію червоний (PR 265)', ru: 'Сульфид церия красный (PR 265)', en: 'Cerium Sulfide Red (PR 265)', de: 'Cersulfidrot (PR 265)' } },
  { id: 'pr_274_ponceau_4r', name: { uk: 'Понсо 4R (PR 274)', ru: 'Понсо 4R (PR 274)', en: 'Ponceau 4R (PR 274)', de: 'Ponceau 4R (PR 274)' } },
  { id: 'basic_red_9_fuchsine', name: { uk: 'Основний червоний 9 (Фуксин)', ru: 'Основной красный 9 (Фуксин)', en: 'Basic Red 9 (Fuchsine)', de: 'Basic Red 9 (Fuchsin)' } },

  // Фіолетові
  { id: 'pv_3_gentian_violet', name: { uk: 'Генціановий фіолетовий (PV 3)', ru: 'Генциановый фиолетовый (PV 3)', en: 'Gentian Violet (PV 3)', de: 'Enzianviolett (PV 3)' } },
  { id: 'pv_15_ultramarine_violet', name: { uk: 'Ультрамарин фіолетовий (PV 15)', ru: 'Ультрамарин фиолетовый (PV 15)', en: 'Ultramarine Violet (PV 15)', de: 'Ultramarinviolett (PV 15)' } },
  { id: 'pv_19_quinacridone_violet', name: { uk: 'Хінакрідон фіолетовий (PV 19)', ru: 'Хинакридон фиолетовый (PV 19)', en: 'Quinacridone Violet (PV 19)', de: 'Chinacridonviolett (PV 19)' } },
  { id: 'pv_23_dioxazine_purple', name: { uk: 'Діоксазиновий пурпур (PV 23)', ru: 'Диоксазиновый пурпур (PV 23)', en: 'Dioxazine Purple (PV 23)', de: 'Dioxazinpurpur (PV 23)' } },
  { id: 'pv_37_dioxazine_violet', name: { uk: 'Діоксазиновий фіолетовий (PV 37)', ru: 'Диоксазиновый фиолетовый (PV 37)', en: 'Dioxazine Violet (PV 37)', de: 'Dioxazinviolett (PV 37)' } },
  { id: 'pv_55_quinacridone_purple', name: { uk: 'Хінакрідон пурпурний (PV 55)', ru: 'Хинакридон пурпурный (PV 55)', en: 'Quinacridone Purple (PV 55)', de: 'Chinacridonpurpur (PV 55)' } },

  // Сині
  { id: 'pb_24_erioglaucine', name: { uk: 'Еріоглауцин (PB 24)', ru: 'Эриоглауцин (PB 24)', en: 'Erioglaucine (PB 24)', de: 'Erioglaucin (PB 24)' } },
  { id: 'pb_33_manganese_blue', name: { uk: 'Марганцевий синій (PB 33)', ru: 'Марганцевый синий (PB 33)', en: 'Manganese Blue (PB 33)', de: 'Manganblau (PB 33)' } },
  { id: 'pb_66_synthetic_indigo', name: { uk: 'Синтетичний індиго (PB 66)', ru: 'Синтетический индиго (PB 66)', en: 'Synthetic Indigo (PB 66)', de: 'Synthetischer Indigo (PB 66)' } },

  // Зелені
  { id: 'pg_12_naphthol_green', name: { uk: 'Нафтол зелений (PG 12)', ru: 'Нафтол зелёный (PG 12)', en: 'Naphthol Green (PG 12)', de: 'Naphtholgrün (PG 12)' } },
  { id: 'pg_36_phthalo_green_ys', name: { uk: 'Фталоціанін зелений YS (PG 36)', ru: 'Фталоцианин зелёный YS (PG 36)', en: 'Phthalo Green YS (PG 36)', de: 'Phthalogrün YS (PG 36)' } },
  { id: 'pg_51_victoria_green', name: { uk: 'Вікторія зелена (PG 51)', ru: 'Виктория зелёная (PG 51)', en: 'Victoria Green (PG 51)', de: 'Viktoriagrün (PG 51)' } },

  // Коричневі
  { id: 'pbr_23_disazo_brown', name: { uk: 'Дісазо коричневий (PBr 23)', ru: 'Дисазо коричневый (PBr 23)', en: 'Disazo Brown (PBr 23)', de: 'Disazobraun (PBr 23)' } },
  { id: 'pbr_24_chrome_titanate', name: { uk: 'Хром-титанат (PBr 24)', ru: 'Хром-титанат (PBr 24)', en: 'Chrome Titanate (PBr 24)', de: 'Chromtitanat (PBr 24)' } },
  { id: 'pbr_25_benzimidazolone_brown', name: { uk: 'Бензимідазолон коричневий (PBr 25)', ru: 'Бензимидазолон коричневый (PBr 25)', en: 'Benzimidazolone Brown (PBr 25)', de: 'Benzimidazolonbraun (PBr 25)' } },
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
