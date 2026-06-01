const finance = {
  // ── ExpensesScreen ──────────────────────────────────────────────────────────
  expensesTitle: 'செலவுகள்',

  // Cycle financials summary card
  cycleFinancials: 'சுழற்சி நிதி விவரம்',
  totalRevenue: 'மொத்த வருவாய்',
  totalExpenses: 'மொத்த செலவுகள்',
  netProfit: 'நிகர லாபம்',
  marginPercent: 'லாப விகிதம் %',
  expensesByCategory: 'வகை வாரியான செலவுகள்',

  // Add-expense form
  addExpense: 'செலவு சேர்',
  fieldAmount: 'தொகை',
  placeholderAmount: '0.00',
  fieldPondId: 'குளம் ID',
  placeholderPondId: 'குளம் ID உள்ளிடுக',
  fieldDate: 'தேதி',
  placeholderDate: 'YYYY-MM-DD',
  fieldCategory: 'வகை',
  fieldNotes: 'குறிப்புகள்',
  placeholderNotes: 'விருப்பத்தேர்வு விவரம்',
  saveExpense: 'செலவை சேமி',

  // Validation alerts
  validationError: 'சரிபார்ப்பு பிழை',
  validAmountRequired: 'சரியான தொகையை உள்ளிடவும்',
  dateRequired: 'தேதி தேவை',
  pondIdRequired: 'குளம் ID தேவை',
  saveError: 'செலவை சேமிக்க முடியவில்லை',

  // List
  allExpenses: 'அனைத்து செலவுகளும்',

  // Empty / loading states
  loadingExpenses: 'செலவுகளை ஏற்றுகிறது…',
  noExpensesTitle: 'செலவுகள் இன்னும் இல்லை',
  noExpensesSubtitle: 'இந்த சுழற்சியின் முதல் செலவை பதிவு செய்ய + ஐ தட்டுக.',

  // ── TransactionsScreen ──────────────────────────────────────────────────────
  transactionsTitle: 'பரிவர்த்தனைகள்',
  transactionsTitleWithFarm: '{{farmName}} — பரிவர்த்தனைகள்',

  // Summary card
  financialSummary: 'நிதி சுருக்கம்',
  totalIncome: 'மொத்த வருமானம்',
  totalExpense: 'மொத்த செலவு',

  // Filter chips
  filterAll: 'அனைத்தும்',
  filterIncome: 'வருமானம்',
  filterExpense: 'செலவு',

  // Add-transaction toggle / form
  addTransaction: 'பரிவர்த்தனை சேர்',
  closeForm: 'படிவம் மூடு',
  typeIncome: 'வருமானம்',
  typeExpense: 'செலவு',
  fieldAmountLabel: 'தொகை (₹) *',
  fieldCategoryLabel: 'வகை *',
  placeholderCategory: 'எ.கா. மீன் விற்பனை, தீவனம்',
  fieldDescriptionLabel: 'விவரிப்பு',
  placeholderDescription: 'விருப்பத்தேர்வு குறிப்புகள்',
  fieldDateLabel: 'தேதி (YYYY-MM-DD) *',
  placeholderDateAlt: '2025-01-01',

  // Validation errors (inline)
  categoryRequired: 'வகை தேவை.',
  validPositiveAmount: 'சரியான நேர்மறை தொகையை உள்ளிடுக.',
  dateRequiredDot: 'தேதி தேவை.',
  saveTransactionError: 'பரிவர்த்தனை சேர்க்க முடியவில்லை.',

  // Loading / empty
  loadingTransactions: 'பரிவர்த்தனைகளை ஏற்றுகிறது…',
  noTransactionsTitle: 'பரிவர்த்தனைகள் இல்லை',
  noTransactionsSubtitle: 'பண்ணை நிதியை கண்காணிக்கத் தொடங்க முதல் வருமானம் அல்லது செலவை சேர்க்கவும்.',
  loadError: 'பரிவர்த்தனைகளை ஏற்ற முடியவில்லை.',
};
export default finance;
