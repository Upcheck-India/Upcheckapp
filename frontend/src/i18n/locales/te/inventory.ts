const inventory = {
  // ── InventoryListScreen ─────────────────────────────────────────────────────
  title: 'ఇన్వెంటరీ',
  errorTitle: 'ఇన్వెంటరీ లోడ్ కాలేదు',

  // Category filter tabs
  catAll: 'అన్నీ',
  catFeed: 'దాణా',
  catChemicals: 'రసాయనాలు',
  catEquipment: 'పరికరాలు',
  catOther: 'ఇతర',

  // Stock status badges
  outOfStock: 'స్టాక్ అయిపోయింది',
  lowStock: 'తక్కువ స్టాక్',
  inStock: 'స్టాక్ ఉంది',

  // Item footer
  minLabel: 'కనీసం:',

  // Empty state
  emptyTitle: 'ఇన్వెంటరీ అంశాలు లేవు',
  emptySubtitle: 'మీ దాణా, రసాయనాలు మరియు పరికరాల స్టాక్ ట్రాక్ చేయడం ప్రారంభించండి.',

  // Add-item alert (coming soon)
  addItem: 'అంశం జోడించు',
  addItemComingSoon: 'ఇన్వెంటరీ అంశం సృష్టించే ఫీచర్ త్వరలో వస్తోంది!',

  // ── InventoryDetailScreen ───────────────────────────────────────────────────
  // Header fallback
  inventoryItemFallback: 'ఇన్వెంటరీ అంశం',

  // Error state
  itemNotFound: 'అంశం కనుగొనబడలేదు',
  loadItemError: 'ఇన్వెంటరీ అంశం లోడ్ చేయడం విఫలమైంది',

  // Stock card
  currentStock: 'ప్రస్తుత స్టాక్',
  minimumThreshold: 'కనీస పరిమితి: {{count}} {{unit}}',

  // Info card labels
  labelCategory: 'వర్గం',
  labelUnit: 'యూనిట్',
  labelLastPurchase: 'చివరి కొనుగోలు',
  labelNotes: 'గమనికలు',

  // Adjust stock
  adjustStock: 'స్టాక్ సర్దుబాటు చేయి',
  adjustStockChoose: 'చర్య ఎంచుకోండి',
  addStock: 'స్టాక్ జోడించు',
  reduceStock: 'స్టాక్ తగ్గించు',
  comingSoon: 'త్వరలో వస్తోంది',
  stockAdjustComingSoon: 'స్టాక్ సర్దుబాటు ఫీచర్ త్వరలో వస్తోంది!',
  editComingSoon: 'ఇన్వెంటరీ అంశం సవరించే ఫీచర్ త్వరలో వస్తోంది!',

  // Stock history section
  stockHistory: 'స్టాక్ చరిత్ర',
  stockHistoryComingSoon: 'స్టాక్ సర్దుబాటు చరిత్ర త్వరలో వస్తోంది',

  // ── ShopScreen ──────────────────────────────────────────────────────────────
  shopTitle: 'దుకాణం',
  shopErrorTitle: 'ఉత్పత్తులు లోడ్ కాలేదు',

  // Category chip — dynamic key derived from API, static "All"
  catAllShop: 'అన్నీ',

  // Stock badges
  shopOutOfStock: 'స్టాక్ అయిపోయింది',
  shopUnavailable: 'అందుబాటులో లేదు',
  shopStockCount: 'స్టాక్: {{count}}',

  // Empty state
  shopEmptyTitle: 'ఉత్పత్తులు లేవు',
  shopEmptySubtitle: 'ఈ వర్గంలో ఇప్పుడు ఉత్పత్తులు అందుబాటులో లేవు.',

  // ── FeedProductsScreen ──────────────────────────────────────────────────────
  feedProductsTitle: 'దాణా ఉత్పత్తులు',
  feedErrorTitle: 'దాణా ఉత్పత్తులు లోడ్ కాలేదు',

  // Protein badge
  proteinLabel: 'ప్రోటీన్',

  // Empty state
  feedEmptyTitle: 'దాణా ఉత్పత్తులు లేవు',
  feedEmptySubtitle: 'ఇంకా దాణా ఉత్పత్తి రికార్డులు అందుబాటులో లేవు.',
};
export default inventory;
