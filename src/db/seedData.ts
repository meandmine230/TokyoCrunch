import { 
  RestaurantSettings, 
  User, 
  Category, 
  Product, 
  Ingredient, 
  RecipeItem, 
  Supplier, 
  Staff, 
  Customer 
} from '../types';

export const initialSettings: RestaurantSettings = {
  name: 'Tokyo Crunch',
  tagline: 'Crispy, Crunchy, Unbeatable Taste',
  location: 'Ittfaq City Commercial Area',
  phone: '03071777948',
  currency: 'PKR',
  receiptHeader: 'TOKYO CRUNCH - ITTFAQ CITY',
  receiptFooter: 'Thank you for choosing Tokyo Crunch! Please visit again.',
  taxRatePercent: 0,
  deliveryFeeDefault: 0, // Free Home Delivery
  orderNumberPrefix: 'TC-',
  nextOrderSequence: 101,
  systemMode: 'standalone_single_system',
  liveSyncEnabled: false,
  liveSyncEndpoint: 'https://api.tokyocrunch.com/v1/sync',
  autoBackupEnabled: true,
  lastBackupDate: new Date().toISOString(),
  thermalPrinterWidth: '80mm',
  thermalFontSize: 'normal',
  thermalCutFeedLines: 2,
  autoPrintReceiptOnCheckout: true,
  autoPrintKotOnCheckout: true,
  silentKioskPrintEnabled: true,
};

export const initialUsers: User[] = [
  {
    id: 'user-admin',
    name: 'Master Admin',
    role: 'admin',
    pin: '1234',
    phone: '03071777948',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-manager',
    name: 'Shift Manager',
    role: 'manager',
    pin: '9999',
    phone: '03001234567',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-cashier',
    name: 'POS Cashier 1',
    role: 'cashier',
    pin: '1111',
    phone: '03017654321',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-kitchen',
    name: 'Kitchen Display',
    role: 'kitchen',
    pin: '2222',
    phone: '03099998888',
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export const initialCategories: Category[] = [
  { id: 'cat-burgers', name: 'Burgers', displayOrder: 1, iconName: 'Sandwich' },
  { id: 'cat-wraps', name: 'Wraps', displayOrder: 2, iconName: 'Utensils' },
  { id: 'cat-fried-chicken', name: 'Fried Chicken', displayOrder: 3, iconName: 'Drumstick' },
  { id: 'cat-wings', name: 'Wings', displayOrder: 4, iconName: 'Sparkles' },
  { id: 'cat-prem-fried', name: 'Premium Fried Chicken', displayOrder: 5, iconName: 'Award' },
  { id: 'cat-shawarma', name: 'Shawarmas', displayOrder: 6, iconName: 'Flame' },
  { id: 'cat-fries', name: 'Fries', displayOrder: 7, iconName: 'Box' },
  { id: 'cat-sauces', name: 'Sauces', displayOrder: 8, iconName: 'Droplets' },
  { id: 'cat-quesadillas', name: 'Quesadillas', displayOrder: 9, iconName: 'Layers' },
];

export const defaultAddons = [
  { id: 'addon-cheese', name: 'Cheese Slice', price: 50 },
  { id: 'addon-jalapeno', name: 'Jalapeno', price: 50 },
];

export const initialProducts: Product[] = [
  // ==========================================
  // --- CLASSIC BURGERS ---
  // ==========================================
  {
    id: 'prod-zinger-max',
    categoryId: 'cat-burgers',
    name: 'Zinger Max',
    description: 'Crispy fried chicken thigh, secret spicy mayo, fresh iceberg',
    basePrice: 400,
    variants: [
      { name: 'Single', price: 400 },
      { name: 'Double', price: 500 },
    ],
    addons: defaultAddons,
    available: true,
    isPopular: true,
  },
  {
    id: 'prod-chicken-filleto',
    categoryId: 'cat-burgers',
    name: 'Chicken Filleto',
    description: 'Tender breast filet crumbed with Tokyo Crunch seasoning',
    basePrice: 380,
    variants: [
      { name: 'Single', price: 380 },
      { name: 'Double', price: 550 },
    ],
    addons: defaultAddons,
    available: true,
  },
  {
    id: 'prod-zesty-crunch',
    categoryId: 'cat-burgers',
    name: 'Zesty Crunch',
    description: 'Zesty tangy glaze over ultra-crunch chicken patty',
    basePrice: 380,
    variants: [
      { name: 'Single', price: 380 },
      { name: 'Double', price: 560 },
    ],
    addons: defaultAddons,
    available: true,
  },
  {
    id: 'prod-reggy-burger',
    categoryId: 'cat-burgers',
    name: 'Reggy Burger',
    description: 'Classic regular crispy patty with signature sauce',
    basePrice: 250,
    variants: [
      { name: 'Single', price: 250 },
      { name: 'Double', price: 350 },
    ],
    addons: defaultAddons,
    available: true,
  },
  {
    id: 'prod-chappli-burger',
    categoryId: 'cat-burgers',
    name: 'Chappli Burger',
    description: 'Traditional spiced chappli patty in a soft sesame bun',
    basePrice: 250,
    variants: [
      { name: 'Single', price: 250 },
      { name: 'Double', price: 350 },
    ],
    addons: defaultAddons,
    available: true,
  },

  // ==========================================
  // --- PREMIUM BURGERS ---
  // ==========================================
  {
    id: 'prod-mighty-duo',
    categoryId: 'cat-burgers',
    name: 'Mighty Duo',
    description: 'Twin premium crispy fillets loaded with cheese and herbs',
    basePrice: 530,
    variants: [{ name: 'Standard', price: 530 }],
    addons: defaultAddons,
    available: true,
    isPopular: true,
  },
  {
    id: 'prod-sizzler-smash',
    categoryId: 'cat-burgers',
    name: 'Sizzler Smash',
    description: 'Hot sizzling spicy fillet, caramelized onions, melted dip',
    basePrice: 640,
    variants: [{ name: 'Standard', price: 640 }],
    addons: defaultAddons,
    available: true,
  },
  {
    id: 'prod-double-stack',
    categoryId: 'cat-burgers',
    name: 'Double Stack',
    description: 'Double jumbo fillets stacked high with extra crunch',
    basePrice: 620,
    variants: [{ name: 'Standard', price: 620 }],
    addons: defaultAddons,
    available: true,
    isPopular: true,
  },
  {
    id: 'prod-melted-feast',
    categoryId: 'cat-burgers',
    name: 'Melted Feast',
    description: 'Enveloped in molten cheese, garlic herb mayo, crisp pickles',
    basePrice: 750,
    variants: [{ name: 'Standard', price: 750 }],
    addons: defaultAddons,
    available: true,
  },

  // ==========================================
  // --- WRAPS ---
  // ==========================================
  {
    id: 'prod-crispy-wrap',
    categoryId: 'cat-wraps',
    name: 'Crispy Wrap',
    description: 'Golden strips with garlic mayo in a grilled tortilla',
    basePrice: 550,
    variants: [{ name: 'Standard', price: 550 }],
    addons: defaultAddons,
    available: true,
  },
  {
    id: 'prod-sizzler-wrap',
    categoryId: 'cat-wraps',
    name: 'Sizzler Wrap',
    description: 'Spicy chicken chunks, firecracker drizzle and fresh greens',
    basePrice: 550,
    variants: [{ name: 'Standard', price: 550 }],
    addons: defaultAddons,
    available: true,
  },
  {
    id: 'prod-prime-fold-wrap',
    categoryId: 'cat-wraps',
    name: 'Prime Fold Wrap',
    description: 'Loaded with double chicken, cheese slices and crunch flakes',
    basePrice: 650,
    variants: [{ name: 'Standard', price: 650 }],
    addons: defaultAddons,
    available: true,
  },

  // ==========================================
  // --- FRIED CHICKEN ---
  // ==========================================
  {
    id: 'prod-chicken-nuggets',
    categoryId: 'cat-fried-chicken',
    name: 'Chicken Nuggets',
    description: 'Crispy minced chicken bites loved by all ages',
    basePrice: 250,
    variants: [
      { name: '5Pcs', price: 250 },
      { name: '10Pcs', price: 500 },
    ],
    addons: [],
    available: true,
  },
  {
    id: 'prod-arabian-nuggets',
    categoryId: 'cat-fried-chicken',
    name: 'Arabian Nuggets',
    description: 'Exotic Arabian spiced crunchy chicken nuggets',
    basePrice: 300,
    variants: [
      { name: '5Pcs', price: 300 },
      { name: '10Pcs', price: 600 },
    ],
    addons: [],
    available: true,
  },
  {
    id: 'prod-hot-shots',
    categoryId: 'cat-fried-chicken',
    name: 'Hot Shots',
    description: 'Bite-sized fiery chicken popcorn tossed in seasoning',
    basePrice: 200,
    variants: [
      { name: '5Pcs', price: 200 },
      { name: '10Pcs', price: 400 },
    ],
    addons: [],
    available: true,
  },
  {
    id: 'prod-spicy-tenders',
    categoryId: 'cat-fried-chicken',
    name: 'Spicy Tenders',
    description: 'Long chicken breast fillets marinated with red pepper kick',
    basePrice: 500,
    variants: [
      { name: '5Pcs', price: 500 },
      { name: '10Pcs', price: 950 },
    ],
    addons: [],
    available: true,
  },
  {
    id: 'prod-juicy-tenders',
    categoryId: 'cat-fried-chicken',
    name: 'Juicy Tenders',
    description: 'Super succulent golden strips served piping hot',
    basePrice: 500,
    variants: [
      { name: '5Pcs', price: 500 },
      { name: '10Pcs', price: 950 },
    ],
    addons: [],
    available: true,
  },
  {
    id: 'prod-mega-bucket',
    categoryId: 'cat-fried-chicken',
    name: 'Crunchy Mega Bucket',
    description: 'Family mega feast with crispy fried chicken and sides',
    basePrice: 2100,
    variants: [{ name: 'Standard', price: 2100 }],
    addons: [],
    available: true,
    isPopular: true,
  },

  // ==========================================
  // --- WINGS ---
  // ==========================================
  {
    id: 'prod-hot-wings',
    categoryId: 'cat-wings',
    name: 'Hot Wings',
    description: 'Classic crunchy wings with spicy peppery glaze',
    basePrice: 300,
    variants: [
      { name: '5Pcs', price: 300 },
      { name: '10Pcs', price: 600 },
    ],
    addons: [],
    available: true,
  },
  {
    id: 'prod-bbq-wings',
    categoryId: 'cat-wings',
    name: 'B.B.Q Wings',
    description: 'Smoky sweet barbecue tossed crisp chicken wings',
    basePrice: 400,
    variants: [
      { name: '5Pcs', price: 400 },
      { name: '10Pcs', price: 750 },
    ],
    addons: [],
    available: true,
  },
  {
    id: 'prod-loaded-wings',
    categoryId: 'cat-wings',
    name: 'Loaded Wings',
    description: 'Wings drizzled with cheese dip and jalapeno crumbles',
    basePrice: 400,
    variants: [
      { name: '5Pcs', price: 400 },
      { name: '10Pcs', price: 750 },
    ],
    addons: [],
    available: true,
  },

  // ==========================================
  // --- PREMIUM FRIED CHICKEN ---
  // ==========================================
  {
    id: 'prod-pfc-jalapeno',
    categoryId: 'cat-prem-fried',
    name: 'Jalapeno Fried Chicken',
    description: 'Spiced with fiery pickled jalapenos and green chilli glaze',
    basePrice: 500,
    variants: [
      { name: '2Pcs', price: 500 },
      { name: '4Pcs', price: 950 },
      { name: '6Pcs', price: 1400 },
      { name: '8Pcs', price: 1850 },
    ],
    addons: [],
    available: true,
  },
  {
    id: 'prod-pfc-premium',
    categoryId: 'cat-prem-fried',
    name: 'Premium Fried Chicken',
    description: 'Signature crispy golden skin, juicy tender bone-in chicken',
    basePrice: 550,
    variants: [
      { name: '2Pcs', price: 550 },
      { name: '4Pcs', price: 1050 },
      { name: '6Pcs', price: 1550 },
      { name: '8Pcs', price: 2050 },
    ],
    addons: [],
    available: true,
    isPopular: true,
  },
  {
    id: 'prod-pfc-injected',
    categoryId: 'cat-prem-fried',
    name: 'Injected Fried Chicken',
    description: 'Flavor-injected deep inside the meat for intense juicy taste',
    basePrice: 600,
    variants: [
      { name: '2Pcs', price: 600 },
      { name: '4Pcs', price: 1150 },
      { name: '6Pcs', price: 1700 },
      { name: '8Pcs', price: 2250 },
    ],
    addons: [],
    available: true,
  },

  // ==========================================
  // --- SHAWARMAS ---
  // ==========================================
  {
    id: 'prod-dynamite-shawarma',
    categoryId: 'cat-shawarma',
    name: 'Dynamite Chicken Shawarma',
    description: 'Juicy roasted chicken chunks with dynamite spice kick',
    basePrice: 250,
    variants: [{ name: 'Standard', price: 250 }],
    addons: defaultAddons,
    available: true,
  },
  {
    id: 'prod-zinger-shawarma',
    categoryId: 'cat-shawarma',
    name: 'Zinger Shawarma',
    description: 'Fried zinger strips rolled into freshly baked pita',
    basePrice: 300,
    variants: [{ name: 'Standard', price: 300 }],
    addons: defaultAddons,
    available: true,
    isPopular: true,
  },
  {
    id: 'prod-cheesy-rush-shawarma',
    categoryId: 'cat-shawarma',
    name: 'Cheesy Rush Shawarma',
    description: 'Loaded chicken and overflowing mozzarella cheddar melt',
    basePrice: 400,
    variants: [{ name: 'Standard', price: 400 }],
    addons: defaultAddons,
    available: true,
  },

  // ==========================================
  // --- FRIES ---
  // ==========================================
  {
    id: 'prod-plain-fries',
    categoryId: 'cat-fries',
    name: 'Plain Fries',
    description: 'Crisp golden potato fries with sea salt',
    basePrice: 200,
    variants: [
      { name: 'Half', price: 200 },
      { name: 'Full', price: 400 },
    ],
    addons: defaultAddons,
    available: true,
  },
  {
    id: 'prod-masala-fries',
    categoryId: 'cat-fries',
    name: 'Masala Fries',
    description: 'Tossed in Tokyo Crunch special chaat masala spice mix',
    basePrice: 200,
    variants: [
      { name: 'Half', price: 200 },
      { name: 'Full', price: 400 },
    ],
    addons: defaultAddons,
    available: true,
  },
  {
    id: 'prod-mayo-fries',
    categoryId: 'cat-fries',
    name: 'Mayo Fries',
    description: 'Topped with velvety smooth garlic herb mayonnaise',
    basePrice: 250,
    variants: [
      { name: 'Half', price: 250 },
      { name: 'Full', price: 450 },
    ],
    addons: defaultAddons,
    available: true,
  },
  {
    id: 'prod-loaded-fries',
    categoryId: 'cat-fries',
    name: 'Loaded Fries',
    description: 'Topped with minced crunch chicken, jalapenos & house sauce',
    basePrice: 400,
    variants: [
      { name: 'Half', price: 400 },
      { name: 'Full', price: 750 },
    ],
    addons: defaultAddons,
    available: true,
    isPopular: true,
  },
  {
    id: 'prod-cheesy-melt-fries',
    categoryId: 'cat-fries',
    name: 'Cheesy Melt Fries',
    description: 'Smothered with real melted cheese blend and paprika',
    basePrice: 450,
    variants: [
      { name: 'Half', price: 450 },
      { name: 'Full', price: 850 },
    ],
    addons: defaultAddons,
    available: true,
  },

  // ==========================================
  // --- SAUCES (RS. 50 EACH) ---
  // ==========================================
  {
    id: 'prod-sauce-special',
    categoryId: 'cat-sauces',
    name: 'Special Sauce',
    description: 'House secret creamy garlic spice dip',
    basePrice: 50,
    variants: [{ name: 'Standard', price: 50 }],
    addons: [],
    available: true,
  },
  {
    id: 'prod-sauce-mustard',
    categoryId: 'cat-sauces',
    name: 'Mustard Sauce',
    description: 'Sweet honey combined with yellow mustard seeds',
    basePrice: 50,
    variants: [{ name: 'Standard', price: 50 }],
    addons: [],
    available: true,
  },
  {
    id: 'prod-sauce-bbq',
    categoryId: 'cat-sauces',
    name: 'B. B. Q Sauce',
    description: 'Rich hickory smoke and barbecue sauce',
    basePrice: 50,
    variants: [{ name: 'Standard', price: 50 }],
    addons: [],
    available: true,
  },
  {
    id: 'prod-sauce-thousand',
    categoryId: 'cat-sauces',
    name: 'Thousand Island',
    description: 'Classic tangy relish dressing',
    basePrice: 50,
    variants: [{ name: 'Standard', price: 50 }],
    addons: [],
    available: true,
  },

  // ==========================================
  // --- QUESADILLAS ---
  // ==========================================
  {
    id: 'prod-cheesy-quesadillas',
    categoryId: 'cat-quesadillas',
    name: 'Cheesy Quesadillas',
    description: 'Crisp toasted tortilla stuffed with seasoned chicken and molten cheese',
    basePrice: 700,
    variants: [{ name: 'Standard', price: 700 }],
    addons: defaultAddons,
    available: true,
    isPopular: true,
  },
];

export const initialIngredients: Ingredient[] = [
  { id: 'ing-buns', name: 'Burger Buns', unit: 'pcs', currentStock: 250, minStockAlert: 50, unitCost: 35, updatedAt: new Date().toISOString() },
  { id: 'ing-chicken-fillet', name: 'Raw Chicken Fillet', unit: 'kg', currentStock: 45, minStockAlert: 10, unitCost: 750, updatedAt: new Date().toISOString() },
  { id: 'ing-chicken-bone', name: 'Chicken Pieces (Bone-in)', unit: 'kg', currentStock: 60, minStockAlert: 15, unitCost: 650, updatedAt: new Date().toISOString() },
  { id: 'ing-chicken-wings', name: 'Chicken Wings', unit: 'kg', currentStock: 25, minStockAlert: 8, unitCost: 550, updatedAt: new Date().toISOString() },
  { id: 'ing-tortilla', name: 'Tortilla Wrap 10"', unit: 'pcs', currentStock: 120, minStockAlert: 30, unitCost: 40, updatedAt: new Date().toISOString() },
  { id: 'ing-pita', name: 'Shawarma Pita Bread', unit: 'pcs', currentStock: 140, minStockAlert: 40, unitCost: 25, updatedAt: new Date().toISOString() },
  { id: 'ing-potatoes', name: 'Fries (Cut Potatoes)', unit: 'kg', currentStock: 50, minStockAlert: 15, unitCost: 180, updatedAt: new Date().toISOString() },
  { id: 'ing-cheese-slices', name: 'Cheese Slices', unit: 'pcs', currentStock: 180, minStockAlert: 40, unitCost: 28, updatedAt: new Date().toISOString() },
  { id: 'ing-jalapenos', name: 'Sliced Jalapenos (Jar)', unit: 'kg', currentStock: 12, minStockAlert: 3, unitCost: 600, updatedAt: new Date().toISOString() },
  { id: 'ing-mayo-sauce', name: 'Garlic Mayo / Sauces', unit: 'kg', currentStock: 25, minStockAlert: 6, unitCost: 450, updatedAt: new Date().toISOString() },
  { id: 'ing-oil', name: 'Deep Frying Cooking Oil', unit: 'litres', currentStock: 80, minStockAlert: 20, unitCost: 520, updatedAt: new Date().toISOString() },
  { id: 'ing-breading', name: 'Tokyo Crunch Coating Batter & Spices', unit: 'kg', currentStock: 35, minStockAlert: 10, unitCost: 400, updatedAt: new Date().toISOString() },
  { id: 'ing-packaging', name: 'Burger & Snack Food Boxes', unit: 'pcs', currentStock: 400, minStockAlert: 100, unitCost: 18, updatedAt: new Date().toISOString() },
];

export const initialRecipes: RecipeItem[] = [
  // Zinger Max (Single)
  { id: 'rec-1', productId: 'prod-zinger-max', variantName: 'Single', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-2', productId: 'prod-zinger-max', variantName: 'Single', ingredientId: 'ing-chicken-fillet', quantity: 0.15 },
  { id: 'rec-3', productId: 'prod-zinger-max', variantName: 'Single', ingredientId: 'ing-mayo-sauce', quantity: 0.03 },
  { id: 'rec-4', productId: 'prod-zinger-max', variantName: 'Single', ingredientId: 'ing-breading', quantity: 0.04 },
  { id: 'rec-5', productId: 'prod-zinger-max', variantName: 'Single', ingredientId: 'ing-packaging', quantity: 1 },

  // Zinger Max (Double)
  { id: 'rec-6', productId: 'prod-zinger-max', variantName: 'Double', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-7', productId: 'prod-zinger-max', variantName: 'Double', ingredientId: 'ing-chicken-fillet', quantity: 0.28 },
  { id: 'rec-8', productId: 'prod-zinger-max', variantName: 'Double', ingredientId: 'ing-mayo-sauce', quantity: 0.05 },
  { id: 'rec-9', productId: 'prod-zinger-max', variantName: 'Double', ingredientId: 'ing-breading', quantity: 0.07 },
  { id: 'rec-10', productId: 'prod-zinger-max', variantName: 'Double', ingredientId: 'ing-packaging', quantity: 1 },

  // Chicken Filleto (Single / Double)
  { id: 'rec-11', productId: 'prod-chicken-filleto', variantName: 'Single', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-12', productId: 'prod-chicken-filleto', variantName: 'Single', ingredientId: 'ing-chicken-fillet', quantity: 0.13 },
  { id: 'rec-13', productId: 'prod-chicken-filleto', variantName: 'Single', ingredientId: 'ing-packaging', quantity: 1 },
  { id: 'rec-13b', productId: 'prod-chicken-filleto', variantName: 'Double', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-13c', productId: 'prod-chicken-filleto', variantName: 'Double', ingredientId: 'ing-chicken-fillet', quantity: 0.25 },

  // Crispy Wrap
  { id: 'rec-14', productId: 'prod-crispy-wrap', variantName: 'Standard', ingredientId: 'ing-tortilla', quantity: 1 },
  { id: 'rec-15', productId: 'prod-crispy-wrap', variantName: 'Standard', ingredientId: 'ing-chicken-fillet', quantity: 0.16 },
  { id: 'rec-16', productId: 'prod-crispy-wrap', variantName: 'Standard', ingredientId: 'ing-mayo-sauce', quantity: 0.04 },
  { id: 'rec-17', productId: 'prod-crispy-wrap', variantName: 'Standard', ingredientId: 'ing-packaging', quantity: 1 },

  // Zinger Shawarma
  { id: 'rec-18', productId: 'prod-zinger-shawarma', variantName: 'Standard', ingredientId: 'ing-pita', quantity: 1 },
  { id: 'rec-19', productId: 'prod-zinger-shawarma', variantName: 'Standard', ingredientId: 'ing-chicken-fillet', quantity: 0.12 },
  { id: 'rec-20', productId: 'prod-zinger-shawarma', variantName: 'Standard', ingredientId: 'ing-mayo-sauce', quantity: 0.03 },

  // Plain Fries (Half / Full)
  { id: 'rec-21', productId: 'prod-plain-fries', variantName: 'Half', ingredientId: 'ing-potatoes', quantity: 0.2 },
  { id: 'rec-22', productId: 'prod-plain-fries', variantName: 'Half', ingredientId: 'ing-packaging', quantity: 1 },
  { id: 'rec-23', productId: 'prod-plain-fries', variantName: 'Full', ingredientId: 'ing-potatoes', quantity: 0.4 },
  { id: 'rec-24', productId: 'prod-plain-fries', variantName: 'Full', ingredientId: 'ing-packaging', quantity: 1 },

  // Premium Fried Chicken (2Pcs / 4Pcs)
  { id: 'rec-25', productId: 'prod-pfc-premium', variantName: '2Pcs', ingredientId: 'ing-chicken-bone', quantity: 0.35 },
  { id: 'rec-26', productId: 'prod-pfc-premium', variantName: '2Pcs', ingredientId: 'ing-breading', quantity: 0.06 },
  { id: 'rec-27', productId: 'prod-pfc-premium', variantName: '2Pcs', ingredientId: 'ing-packaging', quantity: 1 },
  { id: 'rec-28', productId: 'prod-pfc-premium', variantName: '4Pcs', ingredientId: 'ing-chicken-bone', quantity: 0.70 },
  { id: 'rec-29', productId: 'prod-pfc-premium', variantName: '4Pcs', ingredientId: 'ing-breading', quantity: 0.12 },
  { id: 'rec-30', productId: 'prod-pfc-premium', variantName: '4Pcs', ingredientId: 'ing-packaging', quantity: 1 },

  // Hot Wings (5Pcs)
  { id: 'rec-31', productId: 'prod-hot-wings', variantName: '5Pcs', ingredientId: 'ing-chicken-wings', quantity: 0.25 },
  { id: 'rec-32', productId: 'prod-hot-wings', variantName: '5Pcs', ingredientId: 'ing-breading', quantity: 0.04 },

  // Zesty Crunch (Single / Double)
  { id: 'rec-33', productId: 'prod-zesty-crunch', variantName: 'Single', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-34', productId: 'prod-zesty-crunch', variantName: 'Single', ingredientId: 'ing-chicken-fillet', quantity: 0.14 },
  { id: 'rec-35', productId: 'prod-zesty-crunch', variantName: 'Single', ingredientId: 'ing-mayo-sauce', quantity: 0.03 },
  { id: 'rec-36', productId: 'prod-zesty-crunch', variantName: 'Double', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-37', productId: 'prod-zesty-crunch', variantName: 'Double', ingredientId: 'ing-chicken-fillet', quantity: 0.26 },
  { id: 'rec-38', productId: 'prod-zesty-crunch', variantName: 'Double', ingredientId: 'ing-mayo-sauce', quantity: 0.05 },

  // Reggy Burger
  { id: 'rec-39', productId: 'prod-reggy-burger', variantName: 'Single', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-40', productId: 'prod-reggy-burger', variantName: 'Single', ingredientId: 'ing-chicken-fillet', quantity: 0.10 },
  { id: 'rec-41', productId: 'prod-reggy-burger', variantName: 'Double', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-42', productId: 'prod-reggy-burger', variantName: 'Double', ingredientId: 'ing-chicken-fillet', quantity: 0.20 },

  // Chappli Burger
  { id: 'rec-43', productId: 'prod-chappli-burger', variantName: 'Single', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-44', productId: 'prod-chappli-burger', variantName: 'Single', ingredientId: 'ing-chicken-fillet', quantity: 0.12 },
  { id: 'rec-45', productId: 'prod-chappli-burger', variantName: 'Double', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-46', productId: 'prod-chappli-burger', variantName: 'Double', ingredientId: 'ing-chicken-fillet', quantity: 0.24 },

  // Premium Burgers
  { id: 'rec-47', productId: 'prod-mighty-duo', variantName: 'Standard', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-48', productId: 'prod-mighty-duo', variantName: 'Standard', ingredientId: 'ing-chicken-fillet', quantity: 0.25 },
  { id: 'rec-49', productId: 'prod-mighty-duo', variantName: 'Standard', ingredientId: 'ing-cheese-slices', quantity: 1 },
  { id: 'rec-50', productId: 'prod-double-stack', variantName: 'Standard', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-51', productId: 'prod-double-stack', variantName: 'Standard', ingredientId: 'ing-chicken-fillet', quantity: 0.28 },
  { id: 'rec-52', productId: 'prod-sizzler-smash', variantName: 'Standard', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-53', productId: 'prod-sizzler-smash', variantName: 'Standard', ingredientId: 'ing-chicken-fillet', quantity: 0.20 },
  { id: 'rec-54', productId: 'prod-melted-feast', variantName: 'Standard', ingredientId: 'ing-buns', quantity: 1 },
  { id: 'rec-55', productId: 'prod-melted-feast', variantName: 'Standard', ingredientId: 'ing-chicken-fillet', quantity: 0.22 },
  { id: 'rec-56', productId: 'prod-melted-feast', variantName: 'Standard', ingredientId: 'ing-cheese-slices', quantity: 2 },

  // Other Wraps & Shawarmas
  { id: 'rec-57', productId: 'prod-sizzler-wrap', variantName: 'Standard', ingredientId: 'ing-tortilla', quantity: 1 },
  { id: 'rec-58', productId: 'prod-sizzler-wrap', variantName: 'Standard', ingredientId: 'ing-chicken-fillet', quantity: 0.18 },
  { id: 'rec-59', productId: 'prod-prime-fold-wrap', variantName: 'Standard', ingredientId: 'ing-tortilla', quantity: 1 },
  { id: 'rec-60', productId: 'prod-prime-fold-wrap', variantName: 'Standard', ingredientId: 'ing-chicken-fillet', quantity: 0.22 },
  { id: 'rec-61', productId: 'prod-dynamite-shawarma', variantName: 'Standard', ingredientId: 'ing-pita', quantity: 1 },
  { id: 'rec-62', productId: 'prod-dynamite-shawarma', variantName: 'Standard', ingredientId: 'ing-chicken-fillet', quantity: 0.12 },
  { id: 'rec-63', productId: 'prod-cheesy-rush-shawarma', variantName: 'Standard', ingredientId: 'ing-pita', quantity: 1 },
  { id: 'rec-64', productId: 'prod-cheesy-rush-shawarma', variantName: 'Standard', ingredientId: 'ing-chicken-fillet', quantity: 0.14 },
  { id: 'rec-65', productId: 'prod-cheesy-rush-shawarma', variantName: 'Standard', ingredientId: 'ing-cheese-slices', quantity: 1 },

  // Fries
  { id: 'rec-66', productId: 'prod-masala-fries', variantName: 'Half', ingredientId: 'ing-potatoes', quantity: 0.2 },
  { id: 'rec-67', productId: 'prod-masala-fries', variantName: 'Full', ingredientId: 'ing-potatoes', quantity: 0.4 },
  { id: 'rec-68', productId: 'prod-mayo-fries', variantName: 'Half', ingredientId: 'ing-potatoes', quantity: 0.2 },
  { id: 'rec-69', productId: 'prod-mayo-fries', variantName: 'Full', ingredientId: 'ing-potatoes', quantity: 0.4 },
  { id: 'rec-70', productId: 'prod-loaded-fries', variantName: 'Half', ingredientId: 'ing-potatoes', quantity: 0.25 },
  { id: 'rec-71', productId: 'prod-loaded-fries', variantName: 'Half', ingredientId: 'ing-chicken-fillet', quantity: 0.08 },
  { id: 'rec-72', productId: 'prod-loaded-fries', variantName: 'Full', ingredientId: 'ing-potatoes', quantity: 0.45 },
  { id: 'rec-73', productId: 'prod-loaded-fries', variantName: 'Full', ingredientId: 'ing-chicken-fillet', quantity: 0.15 },
  { id: 'rec-74', productId: 'prod-cheesy-melt-fries', variantName: 'Half', ingredientId: 'ing-potatoes', quantity: 0.25 },
  { id: 'rec-75', productId: 'prod-cheesy-melt-fries', variantName: 'Full', ingredientId: 'ing-potatoes', quantity: 0.45 },

  // Fried Chicken & Wings
  { id: 'rec-76', productId: 'prod-chicken-nuggets', variantName: '5Pcs', ingredientId: 'ing-chicken-fillet', quantity: 0.12 },
  { id: 'rec-77', productId: 'prod-chicken-nuggets', variantName: '10Pcs', ingredientId: 'ing-chicken-fillet', quantity: 0.24 },
  { id: 'rec-78', productId: 'prod-arabian-nuggets', variantName: '5Pcs', ingredientId: 'ing-chicken-fillet', quantity: 0.14 },
  { id: 'rec-79', productId: 'prod-arabian-nuggets', variantName: '10Pcs', ingredientId: 'ing-chicken-fillet', quantity: 0.28 },
  { id: 'rec-80', productId: 'prod-hot-shots', variantName: '5Pcs', ingredientId: 'ing-chicken-fillet', quantity: 0.12 },
  { id: 'rec-81', productId: 'prod-hot-shots', variantName: '10Pcs', ingredientId: 'ing-chicken-fillet', quantity: 0.24 },
  { id: 'rec-82', productId: 'prod-spicy-tenders', variantName: '5Pcs', ingredientId: 'ing-chicken-fillet', quantity: 0.20 },
  { id: 'rec-83', productId: 'prod-spicy-tenders', variantName: '10Pcs', ingredientId: 'ing-chicken-fillet', quantity: 0.40 },
  { id: 'rec-84', productId: 'prod-juicy-tenders', variantName: '5Pcs', ingredientId: 'ing-chicken-fillet', quantity: 0.22 },
  { id: 'rec-85', productId: 'prod-juicy-tenders', variantName: '10Pcs', ingredientId: 'ing-chicken-fillet', quantity: 0.44 },
  { id: 'rec-86', productId: 'prod-mega-bucket', variantName: 'Standard', ingredientId: 'ing-chicken-bone', quantity: 1.8 },
  { id: 'rec-87', productId: 'prod-mega-bucket', variantName: 'Standard', ingredientId: 'ing-potatoes', quantity: 0.4 },

  { id: 'rec-88', productId: 'prod-bbq-wings', variantName: '5Pcs', ingredientId: 'ing-chicken-wings', quantity: 0.25 },
  { id: 'rec-89', productId: 'prod-bbq-wings', variantName: '10Pcs', ingredientId: 'ing-chicken-wings', quantity: 0.50 },
  { id: 'rec-90', productId: 'prod-loaded-wings', variantName: '5Pcs', ingredientId: 'ing-chicken-wings', quantity: 0.25 },
  { id: 'rec-91', productId: 'prod-loaded-wings', variantName: '10Pcs', ingredientId: 'ing-chicken-wings', quantity: 0.50 },

  // Quesadillas
  { id: 'rec-92', productId: 'prod-cheesy-quesadillas', variantName: 'Standard', ingredientId: 'ing-tortilla', quantity: 2 },
  { id: 'rec-93', productId: 'prod-cheesy-quesadillas', variantName: 'Standard', ingredientId: 'ing-chicken-fillet', quantity: 0.18 },
  { id: 'rec-94', productId: 'prod-cheesy-quesadillas', variantName: 'Standard', ingredientId: 'ing-cheese-slices', quantity: 2 },
];

export const initialSuppliers: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Al-Madina Poultry Farm',
    contactPerson: 'Haji Aslam',
    phone: '03009876543',
    company: 'Fresh Poultry Wholesale',
    address: 'Grain Market Sector B',
    currentDue: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sup-2',
    name: 'Dawn Bakeries & Buns',
    contactPerson: 'Tariq Mehmood',
    phone: '03214567890',
    company: 'Dawn Bread Commercial Dist.',
    address: 'Industrial Area Unit 4',
    currentDue: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sup-3',
    name: 'Pak Packaging Mart',
    contactPerson: 'Faisal Khan',
    phone: '03337654321',
    company: 'Food Grade Box Supplies',
    address: 'Commercial Block 2',
    currentDue: 0,
    createdAt: new Date().toISOString(),
  },
];

export const initialStaff: Staff[] = [
  {
    id: 'staff-1',
    name: 'Hamza Tariq',
    role: 'Head Chef',
    phone: '03121112233',
    salary: 45000,
    joinDate: '2026-01-01',
    active: true,
  },
  {
    id: 'staff-2',
    name: 'Bilal Ahmed',
    role: 'Kitchen Assistant',
    phone: '03132223344',
    salary: 35000,
    joinDate: '2026-01-15',
    active: true,
  },
  {
    id: 'staff-3',
    name: 'Usman Ali',
    role: 'Cashier',
    phone: '03143334455',
    salary: 32000,
    joinDate: '2026-02-01',
    active: true,
  },
];

export const initialCustomers: Customer[] = [
  {
    id: 'cust-walkin',
    name: 'Walk-in Customer',
    phone: '00000000000',
    address: 'Tokyo Crunch Counter',
    totalOrders: 0,
    totalSpent: 0,
    currentDue: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-1',
    name: 'Dr. Zeeshan',
    phone: '03001234888',
    address: 'House 42, Street 3, Ittfaq City',
    totalOrders: 3,
    totalSpent: 4200,
    currentDue: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
