const inventory = {
  // ── InventoryListScreen ─────────────────────────────────────────────────────
  title: 'Inventory',
  errorTitle: "Couldn't Load Inventory",

  // Category filter tabs
  catAll: 'All',
  catFeed: 'Feed',
  catChemicals: 'Chemicals',
  catEquipment: 'Equipment',
  catOther: 'Other',

  // Stock status badges
  outOfStock: 'Out of Stock',
  lowStock: 'Low Stock',
  inStock: 'In Stock',

  // Item footer
  minLabel: 'Min:',

  // Empty state
  emptyTitle: 'No Inventory Items',
  emptySubtitle: 'Start tracking your feed, chemicals, and equipment stock.',

  // Add-item alert (coming soon)
  addItem: 'Add Item',
  addItemComingSoon: 'Create inventory item functionality coming soon!',

  // ── InventoryDetailScreen ───────────────────────────────────────────────────
  // Header fallback
  inventoryItemFallback: 'Inventory Item',

  // Error state
  itemNotFound: 'Item not found',
  loadItemError: 'Failed to load inventory item',

  // Stock card
  currentStock: 'Current Stock',
  minimumThreshold: 'Minimum threshold: {{count}} {{unit}}',

  // Info card labels
  labelCategory: 'Category',
  labelUnit: 'Unit',
  labelLastPurchase: 'Last Purchase',
  labelNotes: 'Notes',

  // Adjust stock
  adjustStock: 'Adjust Stock',
  adjustStockChoose: 'Choose an action',
  addStock: 'Add Stock',
  reduceStock: 'Reduce Stock',
  comingSoon: 'Coming Soon',
  stockAdjustComingSoon: 'Stock adjustment feature coming soon!',
  editComingSoon: 'Edit inventory item feature coming soon!',

  // Stock history section
  stockHistory: 'Stock History',
  stockHistoryComingSoon: 'Stock adjustment history coming soon',

  // ── ShopScreen ──────────────────────────────────────────────────────────────
  shopTitle: 'Shop',
  shopErrorTitle: "Couldn't Load Products",

  // Category chip — dynamic key derived from API, static "All"
  catAllShop: 'All',

  // Stock badges
  shopOutOfStock: 'Out of Stock',
  shopUnavailable: 'Unavailable',
  shopStockCount: 'Stock: {{count}}',

  // Empty state
  shopEmptyTitle: 'No Products',
  shopEmptySubtitle: 'No products are available in this category right now.',

  // ── FeedProductsScreen ──────────────────────────────────────────────────────
  feedProductsTitle: 'Feed Products',
  feedErrorTitle: "Couldn't Load Feed Products",

  // Protein badge
  proteinLabel: 'Protein',

  // Empty state
  feedEmptyTitle: 'No Feed Products',
  feedEmptySubtitle: 'No feed product records are available yet.',
};
export default inventory;
