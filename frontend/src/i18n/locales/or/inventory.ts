const inventory = {
  // ── InventoryListScreen ─────────────────────────────────────────────────────
  title: 'ଇନ୍‌ଭେଣ୍ଟୋରି',
  errorTitle: 'ଇନ୍‌ଭେଣ୍ଟୋରି ଲୋଡ ହୋଇ ପାରିଲା ନାହିଁ',

  // Category filter tabs
  catAll: 'ସବୁ',
  catFeed: 'ଖାଦ୍ୟ',
  catChemicals: 'ରାସାୟନିକ',
  catEquipment: 'ଯନ୍ତ୍ରପାତି',
  catOther: 'ଅନ୍ୟ',

  // Stock status badges
  outOfStock: 'ଷ୍ଟକ ଶେଷ',
  lowStock: 'ସ୍ୱଳ୍ପ ଷ୍ଟକ',
  inStock: 'ଷ୍ଟକ ଉପଲବ୍ଧ',

  // Item footer
  minLabel: 'ସର୍ବନିମ୍ନ:',

  // Empty state
  emptyTitle: 'ଇନ୍‌ଭେଣ୍ଟୋରି ଆଇଟମ ନାହିଁ',
  emptySubtitle: 'ଆପଣଙ୍କ ଖାଦ୍ୟ, ରାସାୟନିକ ଓ ଯନ୍ତ୍ରପାତି ଷ୍ଟକ ଟ୍ରାକ ଆରମ୍ଭ କରନ୍ତୁ।',

  // Add-item alert (coming soon)
  addItem: 'ଆଇଟମ ଯୋଡ଼ନ୍ତୁ',
  addItemComingSoon: 'ଇନ୍‌ଭେଣ୍ଟୋରି ଆଇଟମ ତୈରି ସୁବିଧା ଶୀଘ୍ର ଆସୁଛି!',

  // ── InventoryDetailScreen ───────────────────────────────────────────────────
  // Header fallback
  inventoryItemFallback: 'ଇନ୍‌ଭେଣ୍ଟୋରି ଆଇଟମ',

  // Error state
  itemNotFound: 'ଆଇଟମ ମିଳିଲା ନାହିଁ',
  loadItemError: 'ଇନ୍‌ଭେଣ୍ଟୋରି ଆଇଟମ ଲୋଡ ବିଫଳ',

  // Stock card
  currentStock: 'ବର୍ତ୍ତମାନ ଷ୍ଟକ',
  minimumThreshold: 'ସର୍ବନିମ୍ନ ସୀମା: {{count}} {{unit}}',

  // Info card labels
  labelCategory: 'ବର୍ଗ',
  labelUnit: 'ୟୁନିଟ',
  labelLastPurchase: 'ଶେଷ କ୍ରୟ',
  labelNotes: 'ଟୀକା',

  // Adjust stock
  adjustStock: 'ଷ୍ଟକ ସଂଶୋଧନ',
  adjustStockChoose: 'ଏକ ବିକଳ୍ପ ବାଛନ୍ତୁ',
  addStock: 'ଷ୍ଟକ ଯୋଡ଼ନ୍ତୁ',
  reduceStock: 'ଷ୍ଟକ କମ',
  comingSoon: 'ଶୀଘ୍ର ଆସୁଛି',
  stockAdjustComingSoon: 'ଷ୍ଟକ ସଂଶୋଧନ ସୁବିଧା ଶୀଘ୍ର ଆସୁଛି!',
  editComingSoon: 'ଇନ୍‌ଭେଣ୍ଟୋରି ଆଇଟମ ସଂପାଦନ ସୁବିଧା ଶୀଘ୍ର ଆସୁଛି!',

  // Stock history section
  stockHistory: 'ଷ୍ଟକ ଇତିହାସ',
  stockHistoryComingSoon: 'ଷ୍ଟକ ସଂଶୋଧନ ଇତିହାସ ଶୀଘ୍ର ଆସୁଛି',

  // ── ShopScreen ──────────────────────────────────────────────────────────────
  shopTitle: 'ଦୋକାନ',
  shopErrorTitle: 'ଉତ୍ପାଦ ଲୋଡ ହୋଇ ପାରିଲା ନାହିଁ',

  // Category chip — dynamic key derived from API, static "All"
  catAllShop: 'ସବୁ',

  // Stock badges
  shopOutOfStock: 'ଷ୍ଟକ ଶେଷ',
  shopUnavailable: 'ଉପଲବ୍ଧ ନାହିଁ',
  shopStockCount: 'ଷ୍ଟକ: {{count}}',

  // Empty state
  shopEmptyTitle: 'ଉତ୍ପାଦ ନାହିଁ',
  shopEmptySubtitle: 'ଏହି ବର୍ଗରେ ଏବେ କୌଣସି ଉତ୍ପାଦ ଉପଲବ୍ଧ ନାହିଁ।',

  // ── FeedProductsScreen ──────────────────────────────────────────────────────
  feedProductsTitle: 'ଖାଦ୍ୟ ଉତ୍ପାଦ',
  feedErrorTitle: 'ଖାଦ୍ୟ ଉତ୍ପାଦ ଲୋଡ ହୋଇ ପାରିଲା ନାହିଁ',

  // Protein badge
  proteinLabel: 'ପ୍ରୋଟିନ',

  // Empty state
  feedEmptyTitle: 'ଖାଦ୍ୟ ଉତ୍ପାଦ ନାହିଁ',
  feedEmptySubtitle: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଖାଦ୍ୟ ଉତ୍ପାଦ ରେକର୍ଡ ଉପଲବ୍ଧ ନାହିଁ।',
};
export default inventory;
