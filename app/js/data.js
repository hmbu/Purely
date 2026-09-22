/* Demo catalog and hotel settings.
   This file stands in for what the hotel's own catalog service would return:
   Server.getCatalog() (store.js) hands a copy of these arrays to G-01.

   Rules that shaped the shape of the data:
   - Prices are plain numbers. The currency label and its side are decided by
     money() in i18n.js (G-01 §7.2: "45.00 ر.س" in Arabic, "SAR 45.00" in
     English, Western digits in both). Nothing here formats money.
   - Every product carries its name AND its description in both languages,
     because the order record saved on the device stores names in both
     languages so history survives a language switch (M-01 §7.4 step 1).
   - There are no product images in this build. The views draw the gray
     placeholder box with the generic product icon that G-01 §6.3 item 3
     already specifies for a failed image, so no URLs are invented here.
   - `inStock: false` on three products, so the out-of-stock card (G-01 C07),
     the out-of-stock cart line (G-03 §5.4) and the disabled Checkout button
     (G-03 F12) are all reachable without touching the demo bar.
   - Category order here is the order the chips and the sections appear in
     (G-01 acceptance 12 and 16: "in the catalog's order").
*/
(function () {
  'use strict';

  /* Hotel settings. C01 on G-01 prints the name; nothing else about the hotel
     is displayed anywhere in version 1. */
  var hotelNameAr = 'فندق الواحة';
  var hotelNameEn = 'Al Waha Hotel';

  /* One chip and one section per category that has at least one product
     (G-01 §5.3). A category with zero products is simply never referenced. */
  var categories = [
    { id: 'drinks', nameAr: 'مشروبات باردة',    nameEn: 'Cold drinks' },
    { id: 'hot',    nameAr: 'قهوة وشاي',        nameEn: 'Coffee & tea' },
    { id: 'snacks', nameAr: 'وجبات خفيفة',      nameEn: 'Snacks' },
    { id: 'care',   nameAr: 'العناية الشخصية',  nameEn: 'Personal care' },
    { id: 'room',   nameAr: 'مستلزمات الغرفة',  nameEn: 'Room essentials' }
  ];

  var products = [
    /* — Cold drinks — */
    {
      id: 'p-water-500',
      nameAr: 'مياه معدنية 500 مل',
      nameEn: 'Still water 500 ml',
      descAr: 'زجاجة مياه معدنية مبرّدة، 500 مل.',
      descEn: 'Chilled bottle of still mineral water, 500 ml.',
      price: 5,
      category: 'drinks',
      inStock: true
    },
    {
      id: 'p-water-sparkling',
      nameAr: 'مياه فوارة 330 مل',
      nameEn: 'Sparkling water 330 ml',
      descAr: 'مياه معدنية فوارة مبرّدة في زجاجة 330 مل.',
      descEn: 'Chilled sparkling mineral water in a 330 ml bottle.',
      price: 9,
      category: 'drinks',
      inStock: true
    },
    {
      id: 'p-orange-juice',
      nameAr: 'عصير برتقال طازج',
      nameEn: 'Fresh orange juice',
      descAr: 'برتقال معصور في المطبخ عند الطلب، بدون سكر مضاف، 300 مل.',
      descEn: 'Squeezed in the kitchen when you order, no added sugar, 300 ml.',
      price: 18,
      category: 'drinks',
      inStock: true
    },
    {
      id: 'p-cola',
      nameAr: 'كولا 330 مل',
      nameEn: 'Cola 330 ml',
      descAr: 'علبة كولا مبرّدة، 330 مل.',
      descEn: 'Chilled can of cola, 330 ml.',
      price: 8,
      category: 'drinks',
      inStock: true
    },
    {
      id: 'p-lemon-mint',
      nameAr: 'ليمون بالنعناع',
      nameEn: 'Lemon mint cooler',
      descAr: 'ليمون طازج مع نعناع وثلج، 400 مل.',
      descEn: 'Fresh lemon with mint over ice, 400 ml.',
      price: 16,
      category: 'drinks',
      inStock: true
    },
    {
      /* Out of stock on purpose: gives G-01 an out-of-stock card in the very
         first section the guest sees. */
      id: 'p-iced-latte',
      nameAr: 'لاتيه مثلج',
      nameEn: 'Iced latte',
      descAr: 'إسبريسو مزدوج مع حليب بارد وثلج، 350 مل.',
      descEn: 'Double espresso with cold milk over ice, 350 ml.',
      price: 22,
      category: 'drinks',
      inStock: false
    },

    /* — Coffee & tea — */
    {
      id: 'p-arabic-coffee',
      nameAr: 'قهوة عربية — دلّة صغيرة',
      nameEn: 'Arabic coffee — small pot',
      descAr: 'دلّة تكفي فنجانين، تُقدَّم مع تمر.',
      descEn: 'A pot for two cups, served with dates.',
      price: 28,
      category: 'hot',
      inStock: true
    },
    {
      id: 'p-espresso',
      nameAr: 'إسبريسو مزدوج',
      nameEn: 'Double espresso',
      descAr: 'جرعتان من حبوب محمّصة وسط.',
      descEn: 'Two shots of medium-roast beans.',
      price: 14,
      category: 'hot',
      inStock: true
    },
    {
      id: 'p-karak',
      nameAr: 'شاي كرك',
      nameEn: 'Karak tea',
      descAr: 'شاي بالحليب والهيل، كوب واحد.',
      descEn: 'Tea with milk and cardamom, one cup.',
      price: 13,
      category: 'hot',
      inStock: true
    },
    {
      id: 'p-tea-mint',
      nameAr: 'شاي أخضر بالنعناع',
      nameEn: 'Green tea with mint',
      descAr: 'إبريق شاي أخضر مع نعناع طازج.',
      descEn: 'A pot of green tea with fresh mint.',
      price: 12,
      category: 'hot',
      inStock: true
    },
    {
      id: 'p-hot-chocolate',
      nameAr: 'شوكولاتة ساخنة',
      nameEn: 'Hot chocolate',
      descAr: 'حليب ساخن مع شوكولاتة داكنة، 300 مل.',
      descEn: 'Hot milk with dark chocolate, 300 ml.',
      price: 19,
      category: 'hot',
      inStock: true
    },

    /* — Snacks — */
    {
      id: 'p-club-sandwich',
      nameAr: 'ساندويتش كلوب',
      nameEn: 'Club sandwich',
      descAr: 'دجاج وجبن وخضار مع بطاطس مقلية جانبية.',
      descEn: 'Chicken, cheese and salad, with a side of fries.',
      price: 45,
      category: 'snacks',
      inStock: true
    },
    {
      id: 'p-mixed-nuts',
      nameAr: 'مكسّرات مشكّلة 100 غ',
      nameEn: 'Mixed nuts 100 g',
      descAr: 'لوز وكاجو وفستق محمّص، بدون ملح.',
      descEn: 'Roasted almonds, cashews and pistachios, unsalted.',
      price: 24,
      category: 'snacks',
      inStock: true
    },
    {
      id: 'p-potato-chips',
      nameAr: 'رقائق بطاطس',
      nameEn: 'Potato crisps',
      descAr: 'كيس 45 غ بنكهة الملح الخفيف.',
      descEn: 'A 45 g bag, lightly salted.',
      price: 7,
      category: 'snacks',
      inStock: true
    },
    {
      id: 'p-fruit-plate',
      nameAr: 'طبق فواكه موسمية',
      nameEn: 'Seasonal fruit plate',
      descAr: 'فواكه مقطّعة حسب الموسم، يكفي لشخصين.',
      descEn: 'Sliced seasonal fruit, enough for two.',
      price: 32,
      category: 'snacks',
      inStock: true
    },
    {
      id: 'p-dates-box',
      nameAr: 'علبة تمر سكري',
      nameEn: 'Box of Sukkari dates',
      descAr: 'علبة 250 غ من التمر السكري.',
      descEn: 'A 250 g box of Sukkari dates.',
      price: 35,
      category: 'snacks',
      inStock: true
    },
    {
      id: 'p-chocolate-bar',
      nameAr: 'لوح شوكولاتة بالحليب',
      nameEn: 'Milk chocolate bar',
      descAr: 'لوح 80 غ من الشوكولاتة بالحليب.',
      descEn: 'An 80 g milk chocolate bar.',
      price: 10,
      category: 'snacks',
      inStock: true
    },

    /* — Personal care — */
    {
      id: 'p-toothbrush-set',
      nameAr: 'طقم فرشاة ومعجون أسنان',
      nameEn: 'Toothbrush and toothpaste set',
      descAr: 'فرشاة أسنان متوسطة الخشونة مع أنبوب معجون صغير.',
      descEn: 'A medium toothbrush with a travel tube of toothpaste.',
      price: 12,
      category: 'care',
      inStock: true
    },
    {
      id: 'p-shaving-kit',
      nameAr: 'طقم حلاقة',
      nameEn: 'Shaving kit',
      descAr: 'شفرة حلاقة مع عبوة كريم حلاقة صغيرة.',
      descEn: 'A razor with a small tube of shaving cream.',
      price: 15,
      category: 'care',
      inStock: true
    },
    {
      id: 'p-comb-cap',
      nameAr: 'مشط وقبعة استحمام',
      nameEn: 'Comb and shower cap',
      descAr: 'مشط بلاستيكي مع قبعة استحمام للاستعمال مرة واحدة.',
      descEn: 'A plastic comb with a single-use shower cap.',
      price: 8,
      category: 'care',
      inStock: true
    },
    {
      id: 'p-deodorant',
      nameAr: 'مزيل عرق',
      nameEn: 'Deodorant',
      descAr: 'عبوة بخّاخ 50 مل، برائحة خفيفة.',
      descEn: 'A 50 ml spray, lightly scented.',
      price: 21,
      category: 'care',
      inStock: true
    },
    {
      id: 'p-hand-cream',
      nameAr: 'كريم يدين',
      nameEn: 'Hand cream',
      descAr: 'أنبوب 75 مل، سريع الامتصاص.',
      descEn: 'A 75 ml tube, fast absorbing.',
      price: 26,
      category: 'care',
      inStock: true
    },
    {
      /* Out of stock on purpose. */
      id: 'p-sunscreen',
      nameAr: 'واقٍ شمسي SPF 50',
      nameEn: 'Sunscreen SPF 50',
      descAr: 'عبوة 100 مل مقاومة للماء.',
      descEn: 'A 100 ml water-resistant bottle.',
      price: 48,
      category: 'care',
      inStock: false
    },

    /* — Room essentials — */
    {
      id: 'p-charging-cable',
      nameAr: 'كيبل شحن متعدد الأطراف',
      nameEn: 'Multi-tip charging cable',
      descAr: 'كيبل بطول متر واحد بثلاثة أطراف: USB-C وLightning وMicro-USB.',
      descEn: 'A one-metre cable with three tips: USB-C, Lightning and Micro-USB.',
      price: 39,
      category: 'room',
      inStock: true
    },
    {
      id: 'p-travel-adapter',
      nameAr: 'محوّل كهربائي عالمي',
      nameEn: 'Universal travel adapter',
      descAr: 'محوّل يناسب معظم القوابس، يُعاد إلى الاستقبال عند المغادرة.',
      descEn: 'Fits most plug types; returned to reception at check-out.',
      price: 55,
      category: 'room',
      inStock: true
    },
    {
      id: 'p-slippers',
      nameAr: 'شبشب غرفة',
      nameEn: 'Room slippers',
      descAr: 'زوج قطني مقاس واحد يناسب الجميع.',
      descEn: 'A cotton pair, one size fits all.',
      price: 18,
      category: 'room',
      inStock: true
    },
    {
      id: 'p-sewing-kit',
      nameAr: 'طقم خياطة',
      nameEn: 'Sewing kit',
      descAr: 'إبر وخيوط بألوان أساسية وزرّان احتياطيان.',
      descEn: 'Needles, thread in basic colours and two spare buttons.',
      price: 9,
      category: 'room',
      inStock: true
    },
    {
      /* Out of stock on purpose: the last section, so a guest who scrolls to
         the bottom also meets the state. */
      id: 'p-sleep-set',
      nameAr: 'سدادات أذن وقناع نوم',
      nameEn: 'Earplugs and sleep mask',
      descAr: 'زوج سدادات إسفنجية مع قناع نوم قطني.',
      descEn: 'A pair of foam earplugs with a cotton sleep mask.',
      price: 14,
      category: 'room',
      inStock: false
    }
  ];

  window.Data = {
    hotelNameAr: hotelNameAr,
    hotelNameEn: hotelNameEn,
    categories: categories,
    products: products
  };
})();
