const inventory = {
  // ── InventoryListScreen ─────────────────────────────────────────────────────
  title: 'சரக்கு பட்டியல்',
  errorTitle: 'சரக்கு பட்டியலை ஏற்ற முடியவில்லை',

  // Category filter tabs
  catAll: 'அனைத்தும்',
  catFeed: 'தீவனம்',
  catChemicals: 'இரசாயனங்கள்',
  catEquipment: 'உபகரணங்கள்',
  catOther: 'மற்றவை',

  // Stock status badges
  outOfStock: 'இருப்பு இல்லை',
  lowStock: 'குறைந்த இருப்பு',
  inStock: 'இருப்பு உள்ளது',

  // Item footer
  minLabel: 'குறைந்தபட்சம்:',

  // Empty state
  emptyTitle: 'சரக்கு பட்டியல் உருப்படிகள் இல்லை',
  emptySubtitle: 'உங்கள் தீவனம், இரசாயனங்கள் மற்றும் உபகரண இருப்பை கண்காணிக்கத் தொடங்குங்கள்.',

  // Add-item alert (coming soon)
  addItem: 'உருப்படி சேர்',
  addItemComingSoon: 'சரக்கு உருப்படி உருவாக்கும் வசதி விரைவில் வருகிறது!',

  // ── InventoryDetailScreen ───────────────────────────────────────────────────
  // Header fallback
  inventoryItemFallback: 'சரக்கு உருப்படி',

  // Error state
  itemNotFound: 'உருப்படி கிடைக்கவில்லை',
  loadItemError: 'சரக்கு உருப்படியை ஏற்ற முடியவில்லை',

  // Stock card
  currentStock: 'தற்போதைய இருப்பு',
  minimumThreshold: 'குறைந்தபட்ச வரம்பு: {{count}} {{unit}}',

  // Info card labels
  labelCategory: 'வகை',
  labelUnit: 'அலகு',
  labelLastPurchase: 'கடைசி கொள்முதல்',
  labelNotes: 'குறிப்புகள்',

  // Adjust stock
  adjustStock: 'இருப்பை சரிசெய்',
  adjustStockChoose: 'ஒரு செயலை தேர்ந்தெடு',
  addStock: 'இருப்பு சேர்',
  reduceStock: 'இருப்பு குறை',
  comingSoon: 'விரைவில் வருகிறது',
  stockAdjustComingSoon: 'இருப்பு சரிசெய்யும் வசதி விரைவில் வருகிறது!',
  editComingSoon: 'சரக்கு உருப்படி திருத்தும் வசதி விரைவில் வருகிறது!',

  // Stock history section
  stockHistory: 'இருப்பு வரலாறு',
  stockHistoryComingSoon: 'இருப்பு சரிசெய்வு வரலாறு விரைவில் வருகிறது',

  // ── ShopScreen ──────────────────────────────────────────────────────────────
  shopTitle: 'கடை',
  shopErrorTitle: 'பொருட்களை ஏற்ற முடியவில்லை',

  // Category chip — dynamic key derived from API, static "All"
  catAllShop: 'அனைத்தும்',

  // Stock badges
  shopOutOfStock: 'இருப்பு இல்லை',
  shopUnavailable: 'கிடைக்கவில்லை',
  shopStockCount: 'இருப்பு: {{count}}',

  // Empty state
  shopEmptyTitle: 'பொருட்கள் இல்லை',
  shopEmptySubtitle: 'இப்போது இந்த வகையில் பொருட்கள் எதுவும் கிடைக்கவில்லை.',

  // ── FeedProductsScreen ──────────────────────────────────────────────────────
  feedProductsTitle: 'தீவன பொருட்கள்',
  feedErrorTitle: 'தீவன பொருட்களை ஏற்ற முடியவில்லை',

  // Protein badge
  proteinLabel: 'புரதம்',

  // Empty state
  feedEmptyTitle: 'தீவன பொருட்கள் இல்லை',
  feedEmptySubtitle: 'தீவன பொருள் பதிவுகள் இன்னும் கிடைக்கவில்லை.',
};
export default inventory;
