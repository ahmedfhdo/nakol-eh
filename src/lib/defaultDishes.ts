import type { Locale } from './locale';
import type { Category } from './types';

export interface DefaultDish {
  name: string;
  categories: Category[];
}

// Seed data. Used on first launch and by "Restore default dishes",
// picking the list for the language the app is in at that moment.

const EN: DefaultDish[] = [
  { name: 'Chicken Schnitzel', categories: ['chicken'] },
  { name: 'Rouladen', categories: ['beef'] },
  { name: 'Gulasch', categories: ['beef'] },
  { name: 'Frikadellen mit Kartoffelsalat', categories: ['beef'] },
  { name: 'Rindercurrywurst mit Pommes', categories: ['beef'] },
  { name: 'Sauerbraten', categories: ['beef'] },
  { name: 'Königsberger Klopse', categories: ['beef'] },
  { name: 'Chili con Carne', categories: ['beef', 'vegetarian'] },
  { name: 'Spaghetti Bolognese', categories: ['beef', 'vegetarian'] },
  { name: 'Lasagne', categories: ['beef', 'vegetarian'] },
  { name: 'Burger', categories: ['beef', 'chicken', 'vegetarian'] },
  { name: 'Tacos', categories: ['beef', 'chicken', 'vegetarian'] },
  { name: 'Pulled Beef Sandwich', categories: ['beef'] },
  { name: 'Chicken Stir-Fry with Rice', categories: ['chicken'] },
  { name: 'Hähnchen-Curry', categories: ['chicken', 'vegetarian'] },
  { name: 'Chicken Fajitas', categories: ['chicken'] },
  { name: 'Chicken Teriyaki with Rice', categories: ['chicken'] },
  { name: 'Roast Chicken with Vegetables', categories: ['chicken'] },
  { name: 'Chicken Caesar Salad', categories: ['chicken'] },
  { name: 'Paella', categories: ['chicken', 'fish'] },
  { name: 'Fish and Chips', categories: ['fish'] },
  { name: 'Lachs mit Ofengemüse', categories: ['fish'] },
  { name: 'Fischstäbchen mit Kartoffelpüree', categories: ['fish'] },
  { name: 'Shrimp Pasta', categories: ['fish'] },
  { name: 'Tuna Pasta Bake', categories: ['fish'] },
  { name: 'Fried Rice', categories: ['chicken', 'fish', 'vegetarian'] },
  { name: 'Käsespätzle', categories: ['vegetarian'] },
  { name: 'Pfannkuchen', categories: ['vegetarian'] },
  { name: 'Gemüse-Risotto', categories: ['vegetarian'] },
  { name: 'Shakshuka', categories: ['vegetarian'] },
  { name: 'Pasta Pesto', categories: ['vegetarian'] },
  { name: 'Linsensuppe', categories: ['vegetarian'] },
  { name: 'Vegetable Stir-Fry with Noodles', categories: ['chicken', 'vegetarian'] },
  { name: 'Pizza', categories: ['vegetarian'] },
  { name: 'Omelette with Salad', categories: ['vegetarian'] },
];

// Egyptian list, names exactly as Bob wrote them.
// Categories = the protein you need at home. Stews (طبيخ) and mahshi are
// commonly made with meat or without, so they carry both beef and vegetarian.
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

export const DEFAULT_DISHES: Record<Locale, DefaultDish[]> = { en: EN, ar: AR };
