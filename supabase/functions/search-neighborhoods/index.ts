import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Map Arabic country names to English
const COUNTRY_MAP: Record<string, string> = {
  "المغرب": "Morocco", "الجزائر": "Algeria", "تونس": "Tunisia",
  "ليبيا": "Libya", "مصر": "Egypt", "موريتانيا": "Mauritania",
  "السعودية": "Saudi Arabia", "الإمارات": "UAE", "الكويت": "Kuwait",
  "قطر": "Qatar", "البحرين": "Bahrain", "عُمان": "Oman",
  "الأردن": "Jordan", "لبنان": "Lebanon", "العراق": "Iraq",
  "سوريا": "Syria", "فلسطين": "Palestine", "اليمن": "Yemen",
  "السودان": "Sudan", "تركيا": "Turkey", "فرنسا": "France",
  "إسبانيا": "Spain", "بلجيكا": "Belgium", "هولندا": "Netherlands",
  "ألمانيا": "Germany", "إيطاليا": "Italy", "كندا": "Canada",
  "الولايات المتحدة": "United States", "بريطانيا": "United Kingdom",
};

const CITY_MAP: Record<string, string> = {
  "الدار البيضاء": "Casablanca", "الرباط": "Rabat", "فاس": "Fes",
  "مراكش": "Marrakech", "أكادير": "Agadir", "طنجة": "Tangier",
  "Tanger": "Tangier", "القاهرة": "Cairo", "الإسكندرية": "Alexandria",
  "الرياض": "Riyadh", "جدة": "Jeddah", "الدمام": "Dammam",
  "دبي": "Dubai", "أبوظبي": "Abu Dhabi", "الدوحة": "Doha",
  "المنامة": "Manama", "مسقط": "Muscat", "عمّان": "Amman",
  "بيروت": "Beirut", "بغداد": "Baghdad", "دمشق": "Damascus",
  "تونس العاصمة": "Tunis", "الجزائر العاصمة": "Algiers",
  "إسطنبول": "Istanbul", "أنقرة": "Ankara", "باريس": "Paris",
  "مرسيليا": "Marseille", "ليون": "Lyon", "مدريد": "Madrid",
  "برشلونة": "Barcelona", "لندن": "London", "برلين": "Berlin",
  "نيويورك": "New York", "لوس أنجلوس": "Los Angeles",
  "تورنتو": "Toronto", "مونتريال": "Montreal",
  "الخرطوم": "Khartoum", "طرابلس": "Tripoli", "بنغازي": "Benghazi",
  "صنعاء": "Sanaa", "عدن": "Aden", "نواكشوط": "Nouakchott",
  "مدينة الكويت": "Kuwait City", "القدس": "Jerusalem",
  "رام الله": "Ramallah", "غزة": "Gaza", "حلب": "Aleppo",
  "بروكسل": "Brussels", "أمستردام": "Amsterdam", "روتردام": "Rotterdam",
  "ميلانو": "Milan", "روما": "Rome", "ميونخ": "Munich",
  "مانشستر": "Manchester", "برمنغهام": "Birmingham",
  "إشبيلية": "Seville", "أنتويرب": "Antwerp",
  "المحرق": "Muharraq", "الوكرة": "Al Wakrah",
  "أربيل": "Erbil", "صفاقس": "Sfax", "سوسة": "Sousse",
  "وهران": "Oran", "قسنطينة": "Constantine",
  "أم درمان": "Omdurman", "ديترويت": "Dearborn",
};

// Well-known cities per country (fallback data)
const KNOWN_CITIES: Record<string, Array<{name: string, lat: number, lng: number}>> = {
  "Morocco": [
    {name: "الدار البيضاء", lat: 33.5731, lng: -7.5898},
    {name: "الرباط", lat: 34.0209, lng: -6.8416},
    {name: "فاس", lat: 34.0181, lng: -5.0078},
    {name: "مراكش", lat: 31.6295, lng: -7.9811},
    {name: "طنجة", lat: 35.7595, lng: -5.834},
    {name: "أكادير", lat: 30.4278, lng: -9.5981},
    {name: "مكناس", lat: 33.8935, lng: -5.5473},
    {name: "وجدة", lat: 34.6805, lng: -1.9076},
    {name: "القنيطرة", lat: 34.2610, lng: -6.5802},
    {name: "تطوان", lat: 35.5785, lng: -5.3684},
    {name: "آسفي", lat: 32.2994, lng: -9.2372},
    {name: "الجديدة", lat: 33.2549, lng: -8.5000},
    {name: "بني ملال", lat: 32.3373, lng: -6.3498},
    {name: "الناظور", lat: 35.1681, lng: -2.9286},
    {name: "خريبكة", lat: 32.8811, lng: -6.9063},
    {name: "سلا", lat: 34.0531, lng: -6.7985},
    {name: "العيون", lat: 27.1253, lng: -13.1625},
    {name: "الحسيمة", lat: 35.2517, lng: -3.9372},
    {name: "سطات", lat: 33.0011, lng: -7.6166},
    {name: "المحمدية", lat: 33.6835, lng: -7.3828},
  ],
  "Algeria": [
    {name: "الجزائر العاصمة", lat: 36.7538, lng: 3.0588},
    {name: "وهران", lat: 35.6969, lng: -0.6331},
    {name: "قسنطينة", lat: 36.3650, lng: 6.6147},
    {name: "عنابة", lat: 36.9000, lng: 7.7667},
    {name: "باتنة", lat: 35.5560, lng: 6.1743},
    {name: "سطيف", lat: 36.1898, lng: 5.4108},
    {name: "بليدة", lat: 36.4704, lng: 2.8277},
    {name: "تلمسان", lat: 34.8828, lng: -1.3167},
  ],
  "Tunisia": [
    {name: "تونس العاصمة", lat: 36.8065, lng: 10.1815},
    {name: "صفاقس", lat: 34.7406, lng: 10.7603},
    {name: "سوسة", lat: 35.8254, lng: 10.6369},
    {name: "القيروان", lat: 35.6781, lng: 10.0963},
    {name: "بنزرت", lat: 37.2744, lng: 9.8739},
    {name: "قابس", lat: 33.8815, lng: 10.0982},
  ],
  "Egypt": [
    {name: "القاهرة", lat: 30.0444, lng: 31.2357},
    {name: "الإسكندرية", lat: 31.2001, lng: 29.9187},
    {name: "الجيزة", lat: 30.0131, lng: 31.2089},
    {name: "شرم الشيخ", lat: 27.9158, lng: 34.3300},
    {name: "الأقصر", lat: 25.6872, lng: 32.6396},
    {name: "أسوان", lat: 24.0889, lng: 32.8998},
    {name: "المنصورة", lat: 31.0409, lng: 31.3785},
    {name: "طنطا", lat: 30.7865, lng: 31.0004},
    {name: "بورسعيد", lat: 31.2565, lng: 32.2841},
    {name: "الإسماعيلية", lat: 30.5965, lng: 32.2715},
  ],
  "Saudi Arabia": [
    {name: "الرياض", lat: 24.7136, lng: 46.6753},
    {name: "جدة", lat: 21.4858, lng: 39.1925},
    {name: "مكة المكرمة", lat: 21.3891, lng: 39.8579},
    {name: "المدينة المنورة", lat: 24.5247, lng: 39.5692},
    {name: "الدمام", lat: 26.3927, lng: 49.9777},
    {name: "الطائف", lat: 21.2703, lng: 40.4158},
    {name: "تبوك", lat: 28.3838, lng: 36.5550},
    {name: "الخبر", lat: 26.2172, lng: 50.1971},
    {name: "أبها", lat: 18.2164, lng: 42.5053},
  ],
  "UAE": [
    {name: "دبي", lat: 25.2048, lng: 55.2708},
    {name: "أبوظبي", lat: 24.4539, lng: 54.3773},
    {name: "الشارقة", lat: 25.3463, lng: 55.4209},
    {name: "عجمان", lat: 25.4052, lng: 55.5136},
    {name: "رأس الخيمة", lat: 25.7895, lng: 55.9432},
    {name: "العين", lat: 24.1912, lng: 55.7606},
  ],
  "Kuwait": [
    {name: "مدينة الكويت", lat: 29.3759, lng: 47.9774},
    {name: "حولي", lat: 29.3375, lng: 48.0283},
    {name: "الأحمدي", lat: 29.0769, lng: 48.0838},
    {name: "الجهراء", lat: 29.3375, lng: 47.6581},
    {name: "الفروانية", lat: 29.2776, lng: 47.9581},
  ],
  "Qatar": [
    {name: "الدوحة", lat: 25.2854, lng: 51.5310},
    {name: "الوكرة", lat: 25.1659, lng: 51.6032},
    {name: "الخور", lat: 25.6804, lng: 51.4969},
    {name: "الريان", lat: 25.2919, lng: 51.4244},
  ],
  "Bahrain": [
    {name: "المنامة", lat: 26.2285, lng: 50.5860},
    {name: "المحرق", lat: 26.2572, lng: 50.6119},
    {name: "الرفاع", lat: 26.1300, lng: 50.5550},
  ],
  "Oman": [
    {name: "مسقط", lat: 23.5880, lng: 58.3829},
    {name: "صلالة", lat: 17.0151, lng: 54.0924},
    {name: "صحار", lat: 24.3615, lng: 56.7346},
    {name: "نزوى", lat: 22.9333, lng: 57.5333},
  ],
  "Jordan": [
    {name: "عمّان", lat: 31.9454, lng: 35.9284},
    {name: "إربد", lat: 32.5568, lng: 35.8469},
    {name: "الزرقاء", lat: 32.0727, lng: 36.0880},
    {name: "العقبة", lat: 29.5320, lng: 35.0063},
  ],
  "Lebanon": [
    {name: "بيروت", lat: 33.8938, lng: 35.5018},
    {name: "طرابلس", lat: 34.4332, lng: 35.8312},
    {name: "صيدا", lat: 33.5628, lng: 35.3716},
    {name: "جونية", lat: 33.9808, lng: 35.6178},
  ],
  "Iraq": [
    {name: "بغداد", lat: 33.3152, lng: 44.3661},
    {name: "البصرة", lat: 30.5085, lng: 47.7804},
    {name: "أربيل", lat: 36.1912, lng: 44.0119},
    {name: "الموصل", lat: 36.3350, lng: 43.1189},
    {name: "كربلاء", lat: 32.6160, lng: 44.0249},
    {name: "النجف", lat: 32.0000, lng: 44.3348},
  ],
  "Syria": [
    {name: "دمشق", lat: 33.5138, lng: 36.2765},
    {name: "حلب", lat: 36.2021, lng: 37.1343},
    {name: "حمص", lat: 34.7324, lng: 36.7137},
    {name: "اللاذقية", lat: 35.5317, lng: 35.7918},
  ],
  "Palestine": [
    {name: "القدس", lat: 31.7683, lng: 35.2137},
    {name: "رام الله", lat: 31.9038, lng: 35.2034},
    {name: "غزة", lat: 31.5017, lng: 34.4668},
    {name: "نابلس", lat: 32.2211, lng: 35.2544},
    {name: "الخليل", lat: 31.5326, lng: 35.0998},
    {name: "بيت لحم", lat: 31.7054, lng: 35.2024},
  ],
  "Yemen": [
    {name: "صنعاء", lat: 15.3694, lng: 44.1910},
    {name: "عدن", lat: 12.7855, lng: 45.0187},
    {name: "تعز", lat: 13.5789, lng: 44.0219},
  ],
  "Sudan": [
    {name: "الخرطوم", lat: 15.5007, lng: 32.5599},
    {name: "أم درمان", lat: 15.6445, lng: 32.4777},
    {name: "بورتسودان", lat: 19.6158, lng: 37.2164},
  ],
  "Turkey": [
    {name: "إسطنبول", lat: 41.0082, lng: 28.9784},
    {name: "أنقرة", lat: 39.9334, lng: 32.8597},
    {name: "إزمير", lat: 38.4237, lng: 27.1428},
    {name: "أنطاليا", lat: 36.8969, lng: 30.7133},
    {name: "بورصة", lat: 40.1885, lng: 29.0610},
    {name: "غازي عنتاب", lat: 37.0662, lng: 37.3833},
  ],
  "France": [
    {name: "باريس", lat: 48.8566, lng: 2.3522},
    {name: "مرسيليا", lat: 43.2965, lng: 5.3698},
    {name: "ليون", lat: 45.7640, lng: 4.8357},
    {name: "تولوز", lat: 43.6047, lng: 1.4442},
    {name: "نيس", lat: 43.7102, lng: 7.2620},
    {name: "ستراسبورغ", lat: 48.5734, lng: 7.7521},
  ],
  "Spain": [
    {name: "مدريد", lat: 40.4168, lng: -3.7038},
    {name: "برشلونة", lat: 41.3874, lng: 2.1686},
    {name: "إشبيلية", lat: 37.3891, lng: -5.9845},
    {name: "فالنسيا", lat: 39.4699, lng: -0.3763},
    {name: "مالقة", lat: 36.7213, lng: -4.4214},
  ],
  "Belgium": [
    {name: "بروكسل", lat: 50.8503, lng: 4.3517},
    {name: "أنتويرب", lat: 51.2194, lng: 4.4025},
    {name: "لييج", lat: 50.6326, lng: 5.5797},
  ],
  "Netherlands": [
    {name: "أمستردام", lat: 52.3676, lng: 4.9041},
    {name: "روتردام", lat: 51.9244, lng: 4.4777},
    {name: "لاهاي", lat: 52.0705, lng: 4.3007},
    {name: "أوتريخت", lat: 52.0907, lng: 5.1214},
  ],
  "Germany": [
    {name: "برلين", lat: 52.5200, lng: 13.4050},
    {name: "ميونخ", lat: 48.1351, lng: 11.5820},
    {name: "فرانكفورت", lat: 50.1109, lng: 8.6821},
    {name: "هامبورغ", lat: 53.5511, lng: 9.9937},
    {name: "كولونيا", lat: 50.9375, lng: 6.9603},
  ],
  "Italy": [
    {name: "روما", lat: 41.9028, lng: 12.4964},
    {name: "ميلانو", lat: 45.4642, lng: 9.1900},
    {name: "نابولي", lat: 40.8518, lng: 14.2681},
    {name: "تورينو", lat: 45.0703, lng: 7.6869},
  ],
  "Canada": [
    {name: "تورنتو", lat: 43.6532, lng: -79.3832},
    {name: "مونتريال", lat: 45.5017, lng: -73.5673},
    {name: "فانكوفر", lat: 49.2827, lng: -123.1207},
    {name: "أوتاوا", lat: 45.4215, lng: -75.6972},
    {name: "كالغاري", lat: 51.0447, lng: -114.0719},
  ],
  "United States": [
    {name: "نيويورك", lat: 40.7128, lng: -74.0060},
    {name: "لوس أنجلوس", lat: 34.0522, lng: -118.2437},
    {name: "شيكاغو", lat: 41.8781, lng: -87.6298},
    {name: "هيوستن", lat: 29.7604, lng: -95.3698},
    {name: "ديترويت", lat: 42.3314, lng: -83.0458},
    {name: "واشنطن", lat: 38.9072, lng: -77.0369},
  ],
  "United Kingdom": [
    {name: "لندن", lat: 51.5074, lng: -0.1278},
    {name: "مانشستر", lat: 53.4808, lng: -2.2426},
    {name: "برمنغهام", lat: 52.4862, lng: -1.8904},
    {name: "ليفربول", lat: 53.4084, lng: -2.9916},
    {name: "ليدز", lat: 53.8008, lng: -1.5491},
  ],
  "Mauritania": [
    {name: "نواكشوط", lat: 18.0735, lng: -15.9582},
    {name: "نواذيبو", lat: 20.9420, lng: -17.0362},
  ],
  "Libya": [
    {name: "طرابلس", lat: 32.8872, lng: 13.1913},
    {name: "بنغازي", lat: 32.1194, lng: 20.0868},
    {name: "مصراتة", lat: 32.3754, lng: 15.0925},
  ],
};

// Well-known neighborhoods per city (fallback)
const KNOWN_NEIGHBORHOODS: Record<string, Array<{name_ar: string, name_fr: string, lat: number, lng: number}>> = {
  "Casablanca": [
    {name_ar: "المعاريف", name_fr: "Maarif", lat: 33.5731, lng: -7.6298},
    {name_ar: "عين الذئاب", name_fr: "Ain Diab", lat: 33.5880, lng: -7.6700},
    {name_ar: "درب السلطان", name_fr: "Derb Sultan", lat: 33.5800, lng: -7.6100},
    {name_ar: "أنفا", name_fr: "Anfa", lat: 33.5900, lng: -7.6400},
    {name_ar: "الحي المحمدي", name_fr: "Hay Mohammadi", lat: 33.5650, lng: -7.5600},
    {name_ar: "سباتة", name_fr: "Sbata", lat: 33.5500, lng: -7.5800},
    {name_ar: "سيدي مومن", name_fr: "Sidi Moumen", lat: 33.5600, lng: -7.5300},
    {name_ar: "عين السبع", name_fr: "Ain Sebaa", lat: 33.6100, lng: -7.5500},
    {name_ar: "البرنوصي", name_fr: "Bernoussi", lat: 33.6200, lng: -7.5200},
    {name_ar: "بوسكورة", name_fr: "Bouskoura", lat: 33.4900, lng: -7.6500},
  ],
  "Rabat": [
    {name_ar: "أكدال", name_fr: "Agdal", lat: 33.9900, lng: -6.8500},
    {name_ar: "حسان", name_fr: "Hassan", lat: 34.0200, lng: -6.8350},
    {name_ar: "المدينة القديمة", name_fr: "Médina", lat: 34.0250, lng: -6.8300},
    {name_ar: "حي الرياض", name_fr: "Hay Riad", lat: 33.9600, lng: -6.8800},
    {name_ar: "السويسي", name_fr: "Souissi", lat: 33.9700, lng: -6.8600},
    {name_ar: "يعقوب المنصور", name_fr: "Yacoub El Mansour", lat: 34.0000, lng: -6.8700},
    {name_ar: "تقدم", name_fr: "Takaddoum", lat: 33.9800, lng: -6.8300},
    {name_ar: "المحيط", name_fr: "L'Océan", lat: 34.0150, lng: -6.8450},
  ],
  "Marrakech": [
    {name_ar: "المدينة القديمة", name_fr: "Médina", lat: 31.6300, lng: -7.9900},
    {name_ar: "جليز", name_fr: "Guéliz", lat: 31.6350, lng: -8.0100},
    {name_ar: "حي السعادة", name_fr: "Hay Saada", lat: 31.6200, lng: -8.0000},
    {name_ar: "المنارة", name_fr: "Ménara", lat: 31.6100, lng: -8.0200},
    {name_ar: "النخيل", name_fr: "Palmeraie", lat: 31.6700, lng: -7.9700},
    {name_ar: "سيدي يوسف بن علي", name_fr: "Sidi Youssef Ben Ali", lat: 31.6050, lng: -7.9700},
    {name_ar: "المسيرة", name_fr: "Massira", lat: 31.6000, lng: -8.0300},
    {name_ar: "داودية", name_fr: "Daoudia", lat: 31.6400, lng: -8.0050},
  ],
  "Tangier": [
    {name_ar: "المدينة القديمة", name_fr: "Médina", lat: 35.7860, lng: -5.8120},
    {name_ar: "وسط المدينة", name_fr: "Centre Ville", lat: 35.7753, lng: -5.8029},
    {name_ar: "مرشان", name_fr: "Marshan", lat: 35.7900, lng: -5.8230},
    {name_ar: "ملابطا", name_fr: "Malabata", lat: 35.7910, lng: -5.7860},
    {name_ar: "بوخالف", name_fr: "Boukhalef", lat: 35.7410, lng: -5.8570},
    {name_ar: "بني مكادة", name_fr: "Bni Makada", lat: 35.7510, lng: -5.7920},
    {name_ar: "حي البرانص", name_fr: "Hay Branés", lat: 35.7650, lng: -5.8150},
    {name_ar: "السواني", name_fr: "Souani", lat: 35.7550, lng: -5.8100},
    {name_ar: "مغوغة", name_fr: "Mghogha", lat: 35.7480, lng: -5.8300},
    {name_ar: "ابن بطوطة", name_fr: "Ibn Battouta", lat: 35.7350, lng: -5.8600},
    {name_ar: "مسنانة", name_fr: "Mesnana", lat: 35.7680, lng: -5.8170},
    {name_ar: "كاليفورنيا", name_fr: "California", lat: 35.7800, lng: -5.7950},
    {name_ar: "فال فلوري", name_fr: "Val Fleuri", lat: 35.7700, lng: -5.8050},
  ],
  "Fes": [
    {name_ar: "المدينة القديمة", name_fr: "Médina", lat: 34.0622, lng: -4.9748},
    {name_ar: "فاس الجديد", name_fr: "Fès Jdid", lat: 34.0550, lng: -4.9850},
    {name_ar: "المدينة الجديدة", name_fr: "Ville Nouvelle", lat: 34.0350, lng: -5.0050},
    {name_ar: "عين قادوس", name_fr: "Ain Kadous", lat: 34.0400, lng: -5.0100},
    {name_ar: "سايس", name_fr: "Saiss", lat: 34.0200, lng: -5.0200},
    {name_ar: "النرجس", name_fr: "Narjiss", lat: 34.0100, lng: -5.0300},
  ],
  "Agadir": [
    {name_ar: "تالبرجت", name_fr: "Talborjt", lat: 30.4200, lng: -9.5900},
    {name_ar: "وسط المدينة", name_fr: "Centre Ville", lat: 30.4278, lng: -9.5981},
    {name_ar: "حي السلام", name_fr: "Hay Salam", lat: 30.4100, lng: -9.5700},
    {name_ar: "الدشيرة", name_fr: "Dcheira", lat: 30.3800, lng: -9.5500},
    {name_ar: "تيكوين", name_fr: "Tikiouine", lat: 30.4350, lng: -9.5800},
    {name_ar: "حي المحمدي", name_fr: "Hay Mohammadi", lat: 30.4000, lng: -9.6000},
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, country, mode } = await req.json();

    if (!country) {
      return new Response(
        JSON.stringify({ success: false, error: "country is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const countryEn = COUNTRY_MAP[country] || country;

    // MODE: cities
    if (mode === "cities") {
      const knownCities = KNOWN_CITIES[countryEn] || [];
      
      if (knownCities.length > 0) {
        console.log(`Returning ${knownCities.length} known cities for ${country} (${countryEn})`);
        return new Response(
          JSON.stringify({ success: true, cities: knownCities, total: knownCities.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fallback: try Google Geocoding API
      const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
      if (googleMapsApiKey) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(countryEn)}&key=${googleMapsApiKey}&language=ar`;
        const response = await fetch(url);
        const data = await response.json();
        console.log(`Geocoding status for ${countryEn}: ${data.status}`);
      }

      return new Response(
        JSON.stringify({ success: true, cities: [], total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE: neighborhoods
    if (!city) {
      return new Response(
        JSON.stringify({ success: false, error: "city is required for neighborhood search" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cityEn = CITY_MAP[city] || city;
    const knownNeighborhoods = KNOWN_NEIGHBORHOODS[cityEn] || [];

    if (knownNeighborhoods.length > 0) {
      const neighborhoods = knownNeighborhoods.map(n => ({
        name_ar: n.name_ar,
        name_fr: n.name_fr,
        center_lat: n.lat,
        center_lng: n.lng,
      }));
      console.log(`Returning ${neighborhoods.length} known neighborhoods for ${city} (${cityEn})`);
      return new Response(
        JSON.stringify({ success: true, neighborhoods, total: neighborhoods.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try Google Geocoding as fallback
    const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (googleMapsApiKey) {
      try {
        const query = `${cityEn}, ${countryEn}`;
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleMapsApiKey}&language=ar`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === "OK" && data.results?.length > 0) {
          const loc = data.results[0].geometry.location;
          // Create a default neighborhood with the city center
          const neighborhoods = [{
            name_ar: "وسط المدينة",
            name_fr: "Centre Ville",
            center_lat: loc.lat,
            center_lng: loc.lng,
          }];
          console.log(`Created default neighborhood for ${city} via Geocoding`);
          return new Response(
            JSON.stringify({ success: true, neighborhoods, total: 1 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.error("Geocoding fallback error:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, neighborhoods: [], total: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("search-neighborhoods error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
