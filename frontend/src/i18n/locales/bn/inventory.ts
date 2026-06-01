const inventory = {
  // ── InventoryListScreen ─────────────────────────────────────────────────────
  title: 'ইনভেন্টরি',
  errorTitle: 'ইনভেন্টরি লোড করা যায়নি',

  // Category filter tabs
  catAll: 'সব',
  catFeed: 'খাদ্য',
  catChemicals: 'রাসায়নিক',
  catEquipment: 'সরঞ্জাম',
  catOther: 'অন্যান্য',

  // Stock status badges
  outOfStock: 'স্টক শেষ',
  lowStock: 'কম স্টক',
  inStock: 'স্টক আছে',

  // Item footer
  minLabel: 'সর্বনিম্ন:',

  // Empty state
  emptyTitle: 'কোনো ইনভেন্টরি আইটেম নেই',
  emptySubtitle: 'আপনার খাদ্য, রাসায়নিক ও সরঞ্জামের স্টক ট্র্যাক শুরু করুন।',

  // Add-item alert (coming soon)
  addItem: 'আইটেম যোগ করুন',
  addItemComingSoon: 'ইনভেন্টরি আইটেম তৈরির সুবিধা শীঘ্রই আসছে!',

  // ── InventoryDetailScreen ───────────────────────────────────────────────────
  // Header fallback
  inventoryItemFallback: 'ইনভেন্টরি আইটেম',

  // Error state
  itemNotFound: 'আইটেম পাওয়া যায়নি',
  loadItemError: 'ইনভেন্টরি আইটেম লোড করতে ব্যর্থ',

  // Stock card
  currentStock: 'বর্তমান স্টক',
  minimumThreshold: 'সর্বনিম্ন সীমা: {{count}} {{unit}}',

  // Info card labels
  labelCategory: 'বিভাগ',
  labelUnit: 'একক',
  labelLastPurchase: 'সর্বশেষ ক্রয়',
  labelNotes: 'নোট',

  // Adjust stock
  adjustStock: 'স্টক সামঞ্জস্য করুন',
  adjustStockChoose: 'একটি ক্রিয়া বেছে নিন',
  addStock: 'স্টক যোগ করুন',
  reduceStock: 'স্টক কমান',
  comingSoon: 'শীঘ্রই আসছে',
  stockAdjustComingSoon: 'স্টক সামঞ্জস্যের সুবিধা শীঘ্রই আসছে!',
  editComingSoon: 'ইনভেন্টরি আইটেম সম্পাদনার সুবিধা শীঘ্রই আসছে!',

  // Stock history section
  stockHistory: 'স্টকের ইতিহাস',
  stockHistoryComingSoon: 'স্টক সামঞ্জস্যের ইতিহাস শীঘ্রই আসছে',

  // ── ShopScreen ──────────────────────────────────────────────────────────────
  shopTitle: 'শপ',
  shopErrorTitle: 'পণ্য লোড করা যায়নি',

  // Category chip — dynamic key derived from API, static "All"
  catAllShop: 'সব',

  // Stock badges
  shopOutOfStock: 'স্টক শেষ',
  shopUnavailable: 'অনুপলব্ধ',
  shopStockCount: 'স্টক: {{count}}',

  // Empty state
  shopEmptyTitle: 'কোনো পণ্য নেই',
  shopEmptySubtitle: 'এই বিভাগে এখন কোনো পণ্য পাওয়া যাচ্ছে না।',

  // ── FeedProductsScreen ──────────────────────────────────────────────────────
  feedProductsTitle: 'খাদ্য পণ্য',
  feedErrorTitle: 'খাদ্য পণ্য লোড করা যায়নি',

  // Protein badge
  proteinLabel: 'প্রোটিন',

  // Empty state
  feedEmptyTitle: 'কোনো খাদ্য পণ্য নেই',
  feedEmptySubtitle: 'এখনও কোনো খাদ্য পণ্যের রেকর্ড পাওয়া যায়নি।',
};
export default inventory;
