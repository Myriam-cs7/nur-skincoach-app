import { useEffect, useState } from 'react';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'fr' | 'en' | 'ar';
const LANG_KEY = 'nur.lang';

type Dict = Record<string, string>;

const FR: Dict = {
  'welcome.kicker': '© NŪR PROTOCOL · AT-HOME CLINIC',
  'welcome.title': 'At-Home Clinic',
  'welcome.subtitle': 'Votre espace beauté privatisé.\nBilan IA et rituel LED sur-mesure.',
  'welcome.cta': 'Scanner mon QR code',
  'welcome.link': "Entrer un code d'activation",
  'welcome.footnote': "RÉSERVÉ AUX DÉTENTEURS D'UN APPAREIL NŪR",
  'welcome.privacy': 'Vos données restent confidentielles et chiffrées. Nous ne partageons rien.',

  'common.continue': 'Continuer',
  'common.back': 'Retour',
  'common.skip': 'Passer',
  'common.cancel': 'Annuler',
  'common.saving': 'Enregistrement…',
  'common.loading': 'Chargement…',
  'common.error': 'Erreur',
  'common.optional': 'Optionnel',
  'common.minutes': 'min',
  'common.intensity': 'Intensité',

  'onb.next': 'Continuer',
  'onb.finalize': 'Lancer mon bilan',
  'onb.name.title': 'Comment vous appelez-vous ?',
  'onb.name.sub': 'Optionnel — pour personnaliser votre expérience',
  'onb.name.placeholder': 'Votre prénom',
  'onb.age.title': 'Quel est votre âge ?',
  'onb.gender.title': 'Vous êtes…',
  'onb.skin.title': 'Quel est votre type de peau ?',
  'onb.climate.title': 'Votre climat habituel',
  'onb.climate.sub': 'Pour adapter le rituel à votre environnement',
  'onb.sun.title': 'Exposition au soleil',
  'onb.lifestyle.title': 'Mode de vie',
  'onb.sleep.title': 'Heures de sommeil',
  'onb.stress.title': 'Niveau de stress',
  'onb.water.title': 'Hydratation quotidienne',
  'onb.concerns.title': 'Vos préoccupations beauté',
  'onb.concerns.sub': "Sélectionnez tout ce qui s'applique",

  'scan.kicker': 'BILAN BEAUTÉ',
  'scan.title': 'Capture optionnelle',
  'scan.sub': 'Une photo de votre visage améliore la précision de votre bilan, mais reste totalement optionnelle.',
  'scan.tip1': 'Lumière naturelle de face',
  'scan.tip2': 'Sans maquillage, visage propre',
  'scan.gallery': 'Choisir depuis la galerie',
  'scan.skip': 'Continuer sans photo',
  'scan.perm.title': 'Caméra optionnelle',
  'scan.perm.sub': 'Vous pouvez activer la caméra pour un bilan plus précis, ou continuer avec le questionnaire seul.',
  'scan.perm.allow': 'Autoriser la caméra',

  'analyzing.kicker': 'NŪR · IA BEAUTÉ',
  'analyzing.title': 'Bilan en cours',
  'analyzing.s1': 'Lecture du grain de peau…',
  'analyzing.s2': 'Repérage des zones à sublimer…',
  'analyzing.s3': "Évaluation de l'éclat et du teint…",
  'analyzing.s4': 'Conception de votre rituel LED sur-mesure…',

  'diag.kicker': 'VOTRE BILAN BEAUTÉ',
  'diag.title': 'Votre profil beauté',
  'diag.concerns': 'Axes prioritaires',
  'diag.scores': 'Indicateurs beauté',
  'diag.protocol': 'Rituel LED hebdomadaire',
  'diag.routine': 'Conseils rituel',
  'diag.lifestyle': 'Bien-être au quotidien',
  'diag.cta': 'Démarrer mon rituel',
  'diag.expected': 'Résultats attendus en {weeks} semaines',

  'tab.today': "AUJOURD'HUI",
  'tab.protocol': 'RITUEL',
  'tab.library': 'LUMIÈRES',
  'tab.profile': 'PROFIL',

  'home.kicker': 'AT-HOME CLINIC',
  'home.greet.morning': 'Bonjour',
  'home.greet.afternoon': 'Bon après-midi',
  'home.greet.evening': 'Bonsoir',
  'home.today.kicker': 'SÉANCE DU JOUR',
  'home.start': 'Démarrer la séance',
  'home.done': 'Séance complétée',
  'home.rest.title': 'Journée de pause',
  'home.rest.sub': 'Profitez d\'une pause beauté aujourd\'hui.',
  'home.stat.streak': 'Streak',
  'home.stat.sessions': 'Séances',
  'home.stat.week': 'Semaine',
  'home.reminders.title': 'Rappels quotidiens',
  'home.reminders.sub': 'Notification à 20h00 chaque jour',
  'home.profile.title': 'Votre bilan',

  'proto.title': 'Rituel hebdomadaire',
  'proto.sub': 'Programme beauté sur {weeks} semaines, adapté à votre profil.',
  'proto.rest': 'Pause',
  'proto.restSub': 'Journée sans séance',
  'proto.expected': 'Résultats attendus',
  'proto.weeks': 'Sur {weeks} semaines',

  'lib.title': '6 Lumières LED',
  'lib.sub': 'Chaque couleur cible un besoin spécifique de votre peau.',
  'lib.benefits': 'Bénéfices',
  'lib.indications': 'Indications',
  'lib.per_session': '{min} min par séance',

  'profile.title': 'Mon Skincoach',
  'profile.code': 'Code',
  'profile.profile': 'Votre profil',
  'profile.concerns': 'Préoccupations',
  'profile.actions': 'Actions',
  'profile.redo': 'Refaire mon bilan beauté',
  'profile.reset': 'Réinitialiser mon compte',
  'profile.language': 'Langue',
  'profile.privacy': 'Confidentialité',
  'profile.privacy.body': 'Toutes vos données sont chiffrées et stockées de manière sécurisée. Aucune photo ni information personnelle n\'est partagée avec des tiers. Vous pouvez supprimer votre compte à tout moment.',

  'days.mon': 'Lun', 'days.tue': 'Mar', 'days.wed': 'Mer', 'days.thu': 'Jeu', 'days.fri': 'Ven', 'days.sat': 'Sam', 'days.sun': 'Dim',
  'days.full.mon': 'Lundi', 'days.full.tue': 'Mardi', 'days.full.wed': 'Mercredi', 'days.full.thu': 'Jeudi', 'days.full.fri': 'Vendredi', 'days.full.sat': 'Samedi', 'days.full.sun': 'Dimanche',
};

const EN: Dict = {
  'welcome.kicker': '© NŪR PROTOCOL · AT-HOME CLINIC',
  'welcome.title': 'At-Home Clinic',
  'welcome.subtitle': 'Your private beauty space.\nAI assessment and bespoke LED ritual.',
  'welcome.cta': 'Scan my QR code',
  'welcome.link': 'Enter an activation code',
  'welcome.footnote': 'EXCLUSIVE TO NŪR DEVICE OWNERS',
  'welcome.privacy': 'Your data stays private and encrypted. We never share it.',

  'common.continue': 'Continue',
  'common.back': 'Back',
  'common.skip': 'Skip',
  'common.cancel': 'Cancel',
  'common.saving': 'Saving…',
  'common.loading': 'Loading…',
  'common.error': 'Error',
  'common.optional': 'Optional',
  'common.minutes': 'min',
  'common.intensity': 'Intensity',

  'onb.next': 'Continue',
  'onb.finalize': 'Start my assessment',
  'onb.name.title': "What's your name?",
  'onb.name.sub': 'Optional — to personalise your experience',
  'onb.name.placeholder': 'Your first name',
  'onb.age.title': 'How old are you?',
  'onb.gender.title': 'You are…',
  'onb.skin.title': 'Your skin type?',
  'onb.climate.title': 'Your usual climate',
  'onb.climate.sub': 'To tailor the ritual to your environment',
  'onb.sun.title': 'Sun exposure',
  'onb.lifestyle.title': 'Lifestyle',
  'onb.sleep.title': 'Hours of sleep',
  'onb.stress.title': 'Stress level',
  'onb.water.title': 'Daily hydration',
  'onb.concerns.title': 'Your beauty concerns',
  'onb.concerns.sub': 'Select all that apply',

  'scan.kicker': 'BEAUTY ASSESSMENT',
  'scan.title': 'Optional capture',
  'scan.sub': 'A face photo improves your assessment accuracy, but it remains entirely optional.',
  'scan.tip1': 'Natural light, facing front',
  'scan.tip2': 'No makeup, clean face',
  'scan.gallery': 'Choose from gallery',
  'scan.skip': 'Continue without a photo',
  'scan.perm.title': 'Camera optional',
  'scan.perm.sub': 'Allow camera for a more accurate assessment, or continue with the questionnaire only.',
  'scan.perm.allow': 'Allow camera',

  'analyzing.kicker': 'NŪR · BEAUTY AI',
  'analyzing.title': 'Assessment in progress',
  'analyzing.s1': 'Reading skin texture…',
  'analyzing.s2': 'Locating areas to enhance…',
  'analyzing.s3': 'Evaluating glow and complexion…',
  'analyzing.s4': 'Designing your bespoke LED ritual…',

  'diag.kicker': 'YOUR BEAUTY ASSESSMENT',
  'diag.title': 'Your beauty profile',
  'diag.concerns': 'Priority focus',
  'diag.scores': 'Beauty indicators',
  'diag.protocol': 'Weekly LED ritual',
  'diag.routine': 'Ritual advice',
  'diag.lifestyle': 'Daily well-being',
  'diag.cta': 'Start my ritual',
  'diag.expected': 'Expected results in {weeks} weeks',

  'tab.today': 'TODAY',
  'tab.protocol': 'RITUAL',
  'tab.library': 'LIGHTS',
  'tab.profile': 'PROFILE',

  'home.kicker': 'AT-HOME CLINIC',
  'home.greet.morning': 'Good morning',
  'home.greet.afternoon': 'Good afternoon',
  'home.greet.evening': 'Good evening',
  'home.today.kicker': "TODAY'S SESSION",
  'home.start': 'Start session',
  'home.done': 'Session complete',
  'home.rest.title': 'Rest day',
  'home.rest.sub': 'Enjoy a beauty pause today.',
  'home.stat.streak': 'Streak',
  'home.stat.sessions': 'Sessions',
  'home.stat.week': 'Week',
  'home.reminders.title': 'Daily reminders',
  'home.reminders.sub': 'Notification at 8:00 PM every day',
  'home.profile.title': 'Your assessment',

  'proto.title': 'Weekly ritual',
  'proto.sub': '{weeks}-week beauty programme, tailored to your profile.',
  'proto.rest': 'Rest',
  'proto.restSub': 'No session today',
  'proto.expected': 'Expected results',
  'proto.weeks': 'Over {weeks} weeks',

  'lib.title': '6 LED lights',
  'lib.sub': 'Each colour targets a specific skin need.',
  'lib.benefits': 'Benefits',
  'lib.indications': 'Indications',
  'lib.per_session': '{min} min per session',

  'profile.title': 'My Skincoach',
  'profile.code': 'Code',
  'profile.profile': 'Your profile',
  'profile.concerns': 'Concerns',
  'profile.actions': 'Actions',
  'profile.redo': 'Redo my assessment',
  'profile.reset': 'Reset my account',
  'profile.language': 'Language',
  'profile.privacy': 'Privacy',
  'profile.privacy.body': 'All your data is encrypted and securely stored. No photo or personal information is shared with third parties. You can delete your account at any time.',

  'days.mon': 'Mon', 'days.tue': 'Tue', 'days.wed': 'Wed', 'days.thu': 'Thu', 'days.fri': 'Fri', 'days.sat': 'Sat', 'days.sun': 'Sun',
  'days.full.mon': 'Monday', 'days.full.tue': 'Tuesday', 'days.full.wed': 'Wednesday', 'days.full.thu': 'Thursday', 'days.full.fri': 'Friday', 'days.full.sat': 'Saturday', 'days.full.sun': 'Sunday',
};

const AR: Dict = {
  'welcome.kicker': '© نُور بروتوكول · عيادة منزلية',
  'welcome.title': 'عيادة منزلية',
  'welcome.subtitle': 'فضاؤكِ الخاص للجمال.\nتشخيص ذكي وروتين LED مخصص.',
  'welcome.cta': 'مسح رمز QR',
  'welcome.link': 'إدخال رمز التفعيل',
  'welcome.footnote': 'حصري لأصحاب جهاز نُور',
  'welcome.privacy': 'بياناتكِ خاصة ومشفّرة. لا نشاركها أبداً.',

  'common.continue': 'متابعة', 'common.back': 'رجوع', 'common.skip': 'تخطٍ', 'common.cancel': 'إلغاء',
  'common.saving': 'جارٍ الحفظ…', 'common.loading': 'تحميل…', 'common.error': 'خطأ',
  'common.optional': 'اختياري', 'common.minutes': 'د', 'common.intensity': 'الشدّة',

  'onb.next': 'متابعة', 'onb.finalize': 'بدء التشخيص',
  'onb.name.title': 'ما اسمكِ؟', 'onb.name.sub': 'اختياري — لتخصيص تجربتكِ', 'onb.name.placeholder': 'الاسم الأول',
  'onb.age.title': 'كم عمركِ؟', 'onb.gender.title': 'أنتِ…', 'onb.skin.title': 'ما نوع بشرتكِ؟',
  'onb.climate.title': 'مناخكِ المعتاد', 'onb.climate.sub': 'لتخصيص الروتين لبيئتكِ',
  'onb.sun.title': 'التعرض للشمس', 'onb.lifestyle.title': 'نمط الحياة',
  'onb.sleep.title': 'ساعات النوم', 'onb.stress.title': 'مستوى التوتر', 'onb.water.title': 'الترطيب اليومي',
  'onb.concerns.title': 'اهتماماتكِ الجمالية', 'onb.concerns.sub': 'حددي كل ما ينطبق',

  'scan.kicker': 'تقييم الجمال', 'scan.title': 'التقاط اختياري',
  'scan.sub': 'صورة وجهك تحسّن دقة التشخيص، لكنها تبقى اختيارية تماماً.',
  'scan.tip1': 'ضوء طبيعي من الأمام', 'scan.tip2': 'بدون مكياج، وجه نظيف',
  'scan.gallery': 'اختيار من المعرض', 'scan.skip': 'المتابعة بدون صورة',
  'scan.perm.title': 'كاميرا اختيارية',
  'scan.perm.sub': 'يمكنكِ تفعيل الكاميرا للحصول على تشخيص أدق، أو المتابعة بالاستبيان فقط.',
  'scan.perm.allow': 'السماح بالكاميرا',

  'analyzing.kicker': 'نُور · ذكاء الجمال', 'analyzing.title': 'جاري التشخيص',
  'analyzing.s1': 'قراءة ملمس البشرة…', 'analyzing.s2': 'تحديد المناطق المراد تحسينها…',
  'analyzing.s3': 'تقييم الإشراق ولون البشرة…', 'analyzing.s4': 'تصميم روتين LED مخصص لكِ…',

  'diag.kicker': 'تقييمكِ الجمالي', 'diag.title': 'ملفكِ الجمالي',
  'diag.concerns': 'الأولويات', 'diag.scores': 'مؤشرات الجمال',
  'diag.protocol': 'روتين LED الأسبوعي', 'diag.routine': 'نصائح الروتين',
  'diag.lifestyle': 'الرفاهية اليومية', 'diag.cta': 'بدء روتيني',
  'diag.expected': 'النتائج المتوقعة خلال {weeks} أسابيع',

  'tab.today': 'اليوم', 'tab.protocol': 'الروتين', 'tab.library': 'الأضواء', 'tab.profile': 'الملف',

  'home.kicker': 'عيادة منزلية', 'home.greet.morning': 'صباح الخير',
  'home.greet.afternoon': 'مساء الخير', 'home.greet.evening': 'مساء الخير',
  'home.today.kicker': 'جلسة اليوم', 'home.start': 'بدء الجلسة', 'home.done': 'الجلسة مكتملة',
  'home.rest.title': 'يوم راحة', 'home.rest.sub': 'استمتعي بفترة راحة جمالية اليوم.',
  'home.stat.streak': 'تتابع', 'home.stat.sessions': 'جلسات', 'home.stat.week': 'الأسبوع',
  'home.reminders.title': 'تذكيرات يومية', 'home.reminders.sub': 'إشعار يومي الساعة 8 مساءً',
  'home.profile.title': 'تشخيصكِ',

  'proto.title': 'الروتين الأسبوعي', 'proto.sub': 'برنامج جمالي لمدة {weeks} أسابيع مصمم لملفكِ.',
  'proto.rest': 'راحة', 'proto.restSub': 'لا جلسة اليوم',
  'proto.expected': 'النتائج المتوقعة', 'proto.weeks': 'خلال {weeks} أسابيع',

  'lib.title': '6 أضواء LED', 'lib.sub': 'كل لون يستهدف حاجة محددة لبشرتكِ.',
  'lib.benefits': 'الفوائد', 'lib.indications': 'الاستخدامات', 'lib.per_session': '{min} د لكل جلسة',

  'profile.title': 'مدربتي', 'profile.code': 'الرمز',
  'profile.profile': 'ملفكِ', 'profile.concerns': 'الاهتمامات', 'profile.actions': 'إجراءات',
  'profile.redo': 'إعادة التشخيص', 'profile.reset': 'إعادة تعيين الحساب',
  'profile.language': 'اللغة', 'profile.privacy': 'الخصوصية',
  'profile.privacy.body': 'جميع بياناتكِ مشفرة ومخزنة بأمان. لا تتم مشاركة أي صورة أو معلومات شخصية مع أطراف ثالثة. يمكنكِ حذف حسابكِ في أي وقت.',

  'days.mon': 'إث', 'days.tue': 'ثل', 'days.wed': 'أر', 'days.thu': 'خم', 'days.fri': 'جم', 'days.sat': 'سب', 'days.sun': 'أح',
  'days.full.mon': 'الإثنين', 'days.full.tue': 'الثلاثاء', 'days.full.wed': 'الأربعاء', 'days.full.thu': 'الخميس', 'days.full.fri': 'الجمعة', 'days.full.sat': 'السبت', 'days.full.sun': 'الأحد',
};

const DICTS: Record<Lang, Dict> = { fr: FR, en: EN, ar: AR };

let currentLang: Lang = 'fr';
const listeners = new Set<() => void>();

export const isRTL = () => currentLang === 'ar';

function detectLang(): Lang {
  const locales = Localization.getLocales();
  const code = (locales[0]?.languageCode || 'fr').toLowerCase();
  if (code === 'ar') return 'ar';
  if (code === 'en') return 'en';
  return 'fr';
}

export async function initLang() {
  try {
    const stored = (await AsyncStorage.getItem(LANG_KEY)) as Lang | null;
    currentLang = stored || detectLang();
  } catch {
    currentLang = detectLang();
  }
  listeners.forEach((l) => l());
}

export async function setLang(lang: Lang) {
  currentLang = lang;
  await AsyncStorage.setItem(LANG_KEY, lang);
  listeners.forEach((l) => l());
}

export function getLang(): Lang { return currentLang; }

export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[currentLang] || FR;
  let str = dict[key] ?? FR[key] ?? key;
  if (vars) Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, String(v)); });
  return str;
}

export function useT() {
  const [, setN] = useState(0);
  useEffect(() => {
    const fn = () => setN((n) => n + 1);
    listeners.add(fn);
    initLang();
    return () => { listeners.delete(fn); };
  }, []);
  return { t, lang: currentLang, setLang };
}

// Concern key → translation
export const CONCERN_LABELS: Record<Lang, Record<string, string>> = {
  fr: { acne: 'Acné', rides: 'Rides', taches: 'Taches', rougeurs: 'Rougeurs', pores: 'Pores dilatés', ternissement: 'Teint terne', sensibilite: 'Sensibilité', cicatrices: 'Cicatrices' },
  en: { acne: 'Acne', rides: 'Wrinkles', taches: 'Dark spots', rougeurs: 'Redness', pores: 'Enlarged pores', ternissement: 'Dull complexion', sensibilite: 'Sensitivity', cicatrices: 'Scars' },
  ar: { acne: 'حب الشباب', rides: 'تجاعيد', taches: 'بقع داكنة', rougeurs: 'احمرار', pores: 'مسام واسعة', ternissement: 'بشرة باهتة', sensibilite: 'حساسية', cicatrices: 'ندبات' },
};
