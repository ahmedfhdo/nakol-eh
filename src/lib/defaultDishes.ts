import type { Locale } from './locale';
import type { Category } from './types';

export interface DefaultDish {
  name: string;
  categories: Category[];
}

// Seed data. Used on first launch and by "Restore default dishes",
// One list for both languages for now (the English list was removed;
// it's in git history if we want it back).

const AR: DefaultDish[] = [
  { name: 'محشي كرنب', categories: ['beef', 'vegetarian'] },
  { name: 'محشي بتنجان', categories: ['beef', 'vegetarian'] },
  { name: 'محشي ورق عنب', categories: ['beef', 'vegetarian'] },
  { name: 'كبسة', categories: ['beef', 'chicken'] },
  { name: 'رز اصفر', categories: ['chicken'] },
  { name: 'ملوخية', categories: ['beef', 'chicken'] },
  { name: 'بامية', categories: ['beef', 'vegetarian'] },
  { name: 'بسلة', categories: ['beef', 'vegetarian'] },
  { name: 'لوبيا', categories: ['beef', 'vegetarian'] },
  { name: 'سبانخ', categories: ['beef', 'vegetarian'] },
  { name: 'كوسة', categories: ['beef', 'vegetarian'] },
  { name: 'فاصوليا بيضا', categories: ['beef', 'vegetarian'] },
  { name: 'فاصوليا خضرا', categories: ['beef', 'vegetarian'] },
  { name: 'كشك', categories: ['chicken'] },
  { name: 'فتة', categories: ['beef'] },
  { name: 'رز معمر وبطاطس', categories: ['chicken'] },
  { name: 'مكرونة بشاميل', categories: ['beef'] },
  { name: 'مكرونة وبانيه', categories: ['chicken'] },
  { name: 'كبدة اسكندراني', categories: ['beef'] },
  { name: 'سجق', categories: ['beef'] },
  { name: 'صيني', categories: ['chicken'] },
  { name: 'طاجن جمبري بالسبيط', categories: ['fish'] },
  { name: 'جمبري مقلي', categories: ['fish'] },
  { name: 'جمبري مشوي', categories: ['fish'] },
  { name: 'بلطي مقلي', categories: ['fish'] },
  { name: 'بلطي مشوي', categories: ['fish'] },
  { name: 'سنجاري', categories: ['fish'] },
  { name: 'رنجة', categories: ['fish'] },
  { name: 'لحمة بالبصل', categories: ['beef'] },
  { name: 'بفتيك', categories: ['beef'] },
  { name: 'كفتة', categories: ['beef'] },
  { name: 'كرات اللحمة بيضة', categories: ['beef'] },
  { name: 'كرات اللحمة حمرة', categories: ['beef'] },
  { name: 'جلاش', categories: ['beef'] },
  { name: 'كفتة بالرز', categories: ['beef'] },
  { name: 'كبد واوانص', categories: ['chicken'] },
  { name: 'فراخ مشوية', categories: ['chicken'] },
  { name: 'كشري', categories: ['vegetarian'] },
  { name: 'مسقعة', categories: ['beef', 'vegetarian'] },
  { name: 'عجة', categories: ['vegetarian'] },
  { name: 'بطاطس بالبيض', categories: ['vegetarian'] },
  { name: 'عدس', categories: ['vegetarian'] },
  { name: 'نجرسكو', categories: ['chicken'] },
  { name: 'شاورما', categories: ['beef', 'chicken'] },
  { name: 'بطاطس محشية لحمة مفرومة', categories: ['beef'] },
  { name: 'حواوشي', categories: ['beef'] },
  { name: 'كشري عدس اصفر', categories: ['vegetarian'] },
  { name: 'ستريبس', categories: ['chicken'] },
];

export const DEFAULT_DISHES: Record<Locale, DefaultDish[]> = { en: AR, ar: AR };
