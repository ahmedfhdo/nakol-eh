// Egyptian Arabic (عامية مصرية). Written to sound like an Egyptian app, not a
// word-for-word translation: "هناكل إيه النهارده؟" instead of "ما هو العشاء؟",
// "بالهنا والشفا" instead of "استمتع بوجبتك".
import type { BackupError } from '../backup';
import type { DishError } from '../dishes';
import type { Messages } from './en';

/**
 * Arabic has six plural forms, and Egyptian speech uses them:
 * 1 → "أكلة واحدة", 2 → "أكلتين", 3–10 → "٣ أكلات", 11–99 → "١١ أكلة", 100+ → "١٠٠ أكلة".
 * Intl.PluralRules('ar') gives: zero, one, two, few (3–10), many (11–99), other (100+…).
 */
const rules = new Intl.PluralRules('ar');
type Forms = { zero?: string; one: string; two: string; few: string; many: string; other?: string };
const plural = (n: number, f: Forms): string => {
  const cat = rules.select(n) as keyof Forms;
  return (f[cat] ?? f.many).replace('#', String(n));
};

const dishes = (n: number) =>
  plural(n, { zero: 'ولا أكلة', one: 'أكلة واحدة', two: 'أكلتين', few: '# أكلات', many: '# أكلة' });
const days = (n: number) => plural(n, { zero: '0 يوم', one: 'يوم واحد', two: 'يومين', few: '# أيام', many: '# يوم' });

// Wrap user text (dish names, file names) in Unicode "first strong isolate" marks,
// so a Latin name like "Gulasch" inside an Arabic sentence doesn't scramble the
// word order around it (bidi isolation — the plain-text equivalent of <bdi>).
const iso = (s: string) => `⁨${s}⁩`;
const q = (s: string) => `«${iso(s)}»`;

export const ar: Messages = {
  // Western digits (1, 2, 3), as on most Egyptian phones: "-u-nu-latn".
  intl: 'ar-EG-u-nu-latn',
  dir: 'rtl',
  languageName: 'العربي (مصري)',

  appTitle: 'ناكل ايه',

  nav: {
    label: 'التنقل',
    picker: 'اختار',
    dishes: 'الأكلات',
    settings: 'الإعدادات',
  },

  categories: {
    beef: 'لحمة',
    chicken: 'فراخ',
    fish: 'سمك',
    vegetarian: 'نباتي',
  },

  cooked: (d) =>
    d === null
      ? 'لسه ما اتعملتش'
      : d === 0
        ? 'اتعملت النهارده'
        : d === 1
          ? 'اتعملت امبارح'
          : `اتعملت من ${days(d)}`,

  picker: {
    title: 'هناكل إيه النهارده؟',
    question: 'عندك إيه في البيت؟',
    chipsLabel: 'الأنواع اللي عندك في البيت',
    anyCategory: 'ما اخترتش حاجة — أي نوع ينفع.',
    anyOf: (labels) => `أي أكلة فيها ${new Intl.ListFormat('ar', { type: 'disjunction' }).format(labels)}`,
    pick: 'اختارلي',
    cook: 'هعملها',
    another: 'غيرها',
    special: 'أكلة النهارده',
    enjoy: '✓ بالهنا والشفا!',
    fallbackNote: 'كل الأكلات دي اتعملت قريب — دي اللي بقالها أطول وقت.',
    noDishesAtAll: 'لسه ما عندكش أكلات.',
    noDishesInCategories: 'مفيش أكلات من النوع ده لسه.',
    addDishesLink: 'ضيف أكلات ←',
    cookedSnack: (name) => `سجلنا إنك عملت ${q(name)}`,
    undo: 'تراجع',
  },

  dishes: {
    title: 'الأكلات',
    add: '+ أكلة جديدة',
    search: 'دوّر على أكلة…',
    filterLabel: 'فلتر بالنوع',
    loading: 'لحظة…',
    count: (n) => dishes(n),
    // "7 من 35 أكلة": the noun agrees with the total.
    countFiltered: (shown, total) =>
      `${shown} من ${plural(total, { zero: '0 أكلة', one: '1 أكلة', two: 'أكلتين', few: '# أكلات', many: '# أكلة' })}`,
    empty: 'لسه ما عندكش أكلات.',
    addFirst: 'ضيف أول أكلة',
    noMatch: 'مفيش أكلات كده. جرّب كلمة تانية أو نوع تاني.',
  },

  editor: {
    addTitle: 'أكلة جديدة',
    editTitle: 'تعديل الأكلة',
    name: 'الاسم',
    categories: 'فيها إيه؟',
    categoriesLabel: 'أنواع الأكلة',
    clearCooked: 'امسح التاريخ',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'مسح',
    confirmDelete: (name) => `تمسح ${q(name)}؟ مش هتعرف ترجّعها تاني.`,
    saveFailed: 'ما عرفناش نحفظ. جرّب تاني.',
    error: (e: DishError) => {
      switch (e.code) {
        case 'nameRequired':
          return 'اكتب اسم الأكلة.';
        case 'nameTooLong':
          return `الاسم طويل أوي (أقصى حاجة ${e.max} حرف).`;
        case 'categoryRequired':
          return 'اختار نوع واحد على الأقل.';
        case 'duplicate':
          return `${q(e.name)} موجودة عندك أصلًا.`;
      }
    },
  },

  settings: {
    title: 'الإعدادات',

    languageTitle: 'اللغة',

    cooldownTitle: 'فترة الراحة',
    cooldownHelp: 'لما تعمل أكلة، مش هنقترحها عليك تاني غير بعد العدد ده من الأيام.',
    cooldownInput: 'فترة الراحة بالأيام',
    fewer: 'أيام أقل',
    more: 'أيام أكتر',
    // After a number: "3 أيام", "14 يوم".
    daysUnit: (n) => (rules.select(n) === 'few' ? 'أيام' : 'يوم'),
    cooldownInvalid: (max) => `اكتب رقم صحيح من 0 لـ ${max}.`,
    cooldownOff: 'صفر يعني مفيش راحة — أي أكلة ممكن تطلع في أي وقت.',
    inCooldown: (n) =>
      n === 0 ? 'مفيش ولا أكلة في فترة الراحة دلوقتي.' : `${dishes(n)} في فترة الراحة دلوقتي.`,

    backupTitle: 'نسخة احتياطية',
    backupHelp: 'أكلاتك متخزنة على المتصفح ده بس. لو مسحت بيانات المتصفح هتضيع — اعمل نسخة احتياطية كل شوية.',
    export: 'احفظ في ملف',
    import: 'رجّع من ملف…',
    exported: (n) => `اتحفظت ${dishes(n)}`,
    imported: (n) => `رجعت ${dishes(n)}`,
    importFailed: (file, reason) => `ما عرفناش نرجّع ${q(file)}: ${reason}`,
    persisted: '✓ المتصفح مش هيمسح البيانات دي من نفسه.',
    notPersisted: 'المتصفح ممكن يمسح البيانات دي لو المساحة قلّت.',
    askPersist: 'اطلب منه يحتفظ بيها',
    persistDeclined: 'المتصفح رفض — تثبيت التطبيق غالبًا بيحل المشكلة',

    importTitle: 'نستبدل كل البيانات؟',
    importConfirm: 'استبدل',
    importBody: (n, file, date) => `هنرجّع ${dishes(n)} من ${q(file)}${date ? ` (اتحفظ يوم ${iso(date)})` : ''}.`,
    importReplaces: (current, cooldown) =>
      `ده هيشيل أكلاتك الحالية (${dishes(current)}) ويخلي فترة الراحة ${days(cooldown)}. مش هتعرف ترجع في الخطوة دي.`,
    importSkipped: (names) =>
      `${dishes(names.length)} من نسخة قديمة فيها خنزير بس، ومش هتترجع: ${names.map(iso).join('، ')}.`,

    appTitle: 'التطبيق',
    installed: '✓ متثبت. بيشتغل من غير نت — وأكلاتك عمرها ما بتخرج من الجهاز ده.',
    installHelp: 'ثبّت التطبيق عشان تفتحه من الشاشة الرئيسية، بشاشة كاملة ومن غير نت.',
    install: 'ثبّت التطبيق',
    iosInstall: 'عشان تثبته على الآيفون أو الآيباد: افتح الصفحة دي في Safari، دوس على «مشاركة»، وبعدين «إضافة إلى الشاشة الرئيسية».',
    otherInstall: 'بيشتغل من غير نت بعد أول مرة. عشان تثبته، افتح قايمة المتصفح واختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».',

    resetTitle: 'البداية من الأول',
    resetHelp: (n) => `رجّع قايمة الأكلات الأصلية (${dishes(n)}). فترة الراحة هتفضل زي ما هي.`,
    reset: 'رجّع الأكلات الأصلية…',
    resetConfirmTitle: 'نرجّع الأكلات الأصلية؟',
    resetConfirm: 'رجّع',
    resetBody: (current, defaults) =>
      `أكلاتك الحالية (${dishes(current)})، باللي ضفته وتواريخ الطبخ، هتتبدل بالـ ${dishes(defaults)} الأصلية. مش هتعرف ترجع في الخطوة دي.`,
    resetTip: 'نصيحة: اعمل نسخة احتياطية الأول.',
    restored: 'رجعت الأكلات الأصلية',
    cancel: 'إلغاء',

    backupError: (e: BackupError) => {
      switch (e.code) {
        case 'invalidJson':
          return 'الملف ده مش JSON سليم.';
        case 'notOurFile':
          return 'الملف ده مش نسخة من «ناكل ايه».';
        case 'newerVersion':
          return 'الملف ده من نسخة أحدث من التطبيق.';
        case 'noDishList':
          return 'مفيش قايمة أكلات في الملف.';
        case 'badCooldown':
          return `فترة الراحة لازم تكون رقم صحيح من 0 لـ ${e.max}.`;
        case 'dishInvalid':
          return `الأكلة رقم ${e.index} مش سليمة.`;
        case 'nameMissing':
          return `الأكلة رقم ${e.index} من غير اسم.`;
        case 'nameTooLong':
          return `اسم الأكلة رقم ${e.index} طويل أوي.`;
        case 'duplicateName':
          return `${q(e.name)} متكررة.`;
        case 'noCategories':
          return `${q(e.name)} مالهاش نوع.`;
        case 'unknownCategory':
          return `${q(e.name)} نوعها مش معروف: ${q(e.value)}.`;
        case 'badCookedDate':
          return `${q(e.name)} تاريخ طبخها غلط.`;
      }
    },
  },

  pwa: {
    install: 'ثبّت',
    updateAvailable: 'فيه نسخة جديدة.',
    reload: 'حدّث',
    offlineReady: 'جاهز يشتغل من غير نت.',
  },
};
