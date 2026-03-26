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
    {name: "سرقسطة", lat: 41.6488, lng: -0.8891},
    {name: "بلباو", lat: 43.2630, lng: -2.9350},
    {name: "أليكانتي", lat: 38.3452, lng: -0.4810},
    {name: "قرطبة", lat: 37.8882, lng: -4.7794},
    {name: "غرناطة", lat: 37.1773, lng: -3.5986},
    {name: "مورسية", lat: 37.9922, lng: -1.1307},
    {name: "بالما دي مايوركا", lat: 39.5696, lng: 2.6502},
    {name: "لاس بالماس", lat: 28.1235, lng: -15.4363},
    {name: "سانتا كروز دي تينيريفي", lat: 28.4636, lng: -16.2518},
    {name: "بامبلونا", lat: 42.8125, lng: -1.6458},
    {name: "سان سيباستيان", lat: 43.3183, lng: -1.9812},
    {name: "سانتاندير", lat: 43.4623, lng: -3.8100},
    {name: "طليطلة", lat: 39.8628, lng: -4.0273},
    {name: "سلامنكا", lat: 40.9688, lng: -5.6631},
    {name: "بلد الوليد", lat: 41.6523, lng: -4.7245},
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
  // Egypt
  "Cairo": [
    {name_ar: "المعادي", name_fr: "Maadi", lat: 29.9602, lng: 31.2569},
    {name_ar: "الزمالك", name_fr: "Zamalek", lat: 30.0651, lng: 31.2219},
    {name_ar: "مصر الجديدة", name_fr: "Héliopolis", lat: 30.0911, lng: 31.3225},
    {name_ar: "المهندسين", name_fr: "Mohandessin", lat: 30.0561, lng: 31.2001},
    {name_ar: "الدقي", name_fr: "Dokki", lat: 30.0392, lng: 31.2125},
    {name_ar: "وسط البلد", name_fr: "Downtown", lat: 30.0444, lng: 31.2357},
    {name_ar: "مدينة نصر", name_fr: "Nasr City", lat: 30.0511, lng: 31.3656},
    {name_ar: "التجمع الخامس", name_fr: "5th Settlement", lat: 30.0084, lng: 31.4297},
    {name_ar: "الشيخ زايد", name_fr: "Sheikh Zayed", lat: 30.0345, lng: 30.9906},
    {name_ar: "6 أكتوبر", name_fr: "6 October", lat: 29.9737, lng: 30.9176},
  ],
  "Alexandria": [
    {name_ar: "المنشية", name_fr: "Mansheyya", lat: 31.1988, lng: 29.8942},
    {name_ar: "سيدي جابر", name_fr: "Sidi Gaber", lat: 31.2156, lng: 29.9429},
    {name_ar: "الإبراهيمية", name_fr: "Ibrahimiyya", lat: 31.2169, lng: 29.9330},
    {name_ar: "سموحة", name_fr: "Smouha", lat: 31.2098, lng: 29.9558},
    {name_ar: "جليم", name_fr: "Gleem", lat: 31.2270, lng: 29.9620},
    {name_ar: "ستانلي", name_fr: "Stanley", lat: 31.2380, lng: 29.9520},
  ],
  // Saudi Arabia
  "Riyadh": [
    {name_ar: "العليا", name_fr: "Olaya", lat: 24.6985, lng: 46.6854},
    {name_ar: "الملز", name_fr: "Malaz", lat: 24.6622, lng: 46.7285},
    {name_ar: "السليمانية", name_fr: "Sulaimaniya", lat: 24.7013, lng: 46.6981},
    {name_ar: "النسيم", name_fr: "Nassim", lat: 24.7020, lng: 46.7720},
    {name_ar: "الربوة", name_fr: "Rabwa", lat: 24.7100, lng: 46.7200},
    {name_ar: "حي الياسمين", name_fr: "Yasmin", lat: 24.8260, lng: 46.6380},
    {name_ar: "حي الورود", name_fr: "Woroud", lat: 24.7130, lng: 46.6730},
    {name_ar: "الشفا", name_fr: "Shifa", lat: 24.5900, lng: 46.6800},
  ],
  "Jeddah": [
    {name_ar: "البلد", name_fr: "Al Balad", lat: 21.4858, lng: 39.1860},
    {name_ar: "الحمراء", name_fr: "Hamra", lat: 21.5320, lng: 39.1730},
    {name_ar: "الروضة", name_fr: "Rawdah", lat: 21.5444, lng: 39.1901},
    {name_ar: "الصفا", name_fr: "Safa", lat: 21.5560, lng: 39.2100},
    {name_ar: "الشاطئ", name_fr: "Shati", lat: 21.5940, lng: 39.1050},
    {name_ar: "أبحر", name_fr: "Obhur", lat: 21.6890, lng: 39.0980},
  ],
  // UAE
  "Dubai": [
    {name_ar: "ديرة", name_fr: "Deira", lat: 25.2700, lng: 55.3100},
    {name_ar: "بر دبي", name_fr: "Bur Dubai", lat: 25.2500, lng: 55.2900},
    {name_ar: "مارينا", name_fr: "Marina", lat: 25.0804, lng: 55.1403},
    {name_ar: "الجميرة", name_fr: "Jumeirah", lat: 25.2100, lng: 55.2400},
    {name_ar: "البرشاء", name_fr: "Al Barsha", lat: 25.1134, lng: 55.2006},
    {name_ar: "الخليج التجاري", name_fr: "Business Bay", lat: 25.1863, lng: 55.2617},
    {name_ar: "داون تاون", name_fr: "Downtown", lat: 25.1972, lng: 55.2744},
    {name_ar: "القوز", name_fr: "Al Quoz", lat: 25.1500, lng: 55.2350},
  ],
  "Abu Dhabi": [
    {name_ar: "الكورنيش", name_fr: "Corniche", lat: 24.4700, lng: 54.3500},
    {name_ar: "الخالدية", name_fr: "Khalidiya", lat: 24.4650, lng: 54.3450},
    {name_ar: "المرور", name_fr: "Al Muroor", lat: 24.4550, lng: 54.3800},
    {name_ar: "المصفح", name_fr: "Musaffah", lat: 24.3600, lng: 54.5000},
    {name_ar: "شاطئ الراحة", name_fr: "Al Raha Beach", lat: 24.4600, lng: 54.5900},
    {name_ar: "جزيرة السعديات", name_fr: "Saadiyat Island", lat: 24.5400, lng: 54.4300},
  ],
  // Turkey
  "Istanbul": [
    {name_ar: "بيوغلو", name_fr: "Beyoğlu", lat: 41.0370, lng: 28.9770},
    {name_ar: "فاتح", name_fr: "Fatih", lat: 41.0186, lng: 28.9400},
    {name_ar: "بشكتاش", name_fr: "Beşiktaş", lat: 41.0422, lng: 29.0050},
    {name_ar: "أسكودار", name_fr: "Üsküdar", lat: 41.0256, lng: 29.0153},
    {name_ar: "كاديكوي", name_fr: "Kadıköy", lat: 40.9927, lng: 29.0230},
    {name_ar: "تقسيم", name_fr: "Taksim", lat: 41.0370, lng: 28.9850},
    {name_ar: "السلطان أحمد", name_fr: "Sultanahmet", lat: 41.0054, lng: 28.9768},
    {name_ar: "باكركوي", name_fr: "Bakırköy", lat: 40.9800, lng: 28.8720},
  ],
  // France
  "Paris": [
    {name_ar: "الشانزليزيه", name_fr: "Champs-Élysées", lat: 48.8698, lng: 2.3076},
    {name_ar: "الحي اللاتيني", name_fr: "Quartier Latin", lat: 48.8505, lng: 2.3451},
    {name_ar: "مونمارتر", name_fr: "Montmartre", lat: 48.8867, lng: 2.3431},
    {name_ar: "لو ماريه", name_fr: "Le Marais", lat: 48.8593, lng: 2.3614},
    {name_ar: "سان جيرمان", name_fr: "Saint-Germain", lat: 48.8534, lng: 2.3339},
    {name_ar: "بيلفيل", name_fr: "Belleville", lat: 48.8714, lng: 2.3770},
    {name_ar: "باستيل", name_fr: "Bastille", lat: 48.8533, lng: 2.3692},
    {name_ar: "الدفاع", name_fr: "La Défense", lat: 48.8920, lng: 2.2370},
  ],
  "Marseille": [
    {name_ar: "الميناء القديم", name_fr: "Vieux-Port", lat: 43.2951, lng: 5.3742},
    {name_ar: "لا كانبيار", name_fr: "La Canebière", lat: 43.2970, lng: 5.3780},
    {name_ar: "نوتردام", name_fr: "Notre-Dame", lat: 43.2840, lng: 5.3710},
    {name_ar: "الجمهورية", name_fr: "République", lat: 43.3010, lng: 5.3820},
    {name_ar: "كاستيلان", name_fr: "Castellane", lat: 43.2870, lng: 5.3850},
  ],
  // Spain
  "Madrid": [
    {name_ar: "غران فيا", name_fr: "Gran Vía", lat: 40.4200, lng: -3.7025},
    {name_ar: "سول", name_fr: "Sol", lat: 40.4168, lng: -3.7038},
    {name_ar: "سالامانكا", name_fr: "Salamanca", lat: 40.4276, lng: -3.6835},
    {name_ar: "تشامبيري", name_fr: "Chamberí", lat: 40.4350, lng: -3.7050},
    {name_ar: "لافابييس", name_fr: "Lavapiés", lat: 40.4090, lng: -3.7010},
    {name_ar: "مالاسانيا", name_fr: "Malasaña", lat: 40.4260, lng: -3.7070},
    {name_ar: "ريتيرو", name_fr: "Retiro", lat: 40.4153, lng: -3.6845},
    {name_ar: "تشامارتين", name_fr: "Chamartín", lat: 40.4624, lng: -3.6775},
  ],
  "Barcelona": [
    {name_ar: "الحي القوطي", name_fr: "Barri Gòtic", lat: 41.3833, lng: 2.1777},
    {name_ar: "إيكسامبل", name_fr: "Eixample", lat: 41.3905, lng: 2.1631},
    {name_ar: "غراسيا", name_fr: "Gràcia", lat: 41.4035, lng: 2.1566},
    {name_ar: "البرشلونيتا", name_fr: "Barceloneta", lat: 41.3781, lng: 2.1892},
    {name_ar: "سانتس", name_fr: "Sants", lat: 41.3745, lng: 2.1334},
    {name_ar: "إل رافال", name_fr: "El Raval", lat: 41.3800, lng: 2.1700},
    {name_ar: "ساغرادا فاميليا", name_fr: "Sagrada Família", lat: 41.4036, lng: 2.1744},
  ],
  "Seville": [
    {name_ar: "تريانا", name_fr: "Triana", lat: 37.3826, lng: -6.0026},
    {name_ar: "سانتا كروز", name_fr: "Santa Cruz", lat: 37.3854, lng: -5.9877},
    {name_ar: "ماكارينا", name_fr: "Macarena", lat: 37.4000, lng: -5.9900},
    {name_ar: "نيرفيون", name_fr: "Nervión", lat: 37.3860, lng: -5.9710},
    {name_ar: "لوس ريميديوس", name_fr: "Los Remedios", lat: 37.3750, lng: -6.0050},
    {name_ar: "بلازا دي إسبانيا", name_fr: "Plaza de España", lat: 37.3772, lng: -5.9869},
    {name_ar: "سان برناردو", name_fr: "San Bernardo", lat: 37.3830, lng: -5.9810},
  ],
  // Germany
  "Berlin": [
    {name_ar: "ميته", name_fr: "Mitte", lat: 52.5200, lng: 13.4050},
    {name_ar: "كرويتسبرغ", name_fr: "Kreuzberg", lat: 52.4991, lng: 13.4030},
    {name_ar: "شارلوتنبورغ", name_fr: "Charlottenburg", lat: 52.5163, lng: 13.3040},
    {name_ar: "نويكولن", name_fr: "Neukölln", lat: 52.4811, lng: 13.4350},
    {name_ar: "بريزلاور بيرغ", name_fr: "Prenzlauer Berg", lat: 52.5387, lng: 13.4244},
    {name_ar: "فريدريشسهاين", name_fr: "Friedrichshain", lat: 52.5148, lng: 13.4535},
  ],
  // UK
  "London": [
    {name_ar: "وستمنستر", name_fr: "Westminster", lat: 51.4975, lng: -0.1357},
    {name_ar: "كامدن", name_fr: "Camden", lat: 51.5390, lng: -0.1426},
    {name_ar: "كنسينغتون", name_fr: "Kensington", lat: 51.4990, lng: -0.1940},
    {name_ar: "شورديتش", name_fr: "Shoreditch", lat: 51.5264, lng: -0.0774},
    {name_ar: "سوهو", name_fr: "Soho", lat: 51.5133, lng: -0.1318},
    {name_ar: "نوتنغ هيل", name_fr: "Notting Hill", lat: 51.5110, lng: -0.2050},
    {name_ar: "مايفير", name_fr: "Mayfair", lat: 51.5100, lng: -0.1490},
    {name_ar: "تشيلسي", name_fr: "Chelsea", lat: 51.4875, lng: -0.1687},
  ],
  // Jordan
  "Amman": [
    {name_ar: "عبدون", name_fr: "Abdoun", lat: 31.9505, lng: 35.8807},
    {name_ar: "الشميساني", name_fr: "Shmeisani", lat: 31.9660, lng: 35.9010},
    {name_ar: "جبل عمّان", name_fr: "Jabal Amman", lat: 31.9520, lng: 35.9200},
    {name_ar: "الصويفية", name_fr: "Sweifieh", lat: 31.9570, lng: 35.8690},
    {name_ar: "الرابية", name_fr: "Rabieh", lat: 31.9700, lng: 35.8700},
    {name_ar: "وسط البلد", name_fr: "Downtown", lat: 31.9539, lng: 35.9340},
  ],
  // Lebanon
  "Beirut": [
    {name_ar: "الحمرا", name_fr: "Hamra", lat: 33.8961, lng: 35.4870},
    {name_ar: "الأشرفية", name_fr: "Achrafieh", lat: 33.8880, lng: 35.5150},
    {name_ar: "وسط بيروت", name_fr: "Centre-ville", lat: 33.8969, lng: 35.5031},
    {name_ar: "فردان", name_fr: "Verdun", lat: 33.8850, lng: 35.4810},
    {name_ar: "الجميزة", name_fr: "Gemmayzeh", lat: 33.8930, lng: 35.5120},
    {name_ar: "مار مخايل", name_fr: "Mar Mikhael", lat: 33.8910, lng: 35.5180},
  ],
  // Iraq
  "Baghdad": [
    {name_ar: "الكرادة", name_fr: "Karrada", lat: 33.2983, lng: 44.4053},
    {name_ar: "المنصور", name_fr: "Mansour", lat: 33.3230, lng: 44.3470},
    {name_ar: "الأعظمية", name_fr: "Adhamiyah", lat: 33.3560, lng: 44.3720},
    {name_ar: "الرصافة", name_fr: "Rusafa", lat: 33.3340, lng: 44.3810},
    {name_ar: "الكاظمية", name_fr: "Kadhimiya", lat: 33.3750, lng: 44.3470},
    {name_ar: "زيونة", name_fr: "Zayouna", lat: 33.3280, lng: 44.4220},
  ],
  // Algeria
  "Algiers": [
    {name_ar: "باب الوادي", name_fr: "Bab El Oued", lat: 36.7900, lng: 3.0500},
    {name_ar: "حيدرة", name_fr: "Hydra", lat: 36.7500, lng: 3.0300},
    {name_ar: "القصبة", name_fr: "Casbah", lat: 36.7850, lng: 3.0580},
    {name_ar: "المرادية", name_fr: "El Mouradia", lat: 36.7520, lng: 3.0550},
    {name_ar: "بن عكنون", name_fr: "Ben Aknoun", lat: 36.7600, lng: 3.0100},
    {name_ar: "دالي إبراهيم", name_fr: "Dely Ibrahim", lat: 36.7530, lng: 2.9830},
  ],
  // Tunisia
  "Tunis": [
    {name_ar: "المدينة العتيقة", name_fr: "Médina", lat: 36.7992, lng: 10.1710},
    {name_ar: "المرسى", name_fr: "La Marsa", lat: 36.8780, lng: 10.3230},
    {name_ar: "سيدي بوسعيد", name_fr: "Sidi Bou Said", lat: 36.8687, lng: 10.3475},
    {name_ar: "قرطاج", name_fr: "Carthage", lat: 36.8528, lng: 10.3238},
    {name_ar: "حلق الوادي", name_fr: "La Goulette", lat: 36.8181, lng: 10.3053},
    {name_ar: "المنار", name_fr: "El Manar", lat: 36.8260, lng: 10.1620},
  ],
  // US
  "New York": [
    {name_ar: "مانهاتن", name_fr: "Manhattan", lat: 40.7831, lng: -73.9712},
    {name_ar: "بروكلين", name_fr: "Brooklyn", lat: 40.6782, lng: -73.9442},
    {name_ar: "كوينز", name_fr: "Queens", lat: 40.7282, lng: -73.7949},
    {name_ar: "ذا برونكس", name_fr: "The Bronx", lat: 40.8448, lng: -73.8648},
    {name_ar: "هارلم", name_fr: "Harlem", lat: 40.8116, lng: -73.9465},
    {name_ar: "تشيلسي", name_fr: "Chelsea", lat: 40.7465, lng: -74.0014},
  ],
  "Los Angeles": [
    {name_ar: "هوليوود", name_fr: "Hollywood", lat: 34.0928, lng: -118.3287},
    {name_ar: "سانتا مونيكا", name_fr: "Santa Monica", lat: 34.0195, lng: -118.4912},
    {name_ar: "بيفرلي هيلز", name_fr: "Beverly Hills", lat: 34.0736, lng: -118.4004},
    {name_ar: "وسط المدينة", name_fr: "Downtown", lat: 34.0407, lng: -118.2468},
    {name_ar: "فينيسيا", name_fr: "Venice", lat: 33.9850, lng: -118.4695},
  ],
  // Canada
  "Toronto": [
    {name_ar: "وسط المدينة", name_fr: "Downtown", lat: 43.6532, lng: -79.3832},
    {name_ar: "يوركفيل", name_fr: "Yorkville", lat: 43.6709, lng: -79.3930},
    {name_ar: "كوين ويست", name_fr: "Queen West", lat: 43.6474, lng: -79.4070},
    {name_ar: "ليتل إيتالي", name_fr: "Little Italy", lat: 43.6556, lng: -79.4138},
    {name_ar: "كينسينغتون", name_fr: "Kensington", lat: 43.6544, lng: -79.4010},
  ],
  "Montreal": [
    {name_ar: "مونتريال القديمة", name_fr: "Vieux-Montréal", lat: 45.5048, lng: -73.5538},
    {name_ar: "الهضبة", name_fr: "Le Plateau", lat: 45.5225, lng: -73.5718},
    {name_ar: "وسط المدينة", name_fr: "Centre-ville", lat: 45.5017, lng: -73.5673},
    {name_ar: "مايل إند", name_fr: "Mile End", lat: 45.5283, lng: -73.5886},
    {name_ar: "ويستماونت", name_fr: "Westmount", lat: 45.4835, lng: -73.5991},
  ],
};

// Use Google Places Text Search to find real neighborhoods
async function searchGooglePlaces(query: string, apiKey: string, language = "ar"): Promise<Array<{name: string, lat: number, lng: number}>> {
  const results: Array<{name: string, lat: number, lng: number}> = [];
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}&language=${language}&type=neighborhood|sublocality|locality`;
    const response = await fetch(url);
    const data = await response.json();
    console.log(`Google Places search for "${query}": status=${data.status}, results=${data.results?.length || 0}`);
    
    if (data.status === "OK" && data.results) {
      for (const place of data.results) {
        if (place.name && place.geometry?.location) {
          results.push({
            name: place.name,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          });
        }
      }
    }
    
    // Try next page if available
    if (data.next_page_token) {
      await new Promise(r => setTimeout(r, 2000)); // Google requires delay before next_page_token works
      const url2 = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${data.next_page_token}&key=${apiKey}&language=${language}`;
      const response2 = await fetch(url2);
      const data2 = await response2.json();
      if (data2.status === "OK" && data2.results) {
        for (const place of data2.results) {
          if (place.name && place.geometry?.location) {
            results.push({
              name: place.name,
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("Google Places search error:", e);
  }
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, country, mode, extended } = await req.json();

    if (!country) {
      return new Response(
        JSON.stringify({ success: false, error: "country is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const countryEn = COUNTRY_MAP[country] || country;
    const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    // MODE: cities
    if (mode === "cities") {
      // Start with known cities
      const knownCities = KNOWN_CITIES[countryEn] || [];
      const allCities = [...knownCities];
      const seenNames = new Set(knownCities.map(c => c.name));

      // Always try Google Places to find MORE cities
      if (googleMapsApiKey) {
        const queries = [
          `cities in ${countryEn}`,
          `major cities ${countryEn}`,
          `towns in ${countryEn}`,
        ];
        // Extended mode: add more search queries
        if (extended) {
          queries.push(
            `small cities in ${countryEn}`,
            `popular towns ${countryEn}`,
            `regions in ${countryEn}`,
            `provinces in ${countryEn}`,
            `municipalities in ${countryEn}`,
          );
        }
        for (const q of queries) {
          const googleResults = await searchGooglePlaces(q, googleMapsApiKey);
          for (const r of googleResults) {
            if (!seenNames.has(r.name)) {
              seenNames.add(r.name);
              allCities.push(r);
            }
          }
        }
      }

      console.log(`Total cities for ${country}: ${allCities.length} (${knownCities.length} known + ${allCities.length - knownCities.length} from Google)`);
      
      return new Response(
        JSON.stringify({ success: true, cities: allCities, total: allCities.length }),
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
    
    // Start with known neighborhoods
    const allNeighborhoods = knownNeighborhoods.map(n => ({
      name_ar: n.name_ar,
      name_fr: n.name_fr,
      center_lat: n.lat,
      center_lng: n.lng,
    }));
    const seenNames = new Set(knownNeighborhoods.map(n => n.name_ar));

    // Always try Google Places to find MORE neighborhoods
    if (googleMapsApiKey) {
      const queries = [
        `neighborhoods in ${cityEn} ${countryEn}`,
        `quarters in ${cityEn} ${countryEn}`,
        `districts in ${cityEn} ${countryEn}`,
        `areas in ${cityEn} ${countryEn}`,
      ];
      
      for (const q of queries) {
        // Search in Arabic
        const arResults = await searchGooglePlaces(q, googleMapsApiKey, "ar");
        for (const r of arResults) {
          if (!seenNames.has(r.name)) {
            seenNames.add(r.name);
            allNeighborhoods.push({
              name_ar: r.name,
              name_fr: r.name, // Use same name as fallback
              center_lat: r.lat,
              center_lng: r.lng,
            });
          }
        }
        
        // Also search in French/English for name_fr
        const frResults = await searchGooglePlaces(q, googleMapsApiKey, "fr");
        for (const r of frResults) {
          // Try to match with existing by lat/lng proximity
          const existing = allNeighborhoods.find(n => 
            Math.abs(n.center_lat - r.lat) < 0.005 && Math.abs(n.center_lng - r.lng) < 0.005
          );
          if (existing && existing.name_fr === existing.name_ar) {
            existing.name_fr = r.name; // Update French name
          } else if (!seenNames.has(r.name)) {
            seenNames.add(r.name);
            allNeighborhoods.push({
              name_ar: r.name,
              name_fr: r.name,
              center_lat: r.lat,
              center_lng: r.lng,
            });
          }
        }
      }
    }

    console.log(`Total neighborhoods for ${city}: ${allNeighborhoods.length} (${knownNeighborhoods.length} known + ${allNeighborhoods.length - knownNeighborhoods.length} from Google)`);

    return new Response(
      JSON.stringify({ success: true, neighborhoods: allNeighborhoods, total: allNeighborhoods.length }),
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
