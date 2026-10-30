import { Lang, getLang } from './i18n';
import { theme } from './theme';

export type LedId = 'red' | 'blue' | 'green' | 'yellow' | 'cyan' | 'violet' | 'white';

export const LED_ORDER: LedId[] = ['red', 'blue', 'green', 'yellow', 'cyan', 'violet', 'white'];

export const LED_META: Record<LedId, { hex: string; minutes: number }> = {
  red: { hex: theme.color.ledRed, minutes: 15 },
  blue: { hex: theme.color.ledBlue, minutes: 12 },
  green: { hex: theme.color.ledGreen, minutes: 15 },
  yellow: { hex: theme.color.ledYellow, minutes: 12 },
  cyan: { hex: theme.color.ledCyan, minutes: 12 },
  violet: { hex: theme.color.ledViolet, minutes: 15 },
  white: { hex: theme.color.ledWhite, minutes: 15 },
};

/** The same light written as text — readable on a white background too. */
export function ledInk(id: LedId): string {
  const key = ('ledText' + id.charAt(0).toUpperCase() + id.slice(1)) as
    'ledTextRed' | 'ledTextBlue' | 'ledTextGreen' | 'ledTextYellow' | 'ledTextCyan' | 'ledTextViolet' | 'ledTextWhite';
  return theme.color[key];
}

/** Outline for a dot filled with the raw light: white and yellow would vanish on white.
 *  The strong colours get their own hue as rim, so the dot reads as pure light. */
export function ledRim(id: LedId): string {
  return id === 'white' || id === 'yellow' || id === 'cyan' ? ledInk(id) : LED_META[id].hex;
}

export type LedText = { name: string; wavelength: string; tagline: string; action: string; best_for: string[] };

/**
 * What to dial on the real remote for each light, plus how honest we are about
 * the evidence behind it. Nothing here is presented as a guarantee.
 */
export type Evidence = 'solid' | 'supported' | 'exploratory';

export const LED_PROTOCOL: Record<LedId, {  mode: string; brightness: number; minutes: number; perWeek: number; evidence: Evidence;
}> = {
  red: { mode: 'Wrinkle Reduction', brightness: 2, minutes: 20, perWeek: 4, evidence: 'solid' },
  blue: { mode: 'Oil Control', brightness: 2, minutes: 10, perWeek: 3, evidence: 'solid' },
  green: { mode: 'Skin Beautification', brightness: 2, minutes: 10, perWeek: 2, evidence: 'exploratory' },
  yellow: { mode: 'Skin Beautification', brightness: 1, minutes: 10, perWeek: 3, evidence: 'supported' },
  cyan: { mode: 'Cleansing', brightness: 1, minutes: 10, perWeek: 3, evidence: 'supported' },
  violet: { mode: 'Wrinkle Reduction', brightness: 2, minutes: 15, perWeek: 3, evidence: 'supported' },
  white: { mode: 'Skin Beautification', brightness: 2, minutes: 15, perWeek: 2, evidence: 'supported' },
};

const FR: Record<LedId, LedText> = {
  red: { name: 'Rouge', wavelength: '633 nm', tagline: 'Anti-âge', action: 'Collagène & élastine', best_for: ['Rides', 'Fermeté', 'Éclat'] },
  blue: { name: 'Bleue', wavelength: '415 nm', tagline: 'Pureté', action: 'Purifie les pores', best_for: ['Imperfections', 'Peau grasse', 'Pores'] },
  green: { name: 'Verte', wavelength: '532 nm', tagline: 'Teint uniforme', action: 'Apaise les rougeurs', best_for: ['Taches', 'Teint irrégulier', 'Rougeurs'] },
  yellow: { name: 'Jaune', wavelength: '590 nm', tagline: 'Éclat', action: 'Drainage lymphatique', best_for: ['Teint terne', 'Gonflements', 'Fatigue'] },
  cyan: { name: 'Cyan', wavelength: '490 nm', tagline: 'Peaux sensibles', action: 'Apaise et calme', best_for: ['Sensibilité', 'Inconfort', 'Couperose'] },
  violet: { name: 'Violette', wavelength: '415 + 633 nm', tagline: 'Rééquilibre', action: 'Imperfections et marques', best_for: ['Marques', 'Grain irrégulier', 'Imperfections'] },
  white: { name: 'Blanche', wavelength: 'Spectre complet', tagline: 'Régénération', action: 'Soin global en profondeur', best_for: ['Soin global', 'Prévention', 'Éclat'] },
};

const EN: Record<LedId, LedText> = {
  red: { name: 'Red', wavelength: '633 nm', tagline: 'Anti-ageing', action: 'Collagen & elastin', best_for: ['Wrinkles', 'Firmness', 'Radiance'] },
  blue: { name: 'Blue', wavelength: '415 nm', tagline: 'Purity', action: 'Purifies pores', best_for: ['Blemishes', 'Oily skin', 'Pores'] },
  green: { name: 'Green', wavelength: '532 nm', tagline: 'Even tone', action: 'Soothes redness', best_for: ['Dark spots', 'Uneven tone', 'Redness'] },
  yellow: { name: 'Yellow', wavelength: '590 nm', tagline: 'Radiance', action: 'Lymphatic drainage', best_for: ['Dull tone', 'Puffiness', 'Fatigue'] },
  cyan: { name: 'Cyan', wavelength: '490 nm', tagline: 'Sensitive skin', action: 'Soothes and calms', best_for: ['Sensitivity', 'Discomfort', 'Couperose'] },
  violet: { name: 'Violet', wavelength: '415 + 633 nm', tagline: 'Rebalance', action: 'Blemishes and marks', best_for: ['Marks', 'Uneven texture', 'Blemishes'] },
  white: { name: 'White', wavelength: 'Full spectrum', tagline: 'Regeneration', action: 'Deep all-over care', best_for: ['All-over care', 'Prevention', 'Radiance'] },
};

const ES: Record<LedId, LedText> = {
  red: { name: 'Rojo', wavelength: '633 nm', tagline: 'Antiedad', action: 'Colágeno y elastina', best_for: ['Arrugas', 'Firmeza', 'Luminosidad'] },
  blue: { name: 'Azul', wavelength: '415 nm', tagline: 'Pureza', action: 'Purifica los poros', best_for: ['Imperfecciones', 'Piel grasa', 'Poros'] },
  green: { name: 'Verde', wavelength: '532 nm', tagline: 'Tono uniforme', action: 'Calma las rojeces', best_for: ['Manchas', 'Tono irregular', 'Rojeces'] },
  yellow: { name: 'Amarillo', wavelength: '590 nm', tagline: 'Luminosidad', action: 'Drenaje linfático', best_for: ['Tez apagada', 'Hinchazón', 'Fatiga'] },
  cyan: { name: 'Cian', wavelength: '490 nm', tagline: 'Pieles sensibles', action: 'Calma y apacigua', best_for: ['Sensibilidad', 'Incomodidad', 'Cuperosis'] },
  violet: { name: 'Violeta', wavelength: '415 + 633 nm', tagline: 'Reequilibrio', action: 'Imperfecciones y marcas', best_for: ['Marcas', 'Textura irregular', 'Imperfecciones'] },
  white: { name: 'Blanco', wavelength: 'Espectro completo', tagline: 'Regeneración', action: 'Cuidado global en profundidad', best_for: ['Cuidado global', 'Prevención', 'Luminosidad'] },
};

const IT: Record<LedId, LedText> = {
  red: { name: 'Rosso', wavelength: '633 nm', tagline: 'Anti-età', action: 'Collagene ed elastina', best_for: ['Rughe', 'Tonicità', 'Luminosità'] },
  blue: { name: 'Blu', wavelength: '415 nm', tagline: 'Purezza', action: 'Purifica i pori', best_for: ['Imperfezioni', 'Pelle grassa', 'Pori'] },
  green: { name: 'Verde', wavelength: '532 nm', tagline: 'Tono uniforme', action: 'Lenisce i rossori', best_for: ['Macchie', 'Tono irregolare', 'Rossori'] },
  yellow: { name: 'Giallo', wavelength: '590 nm', tagline: 'Luminosità', action: 'Drenaggio linfatico', best_for: ['Colorito spento', 'Gonfiori', 'Stanchezza'] },
  cyan: { name: 'Ciano', wavelength: '490 nm', tagline: 'Pelli sensibili', action: 'Lenisce e calma', best_for: ['Sensibilità', 'Disagio', 'Couperose'] },
  violet: { name: 'Viola', wavelength: '415 + 633 nm', tagline: 'Riequilibrio', action: 'Imperfezioni e segni', best_for: ['Segni', 'Grana irregolare', 'Imperfezioni'] },
  white: { name: 'Bianco', wavelength: 'Spettro completo', tagline: 'Rigenerazione', action: 'Cura globale in profondità', best_for: ['Cura globale', 'Prevenzione', 'Luminosità'] },
};

const DE: Record<LedId, LedText> = {
  red: { name: 'Rot', wavelength: '633 nm', tagline: 'Anti-Aging', action: 'Kollagen & Elastin', best_for: ['Falten', 'Festigkeit', 'Strahlkraft'] },
  blue: { name: 'Blau', wavelength: '415 nm', tagline: 'Reinheit', action: 'Klärt die Poren', best_for: ['Unreinheiten', 'Fettige Haut', 'Poren'] },
  green: { name: 'Grün', wavelength: '532 nm', tagline: 'Ebenmäßiger Teint', action: 'Beruhigt Rötungen', best_for: ['Flecken', 'Unebener Teint', 'Rötungen'] },
  yellow: { name: 'Gelb', wavelength: '590 nm', tagline: 'Strahlkraft', action: 'Lymphdrainage', best_for: ['Fahler Teint', 'Schwellungen', 'Müdigkeit'] },
  cyan: { name: 'Cyan', wavelength: '490 nm', tagline: 'Empfindliche Haut', action: 'Beruhigt und besänftigt', best_for: ['Empfindlichkeit', 'Unbehagen', 'Couperose'] },
  violet: { name: 'Violett', wavelength: '415 + 633 nm', tagline: 'Rebalance', action: 'Unreinheiten und Male', best_for: ['Male', 'Unebenes Hautbild', 'Unreinheiten'] },
  white: { name: 'Weiß', wavelength: 'Volles Spektrum', tagline: 'Regeneration', action: 'Tiefenwirksame Rundumpflege', best_for: ['Rundumpflege', 'Vorbeugung', 'Strahlkraft'] },
};

const RU: Record<LedId, LedText> = {
  red: { name: 'Красный', wavelength: '633 нм', tagline: 'Антивозрастной', action: 'Коллаген и эластин', best_for: ['Морщины', 'Упругость', 'Сияние'] },
  blue: { name: 'Синий', wavelength: '415 нм', tagline: 'Чистота', action: 'Очищает поры', best_for: ['Несовершенства', 'Жирная кожа', 'Поры'] },
  green: { name: 'Зелёный', wavelength: '532 нм', tagline: 'Ровный тон', action: 'Успокаивает покраснения', best_for: ['Пятна', 'Неровный тон', 'Покраснения'] },
  yellow: { name: 'Жёлтый', wavelength: '590 нм', tagline: 'Сияние', action: 'Лимфодренаж', best_for: ['Тусклый тон', 'Отёчность', 'Усталость'] },
  cyan: { name: 'Голубой', wavelength: '490 нм', tagline: 'Чувствительная кожа', action: 'Успокаивает и смягчает', best_for: ['Чувствительность', 'Дискомфорт', 'Купероз'] },
  violet: { name: 'Фиолетовый', wavelength: '415 + 633 нм', tagline: 'Баланс', action: 'Несовершенства и следы', best_for: ['Следы', 'Неровный рельеф', 'Несовершенства'] },
  white: { name: 'Белый', wavelength: 'Полный спектр', tagline: 'Регенерация', action: 'Глубокий комплексный уход', best_for: ['Комплексный уход', 'Профилактика', 'Сияние'] },
};

const AR: Record<LedId, LedText> = {
  red: { name: 'الأحمر', wavelength: '633 نم', tagline: 'مكافحة التجاعيد', action: 'الكولاجين والإيلاستين', best_for: ['التجاعيد', 'الثبات', 'الإشراق'] },
  blue: { name: 'الأزرق', wavelength: '415 نم', tagline: 'النقاء', action: 'ينقّي المسام', best_for: ['العيوب', 'البشرة الدهنية', 'المسام'] },
  green: { name: 'الأخضر', wavelength: '532 نم', tagline: 'لون موحّد', action: 'يهدّئ الاحمرار', best_for: ['البقع', 'لون غير موحّد', 'الاحمرار'] },
  yellow: { name: 'الأصفر', wavelength: '590 نم', tagline: 'الإشراق', action: 'تصريف لمفاوي', best_for: ['بشرة باهتة', 'الانتفاخ', 'التعب'] },
  cyan: { name: 'السماوي', wavelength: '490 نم', tagline: 'البشرة الحساسة', action: 'يهدّئ ويلطّف', best_for: ['الحساسية', 'عدم الراحة', 'الشعيرات'] },
  violet: { name: 'البنفسجي', wavelength: '415 + 633 نم', tagline: 'إعادة التوازن', action: 'العيوب والآثار', best_for: ['الآثار', 'ملمس غير منتظم', 'العيوب'] },
  white: { name: 'الأبيض', wavelength: 'الطيف الكامل', tagline: 'التجديد', action: 'عناية شاملة وعميقة', best_for: ['عناية شاملة', 'الوقاية', 'الإشراق'] },
};

const LED_TEXTS: Record<Lang, Record<LedId, LedText>> = { fr: FR, en: EN, es: ES, it: IT, de: DE, ru: RU, ar: AR };

export function ledText(id: LedId, lang?: Lang): LedText {
  const l = lang || getLang();
  return (LED_TEXTS[l] || FR)[id] || FR[id];
}
