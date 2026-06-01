const inventory = {
  // ── InventoryListScreen ─────────────────────────────────────────────────────
  title: 'इन्वेंटरी',
  errorTitle: 'इन्वेंटरी लोड नहीं हो सकी',

  // Category filter tabs
  catAll: 'सभी',
  catFeed: 'आहार',
  catChemicals: 'रसायन',
  catEquipment: 'उपकरण',
  catOther: 'अन्य',

  // Stock status badges
  outOfStock: 'स्टॉक समाप्त',
  lowStock: 'कम स्टॉक',
  inStock: 'स्टॉक में है',

  // Item footer
  minLabel: 'न्यूनतम:',

  // Empty state
  emptyTitle: 'कोई इन्वेंटरी आइटम नहीं',
  emptySubtitle: 'अपने आहार, रसायन और उपकरण स्टॉक ट्रैक करना शुरू करें।',

  // Add-item alert (coming soon)
  addItem: 'आइटम जोड़ें',
  addItemComingSoon: 'इन्वेंटरी आइटम बनाने की सुविधा जल्द आ रही है!',

  // ── InventoryDetailScreen ───────────────────────────────────────────────────
  // Header fallback
  inventoryItemFallback: 'इन्वेंटरी आइटम',

  // Error state
  itemNotFound: 'आइटम नहीं मिला',
  loadItemError: 'इन्वेंटरी आइटम लोड करने में विफल',

  // Stock card
  currentStock: 'वर्तमान स्टॉक',
  minimumThreshold: 'न्यूनतम सीमा: {{count}} {{unit}}',

  // Info card labels
  labelCategory: 'श्रेणी',
  labelUnit: 'इकाई',
  labelLastPurchase: 'अंतिम खरीद',
  labelNotes: 'नोट्स',

  // Adjust stock
  adjustStock: 'स्टॉक समायोजित करें',
  adjustStockChoose: 'एक क्रिया चुनें',
  addStock: 'स्टॉक जोड़ें',
  reduceStock: 'स्टॉक घटाएं',
  comingSoon: 'जल्द आ रहा है',
  stockAdjustComingSoon: 'स्टॉक समायोजन सुविधा जल्द आ रही है!',
  editComingSoon: 'इन्वेंटरी आइटम संपादन सुविधा जल्द आ रही है!',

  // Stock history section
  stockHistory: 'स्टॉक इतिहास',
  stockHistoryComingSoon: 'स्टॉक समायोजन इतिहास जल्द आ रहा है',

  // ── ShopScreen ──────────────────────────────────────────────────────────────
  shopTitle: 'दुकान',
  shopErrorTitle: 'उत्पाद लोड नहीं हो सके',

  // Category chip — dynamic key derived from API, static "All"
  catAllShop: 'सभी',

  // Stock badges
  shopOutOfStock: 'स्टॉक समाप्त',
  shopUnavailable: 'अनुपलब्ध',
  shopStockCount: 'स्टॉक: {{count}}',

  // Empty state
  shopEmptyTitle: 'कोई उत्पाद नहीं',
  shopEmptySubtitle: 'इस श्रेणी में अभी कोई उत्पाद उपलब्ध नहीं है।',

  // ── FeedProductsScreen ──────────────────────────────────────────────────────
  feedProductsTitle: 'आहार उत्पाद',
  feedErrorTitle: 'आहार उत्पाद लोड नहीं हो सके',

  // Protein badge
  proteinLabel: 'प्रोटीन',

  // Empty state
  feedEmptyTitle: 'कोई आहार उत्पाद नहीं',
  feedEmptySubtitle: 'अभी कोई आहार उत्पाद रिकॉर्ड उपलब्ध नहीं है।',
};
export default inventory;
