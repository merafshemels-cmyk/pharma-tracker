// Interface translations. English is the source of truth; every other
// language falls back to English when a key is missing. Values can be a
// string with {placeholders} or a function that receives the params object.
export const SUPPORTED_LANGUAGES = ['en', 'am']

const en = {
  // Shared
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.save': 'Save',
  'common.view': 'View',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.remove': 'Remove',
  'common.confirm': 'Confirm',
  'common.unknown': '—',

  // App shell
  'app.loadingPharmacy': 'Loading your pharmacy…',
  'app.loadingRecords': 'Loading pharmacy records…',
  'app.skipToContent': 'Skip to content',
  'brand.subtitle': 'Pharmacy management',

  // Navigation
  'nav.aria': 'Sidebar navigation',
  'nav.close': 'Close navigation',
  'nav.main': 'Main',
  'nav.menu': 'Menu',
  'nav.dashboard': 'Dashboard',
  'nav.sales': 'Sales',
  'nav.inventory': 'Inventory',
  'nav.purchases': 'Purchases',
  'nav.packaging': 'Packaging',
  'nav.expiry': 'Expiry Management',
  'nav.reports': 'Reports',
  'nav.staff': 'Staff',
  'nav.settings': 'Settings',
  'nav.workspace': 'Pharmacy workspace',
  'nav.signedInAs': 'Signed in as {role}',
  'nav.footerText':
    'Stock, sales, and permissions are connected to your pharmacy records.',

  // Header
  'header.openNav': 'Open navigation',
  'header.searchPlaceholder': 'Search inventory by medicine name',
  'header.signOut': 'Sign out',

  // Roles
  'role.owner': 'Owner',
  'role.cashier': 'Cashier',

  // Dashboard
  'dashboard.title': 'Dashboard',
  'dashboard.subtitle': '{pharmacy} · Signed in as {name} ({role})',
  'dashboard.recordSale': 'Record sale',
  'dashboard.summaryAria': 'Pharmacy summary',
  'dashboard.signedInStaff': 'Signed-in staff',
  'dashboard.yourPharmacy': 'Your pharmacy',
  'dashboard.cards.medicines': 'Total Medicines',
  'dashboard.cards.sales': "Today's Sales",
  'dashboard.cards.lowStock': 'Low Stock',
  'dashboard.cards.expiry': 'Expiry Alerts',
  'dashboard.hints.medicinesEmpty': 'No medicines in the inventory yet',
  'dashboard.hints.medicinesForms': 'Across {count} dosage forms',
  'dashboard.hints.salesEmpty': 'No sales recorded today',
  'dashboard.hints.salesCount': ({ sales = 0, items = 0 }) =>
    `${sales} sale${sales === 1 ? '' : 's'} · ${items} item${items === 1 ? '' : 's'} sold`,
  'dashboard.hints.lowStockEmpty': 'All medicines are above their threshold',
  'dashboard.hints.lowStockCount': ({ out = 0 }) =>
    `${out} out of stock · threshold based`,
  'dashboard.hints.expiryEmpty': 'No expired or soon-to-expire batches',
  'dashboard.hints.expiryCount': ({ expired = 0, soon = 0, days = 0 }) =>
    `${expired} expired · ${soon} expiring within ${days} days`,

  // Recent transactions
  'recent.title': 'Recent Transactions',
  'recent.subtitle': 'Latest confirmed sales and purchases',
  'recent.empty':
    'No transactions recorded yet. Record a sale or purchase to begin.',

  // Stock overview
  'stock.title': 'Stock Overview',
  'stock.allAbove':
    'All medicines are above their low-stock threshold',
  'stock.alertCount': ({ count = 0 }) =>
    `${count} item${count === 1 ? '' : 's'} at or below the low-stock threshold`,
  'stock.empty': 'No medicines in the inventory yet.',
  'stock.threshold': 'threshold {count} {unit}',
  'stock.levelAria': '{name} stock level',

  // Stock and expiry statuses
  'status.inStock': 'In stock',
  'status.lowStock': 'Low stock',
  'status.outOfStock': 'Out of stock',
  'status.noExpiry': 'No expiry',
  'status.expired': 'Expired',
  'status.expiresIn': ({ days = 0 }) =>
    `Expires in ${days} day${days === 1 ? '' : 's'}`,

  // Transactions table
  'tx.caption': 'Pharmacy sales and purchases',
  'tx.reference': 'Reference',
  'tx.date': 'Date',
  'tx.medicine': 'Medicine',
  'tx.type': 'Type',
  'tx.quantity': 'Quantity',
  'tx.stockChange': 'Stock change',
  'tx.unitPrice': 'Unit price',
  'tx.lineTotal': 'Line total',
  'tx.cogs': 'Cost of goods',
  'tx.grossProfit': 'Gross profit',
  'tx.details': 'Details',
  'tx.sale': 'Sale',
  'tx.purchase': 'Purchase',
  'tx.batch': 'Batch {number}',
  'tx.exp': 'Exp {date}',
  'tx.soldBy': 'Sold by {name}',
  'tx.partialCost': 'Partial cost',
  'tx.costUnavailable': 'Cost unavailable',
  'tx.known': '{amount} known',
  'tx.empty': 'No transactions yet.',
  'tx.sortBy': 'Sort by {column}',

  // Sales
  'sales.title': 'Sales',
  'sales.subtitle':
    'Select a medicine, choose the packaging unit, and record the sale. Stock is deducted in base units.',
  'sales.selectTitle': 'Select a medicine',
  'sales.selectSubtitle':
    'Search by name or strength, then choose a medicine.',
  'sales.detailsTitle': 'Sale details',
  'sales.detailsSubtitle': 'Quantity, unit, and price',
  'sales.selectPrompt':
    'Select a medicine from the list to record a sale.',
  'sales.selectedMedicine': 'Selected medicine',
  'sales.available': '{form} · available {count} {unit}',
  'sales.packagingUnit': 'Packaging unit',
  'sales.noPackaging': 'No packaging levels',
  'sales.quantity': 'Quantity',
  'sales.conversion':
    '1 {unit} = {count} {base} · Available: {max} {unitLabel}',
  'sales.unitPriceLabel': 'Unit price for the selected packaging (ETB)',
  'sales.savedPrice': 'Saved price: {price} per {unit}',
  'sales.priceAdjusted':
    ' · one-off adjustment for this sale only; the medicine price is unchanged.',
  'sales.exceeds':
    'This quantity exceeds available stock and will be rejected.',
  'sales.stockEffect': 'Stock effect',
  'sales.lineTotal': 'Line total',
  'sales.recording': 'Recording…',
  'sales.confirm': 'Confirm sale',
  'sales.history': 'Sales history',
  'sales.historySubtitle':
    '{period} · all sales recorded for this pharmacy',
  'sales.historyPeriodAria': 'Sales history period',
  'sales.totalsAria': 'Sales totals',
  'sales.total': 'Sales total',
  'sales.transactions': 'Transactions',
  'sales.itemsSold': 'Items sold',
  'sales.average': 'Average sale',
  'sales.emptyForPeriod': 'No sales recorded {period}.',
  'sales.errors.chooseMedicine': 'Choose a medicine.',
  'sales.errors.chooseUnit': 'Choose a selling unit.',
  'sales.errors.wholeNumber': 'Enter a whole number of at least 1.',
  'sales.errors.notEnoughStock':
    'Not enough stock. Only {max} {unit} ({stock} {base}) available.',
  'sales.errors.pricePositive': 'Enter a selling price greater than zero.',
  'sales.notice.recorded':
    'Sale {code} recorded — {quantity} {unit} ({baseQuantity} {baseUnit}) removed from stock.',
  'sales.notice.added':
    '{name} {strength} was added to inventory and selected. Complete the sale details to record it.',
  'sales.notice.addedImageWarning':
    '{name} {strength} was added to inventory, but the image could not be uploaded. {warning}',

  // Periods
  'period.today': 'Today',
  'period.week': 'This Week',
  'period.month': 'This Month',
  'period.quarter': 'This Quarter',
  'period.year': 'This Year',

  // Inventory
  'inventory.title': 'Inventory',
  'inventory.subtitle':
    "Stock is tracked in each medicine's smallest unit.",
  'inventory.managePackaging': 'Manage packaging',
  'inventory.addMedicine': 'Add medicine',
  'inventory.panelTitle': 'Medicine inventory',
  'inventory.showing': 'Showing {shown} of {total} medicines',
  'inventory.searchAria': 'Search inventory',
  'inventory.searchPlaceholder': 'Search medicine, strength, form',
  'inventory.filterAria': 'Filter by stock status',
  'inventory.allStock': 'All stock',
  'inventory.inStock': 'In stock',
  'inventory.lowStock': 'Low stock',
  'inventory.outOfStock': 'Out of stock',
  'inventory.caption':
    'Medicine inventory with packaging, stock, price, and status',
  'inventory.medicine': 'Medicine',
  'inventory.packaging': 'Packaging',
  'inventory.stockOnHand': 'Stock on hand',
  'inventory.sellingPrice': 'Selling price',
  'inventory.purchaseCost': 'Purchase cost',
  'inventory.status': 'Status',
  'inventory.actions': 'Actions',
  'inventory.noMatch': 'No medicines match this search or filter.',
  'inventory.perUnit': '{price} per {unit}',
  'inventory.detailSubtitle': '{form} · base unit: {unit}',
  'inventory.levelCount': ({ count = 0 }) =>
    `${count} level${count === 1 ? '' : 's'}`,
  'inventory.threshold': 'threshold {count}',
  'inventory.costUnavailable': 'Cost unavailable',
  'inventory.costed': '{count} {unit} costed',
  'inventory.uncosted': '{count} uncosted',
  'inventory.editMedicine': 'Edit medicine',
  'inventory.medicineLabel': 'Medicine',
  'inventory.lowStockThreshold': 'Low-stock threshold',
  'inventory.purchaseCostBasis': 'Purchase cost basis',
  'inventory.openingNoCost':
    '{count} {unit} from opening stock have no purchase cost.',
  'inventory.stockBreakdown': 'Stock breakdown',
  'inventory.packagingAndPrices': 'Packaging and unit prices',
  'inventory.baseUnitsPerUnit': 'Base units per unit',
  'inventory.purchaseBatches': 'Purchase batches and cost',
  'inventory.purchaseBatchesHint':
    'Remaining quantity from each purchase batch. Sales use these costs oldest-first (FIFO).',
  'inventory.noPurchaseCost':
    'No purchase cost is available for the remaining stock.',
  'inventory.batch': 'Batch',
  'inventory.purchaseDate': 'Purchase date',
  'inventory.received': 'Received',
  'inventory.remaining': 'Remaining',
  'inventory.costPerBase': 'Cost / {unit}',
  'inventory.expiry': 'Expiry',
  'inventory.importExcel': 'Import Excel',

  // Medicine import
  'import.title': 'Import Medicines from Excel',
  'import.subtitle':
    'Download the template, upload your file, review the preview, then import.',
  'import.stepTemplate': 'Template',
  'import.stepUpload': 'Upload',
  'import.stepPreview': 'Preview',
  'import.stepImport': 'Import',
  'import.templateTitle': '1. Download the Excel template',
  'import.templateBody':
    'Use the template so every column matches PharmaTrack. The Instructions sheet explains each field.',
  'import.downloadTemplate': 'Download template',
  'import.uploadTitle': '2. Upload your filled file',
  'import.uploadHint': 'Drag and drop your file here, or choose a file.',
  'import.chooseFile': 'Choose file',
  'import.supported': 'Supported formats: .xlsx, .xls, .csv (up to 10 MB)',
  'import.replaceFile': 'Replace file',
  'import.analyzing': 'Checking your file…',
  'import.previewTitle': '3. Review before importing',
  'import.valid': 'Ready to import',
  'import.invalid': 'Invalid rows',
  'import.duplicate': 'Duplicate rows',
  'import.total': 'Rows in file',
  'import.rowsCaption': 'Preview of medicines in the uploaded file',
  'import.colMedicine': 'Medicine name',
  'import.colStrength': 'Strength',
  'import.colForm': 'Form',
  'import.colPrice': 'Selling price',
  'import.colStock': 'Stock quantity',
  'import.colBatch': 'Batch number',
  'import.colExpiry': 'Expiry date',
  'import.colStatus': 'Import status',
  'import.statusValid': 'Ready',
  'import.statusInvalid': 'Invalid',
  'import.statusDuplicate': 'Duplicate',
  'import.statusImported': 'Imported',
  'import.statusFailed': 'Failed',
  'import.statusSkipped': 'Skipped',
  'import.confirm': 'I reviewed the preview and confirm this import.',
  'import.importButton': ({ count = 0 }) =>
    `Import ${count} medicine${count === 1 ? '' : 's'}`,
  'import.importing': 'Importing…',
  'import.offline':
    'You are offline. Importing medicines needs a connection; nothing will be saved.',
  'import.localNotice': 'Demo mode: imported medicines are saved on this device.',
  'import.ownerOnly': 'Only the owner can import medicines.',
  'import.alreadyImported':
    'This exact file was already imported on {date}. Choose a different file to avoid duplicate records.',
  'import.parseError':
    'This file could not be read. Check that it is a valid Excel or CSV file.',
  'import.missingHeaders': 'Missing required columns: {columns}.',
  'import.noValidRows':
    'There are no valid rows to import. Fix the errors above and upload the file again.',
  'import.resultTitle': '4. Import result',
  'import.resultSummary': '{imported} of {total} medicines imported.',
  'import.resultImported': 'Imported',
  'import.resultFailed': 'Failed',
  'import.resultSkipped': 'Skipped',
  'import.resultFailedTitle': 'Rows that could not be imported',
  'import.partialNotice':
    'Some rows were not imported. Fix the errors and upload the file again; rows that already imported are reported as duplicates.',
  'import.skippedDetails': ({ count = 0 }) =>
    `${count} skipped row${count === 1 ? '' : 's'}`,
  'import.rowNumber': 'Row {row}:',
  'import.done': 'Done',
  'import.importAnother': 'Import another file',
  'import.fileTooLarge': 'The file is larger than 10 MB.',
  'import.unsupportedFile': 'Choose an .xlsx, .xls, or .csv file.',
  'import.noFile': 'Choose a file to import.',
  'import.emptyFile': 'This file has no data rows.',
  'import.tooManyRows':
    'This file has more than {max} rows. Split it into smaller files.',
  'import.templateError': 'The template could not be downloaded.',
  'import.importError': 'The import could not be completed.',
  'import.field.expiryDate': 'expiry date',
  'import.field.manufacturingDate': 'manufacturing date',
  'import.reason.nameRequired': 'Medicine name is required.',
  'import.reason.strengthRequired':
    'Strength is required (for example, 500 mg).',
  'import.reason.dosageRequired': 'Dosage form is required.',
  'import.reason.dosageInvalid': '"{value}" is not a supported dosage form.',
  'import.reason.baseUnitRequired':
    'Stock unit is required (for example, tablet).',
  'import.reason.priceRequired': 'Selling price is required.',
  'import.reason.priceInvalid': 'Enter a valid selling price.',
  'import.reason.pricePositive': 'Selling price must be greater than zero.',
  'import.reason.stockInvalid':
    'Stock quantity must be a whole number, 0 or more.',
  'import.reason.thresholdInvalid':
    'Minimum threshold must be a whole number, 0 or more.',
  'import.reason.costRequired':
    'Purchase cost is required when stock quantity is greater than zero.',
  'import.reason.costInvalid':
    'Purchase cost must be a valid number, 0 or more.',
  'import.reason.supplierRequired':
    'Supplier is required when stock quantity is greater than zero.',
  'import.reason.dateInvalid':
    'Enter a valid {field} in YYYY-MM-DD format.',
  'import.reason.expiryPast': 'Expiry date {date} is in the past.',
  'import.reason.manufacturingFuture':
    'Manufacturing date {date} cannot be in the future.',
  'import.reason.expiryBeforeManufacturing':
    'Expiry date must be after the manufacturing date.',
  'import.reason.packagingInvalid':
    '"{value}" is not a valid packaging entry. Use unit=contains, for example strip=10.',
  'import.reason.packagingDuplicate':
    'Packaging unit "{unit}" is repeated or matches the stock unit.',
  'import.reason.packagingContains':
    'Packaging unit "{unit}" must contain more than one stock unit.',
  'import.reason.packagingPrice':
    'Enter a valid price for packaging unit "{unit}".',
  'import.reason.packagingOrder':
    'Packaging unit "{unit}" must be larger than the level before it.',
  'import.reason.existingDuplicate':
    '{name} {strength} is already in inventory. Add stock from Purchases instead of importing a duplicate.',
  'import.reason.inFileDuplicate':
    'This medicine appears {count} times in the file. Keep one row per medicine.',
  'import.reason.batchDuplicate':
    'Batch "{batch}" appears more than once for this medicine. Use one row per batch or merge the quantities.',

  // Purchases
  'purchases.title': 'Purchases',
  'purchases.subtitle':
    'Receive stock in supplier packaging. Inventory increases only after confirmation.',
  'purchases.recordTitle': 'Record a purchase',
  'purchases.recordSubtitle': 'Supplier, batch, and expiry details',
  'purchases.supplier': 'Supplier',
  'purchases.supplierPlaceholder': 'e.g. Addis Pharma Distributors',
  'purchases.purchaseDate': 'Purchase date',
  'purchases.medicine': 'Medicine',
  'purchases.selectMedicine': 'Select a medicine',
  'purchases.inStock': '{count} {unit} in stock',
  'purchases.receivedAs': 'Received as',
  'purchases.selectMedicineFirst': 'Select a medicine first',
  'purchases.quantityReceived': 'Quantity received',
  'purchases.costPerUnit': 'Purchase cost per unit (ETB)',
  'purchases.batchOptional': 'Batch number (optional)',
  'purchases.expiryOptional': 'Expiry date (optional)',
  'purchases.confirm': 'Confirm purchase',
  'purchases.previewTitle': 'Purchase preview',
  'purchases.previewSubtitle': 'Conversion and stock effect',
  'purchases.baseUnitsAdded': 'Base units added',
  'purchases.newStockLevel': 'New stock level',
  'purchases.costPerReceivedUnit': 'Cost per received unit',
  'purchases.totalCost': 'Total purchase cost',
  'purchases.hint':
    'Stock increases only after the purchase is confirmed. Purchase cost is stored with this batch; saved selling prices in Inventory are not changed.',
  'purchases.recentTitle': 'Recent purchases',
  'purchases.recentSubtitle':
    'Latest purchases recorded for this pharmacy',
  'purchases.empty': 'No purchases recorded yet.',
  'purchases.errors.supplier': 'Supplier name is required.',
  'purchases.errors.medicine': 'Choose a medicine.',
  'purchases.errors.unit': 'Choose a packaging unit.',
  'purchases.errors.quantity': 'Enter a whole number of at least 1.',
  'purchases.errors.unitCost': 'Enter a purchase cost of 0 or more.',
  'purchases.errors.date': 'Choose the purchase date.',
  'purchases.errors.expiry':
    'Expiry date cannot be before the purchase date.',
  'purchases.notice.confirmed':
    'Purchase {code} confirmed — {count} {unit} added to stock.',

  // Packaging page
  'packaging.title': 'Packaging',
  'packaging.subtitle':
    'Configure how each medicine is packaged and converted to its base stock unit.',
  'packaging.noMedicines':
    'No medicines yet. Add a medicine in the Inventory page first.',
  'packaging.selectTitle': 'Select a medicine',
  'packaging.selectSubtitle':
    'Different medicines can use different packaging structures.',
  'packaging.medicine': 'Medicine',
  'packaging.baseUnitCurrent':
    'Base unit: {unit} · current stock: {count} {unitLabel}',
  'packaging.save': 'Save packaging',
  'packaging.saved':
    'Packaging and selling prices saved for {name}. Existing stock stays {count} {unit}.',
  'packaging.saveError': 'Unable to save packaging.',
  'packaging.hint':
    'Changing packaging does not convert or delete existing stock. Stock is always stored in the smallest unit ({unit}).',
  'packaging.previewTitle': 'Conversion preview',
  'packaging.previewSubtitle': 'Calculated from the levels on the left',
  'packaging.receivingExample': 'Receiving example',
  'packaging.sellingExample': 'Selling example',
  'packaging.adds': '1 {unit} adds {count} {base}',
  'packaging.removes': '2 {unit} removes {count} {base}',
  'packaging.unitPrices': 'Unit prices',
  'packaging.unit': 'Unit',
  'packaging.contains': 'Contains',
  'packaging.price': 'Price',
  'packaging.completeLevels':
    'Complete the packaging levels to preview conversions.',

  // Packaging editor
  'editor.level': 'Packaging level',
  'editor.contains': 'Contains (base units)',
  'editor.price': 'Selling price (ETB)',
  'editor.actions': 'Actions',
  'editor.unitPlaceholder': 'e.g. strip',
  'editor.pricePlaceholder': 'e.g. 25',
  'editor.unitAria': 'Packaging unit {index}',
  'editor.containsAria': 'Base units in packaging level {index}',
  'editor.priceAria': 'Selling price in ETB for packaging level {index}',
  'editor.addLevel': 'Add packaging level',
  'editor.hint':
    'The smallest unit is the base stock unit. Each larger level states how many base units it contains. Prices are saved per sellable unit.',

  // Expiry page
  'expiry.title': 'Expiry management',
  'expiry.subtitle':
    'Batches with stock remaining, ordered by expiry date.',
  'expiry.summaryAria': 'Expiry summary',
  'expiry.expiringSoon': 'Expiring soon',
  'expiry.expired': 'Expired',
  'expiry.batchesWithStock': 'Batches with stock',
  'expiry.batches': 'Batches',
  'expiry.shownCount': ({ count = 0 }) =>
    `${count} batch${count === 1 ? '' : 'es'} shown`,
  'expiry.filterAria': 'Expiry filter',
  'expiry.filterAlerts': 'Expiring within {days} days',
  'expiry.filterExpired': 'Expired',
  'expiry.filterAll': 'All batches',
  'expiry.emptyExpired': 'No expired batches have stock remaining.',
  'expiry.emptyAll': 'No purchase batches have stock remaining yet.',
  'expiry.emptyAlerts': 'No batches expire within {days} days.',
  'expiry.medicine': 'Medicine',
  'expiry.batch': 'Batch',
  'expiry.expiryDate': 'Expiry date',
  'expiry.status': 'Status',
  'expiry.remainingStock': 'Remaining stock',

  // Audit reports
  'audit.title': 'Audit Reports',
  'audit.subtitle':
    'Daily, monthly, quarterly, and annual purchase, sales, and cost reporting from your pharmacy transactions.',
  'audit.print': 'Print report',
  'audit.period': 'Period',
  'audit.periodAria': 'Audit report period',
  'audit.filters': 'Report filters',
  'audit.filtersSubtitle':
    'Transactions are filtered by purchase/sale date.',
  'audit.fromDate': 'From date',
  'audit.toDate': 'To date',
  'audit.transactionType': 'Transaction type',
  'audit.allTransactions': 'All transactions',
  'audit.salesOnly': 'Sales only',
  'audit.purchasesOnly': 'Purchases only',
  'audit.inRange': ({ count = 0 }) =>
    `${count} transaction${count === 1 ? '' : 's'} in range`,
  'audit.dateRangeError':
    'The start date is after the end date, so no transactions are shown.',
  'audit.totalsAria': 'Audit totals',
  'audit.salesRevenue': 'Sales revenue',
  'audit.purchaseCosts': 'Purchase costs',
  'audit.cogs': 'Cost of goods sold',
  'audit.grossProfit': 'Gross profit',
  'audit.grossProfitEstimated': 'Gross profit (estimated)',
  'audit.grossProfitCosted': 'Gross profit (costed sales only)',
  'audit.costUnavailable': 'Cost unavailable',
  'audit.salesRecorded': 'Sales recorded',
  'audit.purchasesRecorded': 'Purchases recorded',
  'audit.stockReceived': 'Stock received',
  'audit.stockSold': 'Stock sold',
  'audit.baseUnits': '{count} base units',
  'audit.incompleteTitle': 'Cost data is incomplete.',
  'audit.incompleteUnavailable': ({ count = 0 }) =>
    `${count} sale${count === 1 ? '' : 's'} have no reliable purchase cost. `,
  'audit.incompletePartial': ({ count = 0 }) =>
    `${count} sale${count === 1 ? '' : 's'} are only partly costed. `,
  'audit.incompleteTail': ({ count = 0 }) =>
    `Gross profit excludes those sales; COGS covers ${count} fully costed sale${count === 1 ? '' : 's'} only.`,
  'audit.estimateNote':
    'Gross profit is an estimate based on FIFO batch costs recorded in your purchase history. It excludes overhead costs.',
  'audit.detailsTitle': 'Detailed report',
  'audit.detailsSubtitle':
    'Chart, transactions, and stock movements for the selected period',
  'audit.filteredTransactions': 'Filtered transactions',
  'audit.filteredSubtitle':
    '{from} to {to} · costed sales show FIFO cost and gross profit',
  'audit.noMatch': 'No transactions match the selected filters.',
  'audit.stockMovements': 'Stock movements',
  'audit.stockMovementsSubtitle':
    'Base-unit movement per medicine in the selected range',
  'audit.stockIn': 'Stock in',
  'audit.stockOut': 'Stock out',
  'audit.netChange': 'Net change',
  'audit.noMovement': 'No stock movement in range.',
  'audit.lowStockItems': 'Low-stock items',
  'audit.lowStockSubtitle': 'Current stock, not filtered by date',
  'audit.stock': 'Stock',
  'audit.threshold': 'Threshold',
  'audit.status': 'Status',
  'audit.noLowStock': 'No low-stock items.',
  'audit.printRange': 'Audit report · {from} to {to} · {type}',
  'audit.printGenerated': 'Generated from your pharmacy records',
  'audit.exportCsv': 'Export CSV',
  'audit.exportPeriodPrompt': 'Choose which period to include in the CSV.',
  'audit.exportCsvHint':
    'Downloads the totals, transaction list, and stock movements for the selected period.',
  'audit.exportPeriodAria': 'Export period',
  'audit.csvSelectedPeriod': 'Selected period',
  'audit.showDetails': 'Show details',
  'audit.hideDetails': 'Hide details',
  'audit.focusSales': 'Sales',
  'audit.focusPurchases': 'Purchases',
  'audit.focusCosted': 'Costed sales',
  'audit.focusLabel': 'Showing: {label}',
  'audit.focusClear': 'Clear filter',
  'audit.sortBy': 'Sort by {column}',
  'audit.csvTitle': 'PharmaTrack Audit Report',
  'audit.csvPharmacy': 'Pharmacy',
  'audit.csvGenerated': 'Generated',
  'audit.csvSummary': 'Summary',
  'audit.csvMetric': 'Metric',
  'audit.csvValue': 'Value',
  'audit.chartTitle': 'Activity over time',
  'audit.chartSubtitle': 'Sales and purchases in the selected period',
  'audit.chartAria': 'Sales and purchases over the selected period',
  'audit.chartEmpty': 'No transactions in this period.',
  'audit.chartSales': 'Sales',
  'audit.chartPurchases': 'Purchases',

  // Staff
  'staff.title': 'Staff',
  'staff.subtitle':
    'Pharmacy memberships and roles. Staff accounts are created when a user is added to your pharmacy.',
  'staff.members': 'Pharmacy members',
  'staff.memberCount': ({ count = 0 }) =>
    `${count} member${count === 1 ? '' : 's'}`,
  'staff.empty':
    'No staff memberships are loaded. Invite a user to your pharmacy through your account setup to give them access.',
  'staff.member': 'Member',
  'staff.phone': 'Phone',
  'staff.role': 'Role',
  'staff.status': 'Status',
  'staff.unnamed': 'Unnamed member',
  'staff.you': 'You',
  'staff.legacyRole': 'Legacy database role: {role}',
  'staff.active': 'Active',
  'staff.inactive': 'Inactive',
  'staff.invited': 'Invited',
  'staff.roleAria': 'Role for {name}',
  'staff.statusAria': 'Status for {name}',
  'staff.memberFallback': 'member',
  'staff.note':
    'Owners can change roles and deactivate members. Cashiers cannot open this page, and the database rejects membership changes from non-owner accounts.',
  'staff.updated': 'Updated {name}.',
  'staff.updateError': 'Unable to update the staff member.',

  // Settings
  'settings.title': 'Settings',
  'settings.subtitle': 'Choose how the app looks and feels.',
  'settings.preferences': 'Preferences',
  'settings.savedOnDevice': 'Saved on this device.',
  'settings.darkMode': 'Dark mode',
  'settings.darkModeDescription':
    'Use a darker colour scheme that is easier on the eyes.',
  'settings.amharic': 'Amharic',
  'settings.amharicDescription':
    'Show the interface in Amharic. You can switch back at any time.',

  // Sign in
  'signIn.title': 'Sign in',
  'signIn.subtitle':
    'Use the staff account connected to your pharmacy membership.',
  'signIn.email': 'Email',
  'signIn.password': 'Password',
  'signIn.signingIn': 'Signing in…',
  'signIn.submit': 'Sign in',
  'signIn.hint':
    'Access and permissions are enforced by your pharmacy membership and database policies.',
  'signIn.noAccess': 'No pharmacy access',
  'signIn.noAccessEmail':
    '{email} is signed in but has no active pharmacy membership.',
  'signIn.noAccessGeneric':
    'This account has no active pharmacy membership.',
  'signIn.askOwner':
    'Ask the pharmacy owner to add your staff account, then sign in again.',
  'signIn.signOut': 'Sign out',

  // Medicine picker
  'picker.searchAria': 'Search medicines by name or strength',
  'picker.searchPlaceholder': 'Search by medicine name or strength',
  'picker.emptyInventory': 'No medicines are in the inventory yet.',
  'picker.notFound': 'Medicine not found in inventory.',
  'picker.noMatch': 'No match for “{term}”.',
  'picker.addNew': '+ Add New Medicine',
  'picker.ownerOnly':
    'Only an owner can add medicines. Ask an owner to add it, then search again.',
  'picker.chooseAria': 'Choose a medicine',
  'picker.availableStock': 'Available stock: {count} {unit}',

  // Medicine form
  'form.editTitle': 'Edit medicine',
  'form.quickAddTitle': 'Add missing medicine',
  'form.addTitle': 'Add medicine',
  'form.quickAddSubtitle':
    'Save the medicine here, then continue recording the sale.',
  'form.subtitle': 'Changes are saved to your pharmacy records.',
  'form.saving': 'Saving…',
  'form.saveChanges': 'Save changes',
  'form.addContinue': 'Add and continue',
  'form.addMedicine': 'Add medicine',
  'form.imageSection': 'Medicine image',
  'form.previewAlt': 'Medicine preview',
  'form.noImage': 'No image selected',
  'form.replaceImage': 'Replace image',
  'form.uploadImage': 'Upload image',
  'form.imageHint': 'JPG, PNG, or WebP up to 5 MB.',
  'form.name': 'Medicine name',
  'form.namePlaceholder': 'e.g. Amoxicillin',
  'form.strength': 'Strength',
  'form.strengthPlaceholder': 'e.g. 500 mg',
  'form.duplicateWarning':
    '{name} {strength} already exists in the inventory. Select the existing medicine instead of creating a duplicate.',
  'form.dosageForm': 'Dosage form',
  'form.baseUnit': 'Base unit (smallest tracked unit)',
  'form.baseUnitPlaceholder': 'e.g. tablet',
  'form.threshold': 'Low-stock threshold (base units)',
  'form.openingStock': 'Opening stock ({unit})',
  'form.baseUnits': 'base units',
  'form.openingHint':
    'Recorded as an opening stock movement in {unit}.',
  'form.packagingSection': 'Packaging configuration and selling prices',
  'form.packagingHint':
    'Set a selling price for every sellable unit. These saved prices are used automatically in Sales; a cashier can adjust a single sale without changing the medicine record.',
  'form.baseUnitFallback': 'base unit',
  'form.duplicateError':
    '{name} {strength} is already in the inventory. Select it instead of creating a duplicate.',
  'form.saveError': 'Unable to save the medicine.',
  'form.imageSaveError':
    'The medicine was saved, but its image could not be uploaded.',

  // Dosage forms (stored values stay in English)
  'dosage.Tablet': 'Tablet',
  'dosage.Capsule': 'Capsule',
  'dosage.Syrup': 'Syrup',
  'dosage.Injection': 'Injection',
  'dosage.Injection pen': 'Injection pen',
  'dosage.Sachet': 'Sachet',
  'dosage.Cream': 'Cream',
  'dosage.Drops': 'Drops',
  'dosage.Inhaler': 'Inhaler',
  'dosage.Vial': 'Vial',
  'dosage.Other': 'Other',

  // Modal and confirm
  'modal.close': 'Close dialog',
  'confirm.message': 'Confirm',
}

const am = {
  // Shared
  'common.cancel': 'ሰርዝ',
  'common.close': 'ዝጋ',
  'common.save': 'አስቀምጥ',
  'common.view': 'ተመልከት',
  'common.edit': 'አርትዕ',
  'common.add': 'ጨምር',
  'common.remove': 'አስወግድ',
  'common.confirm': 'አረጋግጥ',
  'common.unknown': '—',

  // App shell
  'app.loadingPharmacy': 'ፋርማሲዎን በመጫን ላይ…',
  'app.loadingRecords': 'የፋርማሲ መዝገቦችን በመጫን ላይ…',
  'app.skipToContent': 'ወደ ዋና ይዘት ዝለል',
  'brand.subtitle': 'የፋርማሲ አስተዳደር',

  // Navigation
  'nav.aria': 'የጎን ምናሌ አሰሳ',
  'nav.close': 'አሰሳን ዝጋ',
  'nav.main': 'ዋና',
  'nav.menu': 'ምናሌ',
  'nav.dashboard': 'ዳሽቦርድ',
  'nav.sales': 'ሽያጭ',
  'nav.inventory': 'ክምችት',
  'nav.purchases': 'ግዢ',
  'nav.packaging': 'ማሸጊያ',
  'nav.expiry': 'የማብቂያ አስተዳደር',
  'nav.reports': 'ሪፖርቶች',
  'nav.staff': 'ሰራተኞች',
  'nav.settings': 'ቅንብሮች',
  'nav.workspace': 'የፋርማሲ ስራ ቦታ',
  'nav.signedInAs': 'እንደ {role} ገብቷል',
  'nav.footerText':
    'ክምችት፣ ሽያጭ እና ፈቃዶች ከፋርማሲ መዝገቦችዎ ጋር ተገናኝተዋል።',

  // Header
  'header.openNav': 'አሰሳ ክፈት',
  'header.searchPlaceholder': 'ክምችትን በመድሃኒት ስም ፈልግ',
  'header.signOut': 'ውጣ',

  // Roles
  'role.owner': 'ባለቤት',
  'role.cashier': 'ገንዘብ ተቀባይ',

  // Dashboard
  'dashboard.title': 'ዳሽቦርድ',
  'dashboard.subtitle': '{pharmacy} · እንደ {name} ({role}) ገብቷል',
  'dashboard.recordSale': 'ሽያጭ መዝግብ',
  'dashboard.summaryAria': 'የፋርማሲ ማጠቃለያ',
  'dashboard.signedInStaff': 'የገባ ሰራተኛ',
  'dashboard.yourPharmacy': 'የእርስዎ ፋርማሲ',
  'dashboard.cards.medicines': 'ጠቅላላ መድሃኒቶች',
  'dashboard.cards.sales': 'የዛሬ ሽያጭ',
  'dashboard.cards.lowStock': 'ዝቅተኛ ክምችት',
  'dashboard.cards.expiry': 'የማብቂያ ማሳወቂያዎች',
  'dashboard.hints.medicinesEmpty': 'እስካሁን በክምችት ውስጥ መድሃኒት የለም',
  'dashboard.hints.medicinesForms': 'በ{count} የመድሃኒት ዓይነቶች',
  'dashboard.hints.salesEmpty': 'ዛሬ የተመዘገበ ሽያጭ የለም',
  'dashboard.hints.salesCount': ({ sales = 0, items = 0 }) =>
    `${sales} ሽያጭ · ${items} ዕቃ ተሽጧል`,
  'dashboard.hints.lowStockEmpty': 'ሁሉም መድሃኒቶች ከገደባቸው በላይ ናቸው',
  'dashboard.hints.lowStockCount': ({ out = 0 }) =>
    `${out} ከክምችት ውጪ · በገደብ ላይ የተመሰረተ`,
  'dashboard.hints.expiryEmpty':
    'ጊዜው ያለፈ ወይም በቅርቡ የሚያበቃ ባች የለም',
  'dashboard.hints.expiryCount': ({ expired = 0, soon = 0, days = 0 }) =>
    `${expired} ጊዜው ያለፈ · ${soon} በ${days} ቀናት ውስጥ የሚያበቃ`,

  // Recent transactions
  'recent.title': 'የቅርብ ግብይቶች',
  'recent.subtitle': 'የቅርብ የተረጋገጡ ሽያጮች እና ግዢዎች',
  'recent.empty':
    'እስካሁን ግብይት አልተመዘገበም። ለመጀመር ሽያጭ ወይም ግዢ ይመዝግቡ።',

  // Stock overview
  'stock.title': 'የክምችት አጠቃላይ እይታ',
  'stock.allAbove': 'ሁሉም መድሃኒቶች ከዝቅተኛ ክምችት ገደባቸው በላይ ናቸው',
  'stock.alertCount': ({ count = 0 }) =>
    `${count} ዕቃ በዝቅተኛ ክምችት ገደብ ላይ ወይም ከዚያ በታች ነው`,
  'stock.empty': 'እስካሁን በክምችት ውስጥ መድሃኒት የለም።',
  'stock.threshold': 'ገደብ {count} {unit}',
  'stock.levelAria': 'የ{name} ክምችት መጠን',

  // Stock and expiry statuses
  'status.inStock': 'በክምችት ውስጥ',
  'status.lowStock': 'ዝቅተኛ ክምችት',
  'status.outOfStock': 'ከክምችት ውጪ',
  'status.noExpiry': 'ማብቂያ የለም',
  'status.expired': 'ጊዜው ያለፈ',
  'status.expiresIn': ({ days = 0 }) =>
    days === 1
      ? 'በ1 ቀን ውስጥ ያበቃል'
      : `በ${days} ቀናት ውስጥ ያበቃል`,

  // Transactions table
  'tx.caption': 'የፋርማሲ ሽያጮች እና ግዢዎች',
  'tx.reference': 'ማጣቀሻ',
  'tx.date': 'ቀን',
  'tx.medicine': 'መድሃኒት',
  'tx.type': 'ዓይነት',
  'tx.quantity': 'ብዛት',
  'tx.stockChange': 'የክምችት ለውጥ',
  'tx.unitPrice': 'የአንድ ክፍል ዋጋ',
  'tx.lineTotal': 'የመስመር ጠቅላላ',
  'tx.cogs': 'የሸቀጦች ወጪ',
  'tx.grossProfit': 'ጠቅላላ ትርፍ',
  'tx.details': 'ዝርዝሮች',
  'tx.sale': 'ሽያጭ',
  'tx.purchase': 'ግዢ',
  'tx.batch': 'ባች {number}',
  'tx.exp': 'ማብቂያ {date}',
  'tx.soldBy': 'የተሸጠው በ{name}',
  'tx.partialCost': 'ከፊል ወጪ',
  'tx.costUnavailable': 'ወጪ አይገኝም',
  'tx.known': '{amount} የታወቀ',
  'tx.empty': 'እስካሁን ግብይት የለም።',
  'tx.sortBy': 'በ{column} ደርድር',

  // Sales
  'sales.title': 'ሽያጭ',
  'sales.subtitle':
    'መድሃኒት ይምረጡ፣ የማሸጊያ አሃድ ይምረጡ እና ሽያጩን ይመዝግቡ። ክምችት በመሰረታዊ አሃድ ይቀንሳል።',
  'sales.selectTitle': 'መድሃኒት ይምረጡ',
  'sales.selectSubtitle': 'በስም ወይም በጥንካሬ ይፈልጉ፣ ከዚያ መድሃኒት ይምረጡ።',
  'sales.detailsTitle': 'የሽያጭ ዝርዝሮች',
  'sales.detailsSubtitle': 'ብዛት፣ አሃድ እና ዋጋ',
  'sales.selectPrompt': 'ሽያጭ ለመመዝገብ ከዝርዝሩ ውስጥ መድሃኒት ይምረጡ።',
  'sales.selectedMedicine': 'የተመረጠ መድሃኒት',
  'sales.available': '{form} · ያለው {count} {unit}',
  'sales.packagingUnit': 'የማሸጊያ አሃድ',
  'sales.noPackaging': 'የማሸጊያ ደረጃ የለም',
  'sales.quantity': 'ብዛት',
  'sales.conversion':
    '1 {unit} = {count} {base} · ያለው፡ {max} {unitLabel}',
  'sales.unitPriceLabel': 'የተመረጠው ማሸጊያ የአንድ ክፍል ዋጋ (ብር)',
  'sales.savedPrice': 'የተቀመጠ ዋጋ፡ {price} በ{unit}',
  'sales.priceAdjusted':
    ' · ለዚህ ሽያጭ ብቻ የተደረገ ለውጥ፤ የመድሃኒቱ ዋጋ አልተቀየረም።',
  'sales.exceeds': 'ይህ ብዛት ካለው ክምችት በላይ ነው እና ውድቅ ይደረጋል።',
  'sales.stockEffect': 'የክምችት ተጽዕኖ',
  'sales.lineTotal': 'የመስመር ጠቅላላ',
  'sales.recording': 'በመመዝገብ ላይ…',
  'sales.confirm': 'ሽያጭ አረጋግጥ',
  'sales.history': 'የሽያጭ ታሪክ',
  'sales.historySubtitle': '{period} · ለዚህ ፋርማሲ የተመዘገቡ ሁሉም ሽያጮች',
  'sales.historyPeriodAria': 'የሽያጭ ታሪክ ጊዜ',
  'sales.totalsAria': 'የሽያጭ ጠቅላላዎች',
  'sales.total': 'ጠቅላላ ሽያጭ',
  'sales.transactions': 'ግብይቶች',
  'sales.itemsSold': 'የተሸጡ ዕቃዎች',
  'sales.average': 'አማካይ ሽያጭ',
  'sales.emptyForPeriod': '{period} የተመዘገበ ሽያጭ የለም።',
  'sales.errors.chooseMedicine': 'መድሃኒት ይምረጡ።',
  'sales.errors.chooseUnit': 'የመሸጫ አሃድ ይምረጡ።',
  'sales.errors.wholeNumber': 'ቢያንስ 1 የሆነ ሙሉ ቁጥር ያስገቡ።',
  'sales.errors.notEnoughStock':
    'በቂ ክምችት የለም። ያለው {max} {unit} ({stock} {base}) ብቻ ነው።',
  'sales.errors.pricePositive': 'ከዜሮ በላይ የሆነ የመሸጫ ዋጋ ያስገቡ።',
  'sales.notice.recorded':
    'ሽያጭ {code} ተመዝግቧል — {quantity} {unit} ({baseQuantity} {baseUnit}) ከክምችት ተቀንሷል።',
  'sales.notice.added':
    '{name} {strength} ወደ ክምችት ተጨምሮ ተመርጧል። ለመመዝገብ የሽያጭ ዝርዝሮቹን ያሟሉ።',
  'sales.notice.addedImageWarning':
    '{name} {strength} ወደ ክምችት ተጨምሯል፣ ነገር ግን ምስሉ ሊሰቀል አልቻለም። {warning}',

  // Periods
  'period.today': 'ዛሬ',
  'period.week': 'በዚህ ሳምንት',
  'period.month': 'በዚህ ወር',
  'period.quarter': 'በዚህ ሩብ ዓመት',
  'period.year': 'በዚህ ዓመት',

  // Inventory
  'inventory.title': 'ክምችት',
  'inventory.subtitle': 'ክምችት በእያንዳንዱ መድሃኒት ትንሹ አሃድ ይከታተላል።',
  'inventory.managePackaging': 'ማሸጊያ አስተዳድር',
  'inventory.addMedicine': 'መድሃኒት ጨምር',
  'inventory.panelTitle': 'የመድሃኒት ክምችት',
  'inventory.showing': 'ከ{total} መድሃኒቶች {shown} ይታያሉ',
  'inventory.searchAria': 'ክምችት ፈልግ',
  'inventory.searchPlaceholder': 'መድሃኒት፣ ጥንካሬ፣ ዓይነት ፈልግ',
  'inventory.filterAria': 'በክምችት ሁኔታ አጣራ',
  'inventory.allStock': 'ሁሉም ክምችት',
  'inventory.inStock': 'በክምችት ውስጥ',
  'inventory.lowStock': 'ዝቅተኛ ክምችት',
  'inventory.outOfStock': 'ከክምችት ውጪ',
  'inventory.caption': 'የመድሃኒት ክምችት ከማሸጊያ፣ ክምችት፣ ዋጋ እና ሁኔታ ጋር',
  'inventory.medicine': 'መድሃኒት',
  'inventory.packaging': 'ማሸጊያ',
  'inventory.stockOnHand': 'በእጅ ያለ ክምችት',
  'inventory.sellingPrice': 'የመሸጫ ዋጋ',
  'inventory.purchaseCost': 'የግዢ ወጪ',
  'inventory.status': 'ሁኔታ',
  'inventory.actions': 'ድርጊቶች',
  'inventory.noMatch': 'ከዚህ ፍለጋ ወይም ማጣሪያ ጋር የሚዛመድ መድሃኒት የለም።',
  'inventory.perUnit': '{price} በ{unit}',
  'inventory.detailSubtitle': '{form} · መሰረታዊ አሃድ፡ {unit}',
  'inventory.levelCount': ({ count = 0 }) => `${count} ደረጃ`,
  'inventory.threshold': 'ገደብ {count}',
  'inventory.costUnavailable': 'ወጪ አይገኝም',
  'inventory.costed': '{count} {unit} ወጪ ተቆጥሯል',
  'inventory.uncosted': '{count} ወጪ አልተቆጠረም',
  'inventory.editMedicine': 'መድሃኒት አርትዕ',
  'inventory.medicineLabel': 'መድሃኒት',
  'inventory.lowStockThreshold': 'የዝቅተኛ ክምችት ገደብ',
  'inventory.purchaseCostBasis': 'የግዢ ወጪ መሰረት',
  'inventory.openingNoCost':
    'ከመክፈቻ ክምችት የመጡ {count} {unit} የግዢ ወጪ የላቸውም።',
  'inventory.stockBreakdown': 'የክምችት ክፍፍል',
  'inventory.packagingAndPrices': 'ማሸጊያ እና የአንድ ክፍል ዋጋዎች',
  'inventory.baseUnitsPerUnit': 'በአንድ አሃድ ውስጥ ያሉ መሰረታዊ አሃዶች',
  'inventory.purchaseBatches': 'የግዢ ባቾች እና ወጪ',
  'inventory.purchaseBatchesHint':
    'በእያንዳንዱ የግዢ ባች የቀረ ብዛት። ሽያጮች እነዚህን ወጪዎች ከቆዩት ጀምሮ (FIFO) ይጠቀማሉ።',
  'inventory.noPurchaseCost': 'ለቀረው ክምችት የግዢ ወጪ አይገኝም።',
  'inventory.batch': 'ባች',
  'inventory.purchaseDate': 'የግዢ ቀን',
  'inventory.received': 'የተቀበለ',
  'inventory.remaining': 'የቀረ',
  'inventory.costPerBase': 'ወጪ / {unit}',
  'inventory.expiry': 'ማብቂያ',
  'inventory.importExcel': 'Excel አስገባ',

  // Medicine import
  'import.title': 'መድሃኒቶችን ከExcel አስገባ',
  'import.subtitle':
    'አብነቱን ያውርዱ፣ ፋይልዎን ይስቀሉ፣ ቅድመ እይታውን ይገምግሙ፣ ከዚያ ያስገቡ።',
  'import.stepTemplate': 'አብነት',
  'import.stepUpload': 'ስቀል',
  'import.stepPreview': 'ቅድመ እይታ',
  'import.stepImport': 'አስገባ',
  'import.templateTitle': '1. የExcel አብነቱን ያውርዱ',
  'import.templateBody':
    'ሁሉም አምድ ከPharmaTrack ጋር እንዲጣጣም አብነቱን ይጠቀሙ። የመመሪያ ሉሁ እያንዳንዱን መስክ ያብራራል።',
  'import.downloadTemplate': 'አብነት አውርድ',
  'import.uploadTitle': '2. የሞላህውን ፋይል ስቀል',
  'import.uploadHint': 'ፋይልዎን እዚህ ጎትተው ይጣሉ፣ ወይም ፋይል ይምረጡ።',
  'import.chooseFile': 'ፋይል ይምረጡ',
  'import.supported': 'የሚደገፉ ቅርጸቶች፡ .xlsx፣ .xls፣ .csv (እስከ 10 MB)',
  'import.replaceFile': 'ፋይል ቀይር',
  'import.analyzing': 'ፋይልዎን በመፈተሽ ላይ…',
  'import.previewTitle': '3. ከማስገባት በፊት ይገምግሙ',
  'import.valid': 'ለማስገባት ዝግጁ',
  'import.invalid': 'ልክ ያልሆኑ ረድፎች',
  'import.duplicate': 'ተደጋጋሚ ረድፎች',
  'import.total': 'በፋይሉ ውስጥ ያሉ ረድፎች',
  'import.rowsCaption': 'በተሰቀለው ፋይል ውስጥ ያሉ መድሃኒቶች ቅድመ እይታ',
  'import.colMedicine': 'የመድሃኒት ስም',
  'import.colStrength': 'ጥንካሬ',
  'import.colForm': 'ዓይነት',
  'import.colPrice': 'የመሸጫ ዋጋ',
  'import.colStock': 'የክምችት ብዛት',
  'import.colBatch': 'የባች ቁጥር',
  'import.colExpiry': 'ማብቂያ ቀን',
  'import.colStatus': 'የማስገባት ሁኔታ',
  'import.statusValid': 'ዝግጁ',
  'import.statusInvalid': 'ልክ ያልሆነ',
  'import.statusDuplicate': 'ተደጋጋሚ',
  'import.statusImported': 'ገብቷል',
  'import.statusFailed': 'አልተሳካም',
  'import.statusSkipped': 'ተዘለለ',
  'import.confirm': 'ቅድመ እይታውን ገምግሜ ይህን ማስገባት አረጋግጣለሁ።',
  'import.importButton': ({ count = 0 }) => `${count} መድሃኒት አስገባ`,
  'import.importing': 'በማስገባት ላይ…',
  'import.offline':
    'ከመስመር ውጪ ነዎት። መድሃኒቶችን ማስገባት ግንኙነት ይፈልጋል፤ ምንም አይቀመጥም።',
  'import.localNotice':
    'የማሳያ ሁነታ፡ የገቡ መድሃኒቶች በዚህ መሣሪያ ላይ ይቀመጣሉ።',
  'import.ownerOnly': 'ባለቤት ብቻ መድሃኒቶችን ማስገባት ይችላል።',
  'import.alreadyImported':
    'ይህ ፋይል ቀድሞ በ{date} ገብቷል። ተደጋጋሚ መዝገቦችን ለማስወገድ ሌላ ፋይል ይምረጡ።',
  'import.parseError':
    'ይህ ፋይል ሊነበብ አልቻለም። ትክክለኛ የExcel ወይም CSV ፋይል መሆኑን ያረጋግጡ።',
  'import.missingHeaders': 'የጎደሉ አስፈላጊ አምዶች፡ {columns}።',
  'import.noValidRows':
    'ለማስገባት ልክ የሆነ ረድፍ የለም። ስህተቶቹን አስተካክለው ፋይሉን እንደገና ይስቀሉ።',
  'import.resultTitle': '4. የማስገባት ውጤት',
  'import.resultSummary': '{imported} ከ{total} መድሃኒቶች ገብተዋል።',
  'import.resultImported': 'ገብቷል',
  'import.resultFailed': 'አልተሳካም',
  'import.resultSkipped': 'ተዘለለ',
  'import.resultFailedTitle': 'ሊገቡ ያልቻሉ ረድፎች',
  'import.partialNotice':
    'አንዳንድ ረድፎች አልገቡም። ስህተቶቹን አስተካክለው ፋይሉን እንደገና ይስቀሉ፤ አስቀድመው የገቡ ረድፎች እንደ ተደጋጋሚ ይታያሉ።',
  'import.skippedDetails': ({ count = 0 }) => `${count} የተዘለሉ ረድፎች`,
  'import.rowNumber': 'ረድፍ {row}፡',
  'import.done': 'ጨርስ',
  'import.importAnother': 'ሌላ ፋይል አስገባ',
  'import.fileTooLarge': 'ፋይሉ ከ10 MB ይበልጣል።',
  'import.unsupportedFile': 'የ.xlsx፣ .xls ወይም .csv ፋይል ይምረጡ።',
  'import.noFile': 'ለማስገባት ፋይል ይምረጡ።',
  'import.emptyFile': 'ይህ ፋይል የውሂብ ረድፎች የለውም።',
  'import.tooManyRows':
    'ይህ ፋይል ከ{max} በላይ ረድፎች አሉት። ወደ ትናንሽ ፋይሎች ይከፋፍሉት።',
  'import.templateError': 'አብነቱ ሊወርድ አልቻለም።',
  'import.importError': 'ማስገባቱ ሊጠናቀቅ አልቻለም።',
  'import.field.expiryDate': 'ማብቂያ ቀን',
  'import.field.manufacturingDate': 'የምርት ቀን',
  'import.reason.nameRequired': 'የመድሃኒት ስም ያስፈልጋል።',
  'import.reason.strengthRequired': 'ጥንካሬ ያስፈልጋል (ለምሳሌ 500 mg)።',
  'import.reason.dosageRequired': 'የመድሃኒት ዓይነት ያስፈልጋል።',
  'import.reason.dosageInvalid':
    '"{value}" የሚደገፍ የመድሃኒት ዓይነት አይደለም።',
  'import.reason.baseUnitRequired':
    'የክምችት አሃድ ያስፈልጋል (ለምሳሌ ታብሌት)።',
  'import.reason.priceRequired': 'የመሸጫ ዋጋ ያስፈልጋል።',
  'import.reason.priceInvalid': 'ትክክለኛ የመሸጫ ዋጋ ያስገቡ።',
  'import.reason.pricePositive': 'የመሸጫ ዋጋ ከዜሮ በላይ መሆን አለበት።',
  'import.reason.stockInvalid':
    'የክምችት ብዛት ከ0 ወይም ከዚያ በላይ ሙሉ ቁጥር መሆን አለበት።',
  'import.reason.thresholdInvalid':
    'ዝቅተኛው ገደብ ከ0 ወይም ከዚያ በላይ ሙሉ ቁጥር መሆን አለበት።',
  'import.reason.costRequired':
    'የክምችት ብዛት ከዜሮ በላይ ሲሆን የግዢ ወጪ ያስፈልጋል።',
  'import.reason.costInvalid':
    'የግዢ ወጪ ከ0 ወይም ከዚያ በላይ ትክክለኛ ቁጥር መሆን አለበት።',
  'import.reason.supplierRequired':
    'የክምችት ብዛት ከዜሮ በላይ ሲሆን አቅራቢ ያስፈልጋል።',
  'import.reason.dateInvalid':
    'ትክክለኛ {field} በYYYY-MM-DD ቅርጸት ያስገቡ።',
  'import.reason.expiryPast': 'የማብቂያ ቀን {date} አልፏል።',
  'import.reason.manufacturingFuture':
    'የምርት ቀን {date} ወደፊት መሆን አይችልም።',
  'import.reason.expiryBeforeManufacturing':
    'የማብቂያ ቀን ከምርት ቀን በኋላ መሆን አለበት።',
  'import.reason.packagingInvalid':
    '"{value}" ትክክለኛ የማሸጊያ መግለጫ አይደለም። unit=contains ይጠቀሙ፣ ለምሳሌ strip=10።',
  'import.reason.packagingDuplicate':
    'የማሸጊያ አሃድ "{unit}" ተደጋግሟል ወይም ከክምችት አሃድ ጋር ተመሳሳይ ነው።',
  'import.reason.packagingContains':
    'የማሸጊያ አሃድ "{unit}" ከአንድ በላይ የክምችት አሃድ መያዝ አለበት።',
  'import.reason.packagingPrice':
    'ለማሸጊያ አሃድ "{unit}" ትክክለኛ ዋጋ ያስገቡ።',
  'import.reason.packagingOrder':
    'የማሸጊያ አሃድ "{unit}" ከቀዳሚው ደረጃ ትልቅ መሆን አለበት።',
  'import.reason.existingDuplicate':
    '{name} {strength} አስቀድሞ በክምችት ውስጥ አለ። ተደጋጋሚ ከማስገባት ይልቅ ከግዢ ገጽ ክምችት ይጨምሩ።',
  'import.reason.inFileDuplicate':
    'ይህ መድሃኒት በፋይሉ ውስጥ {count} ጊዜ ተደጋግሟል። ለአንድ መድሃኒት አንድ ረድፍ ይጠቀሙ።',
  'import.reason.batchDuplicate':
    'ባች "{batch}" ለዚህ መድሃኒት ከአንድ ጊዜ በላይ ተደጋግሟል። ለአንድ ባች አንድ ረድፍ ይጠቀሙ ወይም ብዛቶቹን ያዋህዱ።',

  // Purchases
  'purchases.title': 'ግዢ',
  'purchases.subtitle':
    'ክምችት በአቅራቢ ማሸጊያ ይቀበሉ። ክምችት የሚጨምረው ከማረጋገጫ በኋላ ብቻ ነው።',
  'purchases.recordTitle': 'ግዢ መዝግብ',
  'purchases.recordSubtitle': 'የአቅራቢ፣ ባች እና ማብቂያ ዝርዝሮች',
  'purchases.supplier': 'አቅራቢ',
  'purchases.supplierPlaceholder': 'ለምሳሌ አዲስ ፋርማ አከፋፋዮች',
  'purchases.purchaseDate': 'የግዢ ቀን',
  'purchases.medicine': 'መድሃኒት',
  'purchases.selectMedicine': 'መድሃኒት ይምረጡ',
  'purchases.inStock': '{count} {unit} በክምችት',
  'purchases.receivedAs': 'የተቀበለው እንደ',
  'purchases.selectMedicineFirst': 'መጀመሪያ መድሃኒት ይምረጡ',
  'purchases.quantityReceived': 'የተቀበለ ብዛት',
  'purchases.costPerUnit': 'የአንድ ክፍል የግዢ ወጪ (ብር)',
  'purchases.batchOptional': 'የባች ቁጥር (አማራጭ)',
  'purchases.expiryOptional': 'የማብቂያ ቀን (አማራጭ)',
  'purchases.confirm': 'ግዢ አረጋግጥ',
  'purchases.previewTitle': 'የግዢ ቅድመ እይታ',
  'purchases.previewSubtitle': 'ልወጣ እና የክምችት ተጽዕኖ',
  'purchases.baseUnitsAdded': 'የተጨመሩ መሰረታዊ አሃዶች',
  'purchases.newStockLevel': 'አዲስ የክምችት መጠን',
  'purchases.costPerReceivedUnit': 'ወጪ በተቀበለ አሃድ',
  'purchases.totalCost': 'ጠቅላላ የግዢ ወጪ',
  'purchases.hint':
    'ክምችት የሚጨምረው ግዢው ከተረጋገጠ በኋላ ብቻ ነው። የግዢ ወጪ ከዚህ ባች ጋር ይቀመጣል፤ በክምችት ውስጥ የተቀመጡ የመሸጫ ዋጋዎች አይቀየሩም።',
  'purchases.recentTitle': 'የቅርብ ግዢዎች',
  'purchases.recentSubtitle': 'ለዚህ ፋርማሲ የተመዘገቡ የቅርብ ግዢዎች',
  'purchases.empty': 'እስካሁን የተመዘገበ ግዢ የለም።',
  'purchases.errors.supplier': 'የአቅራቢ ስም ያስፈልጋል።',
  'purchases.errors.medicine': 'መድሃኒት ይምረጡ።',
  'purchases.errors.unit': 'የማሸጊያ አሃድ ይምረጡ።',
  'purchases.errors.quantity': 'ቢያንስ 1 የሆነ ሙሉ ቁጥር ያስገቡ።',
  'purchases.errors.unitCost': '0 ወይም ከዚያ በላይ የግዢ ወጪ ያስገቡ።',
  'purchases.errors.date': 'የግዢ ቀን ይምረጡ።',
  'purchases.errors.expiry': 'የማብቂያ ቀን ከግዢ ቀን በፊት መሆን አይችልም።',
  'purchases.notice.confirmed':
    'ግዢ {code} ተረጋግጧል — {count} {unit} ወደ ክምችት ተጨምሯል።',

  // Packaging page
  'packaging.title': 'ማሸጊያ',
  'packaging.subtitle':
    'እያንዳንዱ መድሃኒት እንዴት እንደሚሸጥ እና ወደ መሰረታዊ የክምችት አሃዱ እንደሚቀየር ያዘጋጁ።',
  'packaging.noMedicines':
    'እስካሁን መድሃኒት የለም። መጀመሪያ በክምችት ገጽ ላይ መድሃኒት ይጨምሩ።',
  'packaging.selectTitle': 'መድሃኒት ይምረጡ',
  'packaging.selectSubtitle':
    'የተለያዩ መድሃኒቶች የተለያዩ የማሸጊያ አወቃቀሮች ሊኖራቸው ይችላል።',
  'packaging.medicine': 'መድሃኒት',
  'packaging.baseUnitCurrent':
    'መሰረታዊ አሃድ፡ {unit} · የአሁኑ ክምችት፡ {count} {unitLabel}',
  'packaging.save': 'ማሸጊያ አስቀምጥ',
  'packaging.saved':
    'ማሸጊያ እና የመሸጫ ዋጋዎች ለ{name} ተቀምጠዋል። ያለው ክምችት {count} {unit} ሆኖ ይቆያል።',
  'packaging.saveError': 'ማሸጊያውን ማስቀመጥ አልተቻለም።',
  'packaging.hint':
    'ማሸጊያን መቀየር ያለውን ክምችት አይቀይርም ወይም አይሰርዝም። ክምችት ሁልጊዜ በትንሹ አሃድ ({unit}) ይቀመጣል።',
  'packaging.previewTitle': 'የልወጣ ቅድመ እይታ',
  'packaging.previewSubtitle': 'በግራ በኩል ካሉት ደረጃዎች የተሰላ',
  'packaging.receivingExample': 'የመቀበያ ምሳሌ',
  'packaging.sellingExample': 'የመሸጫ ምሳሌ',
  'packaging.adds': '1 {unit} {count} {base} ይጨምራል',
  'packaging.removes': '2 {unit} {count} {base} ያስወግዳል',
  'packaging.unitPrices': 'የአንድ ክፍል ዋጋዎች',
  'packaging.unit': 'አሃድ',
  'packaging.contains': 'ይይዛል',
  'packaging.price': 'ዋጋ',
  'packaging.completeLevels':
    'ልወጣዎችን ለማየት የማሸጊያ ደረጃዎችን ያሟሉ።',

  // Packaging editor
  'editor.level': 'የማሸጊያ ደረጃ',
  'editor.contains': 'የያዘው (መሰረታዊ አሃዶች)',
  'editor.price': 'የመሸጫ ዋጋ (ብር)',
  'editor.actions': 'ድርጊቶች',
  'editor.unitPlaceholder': 'ለምሳሌ ስትሪፕ',
  'editor.pricePlaceholder': 'ለምሳሌ 25',
  'editor.unitAria': 'የማሸጊያ አሃድ {index}',
  'editor.containsAria': 'በማሸጊያ ደረጃ {index} ያሉ መሰረታዊ አሃዶች',
  'editor.priceAria': 'የማሸጊያ ደረጃ {index} የመሸጫ ዋጋ በብር',
  'editor.addLevel': 'የማሸጊያ ደረጃ ጨምር',
  'editor.hint':
    'ትንሹ አሃድ መሰረታዊ የክምችት አሃድ ነው። እያንዳንዱ ትልቅ ደረጃ ስንት መሰረታዊ አሃዶች እንደያዘ ይገልጻል። ዋጋዎች ለእያንዳንዱ ለሚሸጥ አሃድ ይቀመጣሉ።',

  // Expiry page
  'expiry.title': 'የማብቂያ አስተዳደር',
  'expiry.subtitle': 'ክምችት ያላቸው ባቾች በማብቂያ ቀን ተራ ተደርገው።',
  'expiry.summaryAria': 'የማብቂያ ማጠቃለያ',
  'expiry.expiringSoon': 'በቅርቡ የሚያበቃ',
  'expiry.expired': 'ጊዜው ያለፈ',
  'expiry.batchesWithStock': 'ክምችት ያላቸው ባቾች',
  'expiry.batches': 'ባቾች',
  'expiry.shownCount': ({ count = 0 }) => `${count} ባች ይታያል`,
  'expiry.filterAria': 'የማብቂያ ማጣሪያ',
  'expiry.filterAlerts': 'በ{days} ቀናት ውስጥ የሚያበቁ',
  'expiry.filterExpired': 'ጊዜው ያለፈ',
  'expiry.filterAll': 'ሁሉም ባቾች',
  'expiry.emptyExpired': 'ክምችት ያላቸው ጊዜው ያለፉ ባቾች የሉም።',
  'expiry.emptyAll': 'ክምችት ያላቸው የግዢ ባቾች እስካሁን የሉም።',
  'expiry.emptyAlerts': 'በ{days} ቀናት ውስጥ የሚያበቃ ባች የለም።',
  'expiry.medicine': 'መድሃኒት',
  'expiry.batch': 'ባች',
  'expiry.expiryDate': 'የማብቂያ ቀን',
  'expiry.status': 'ሁኔታ',
  'expiry.remainingStock': 'የቀረ ክምችት',

  // Audit reports
  'audit.title': 'የኦዲት ሪፖርቶች',
  'audit.subtitle':
    'ከፋርማሲ ግብይቶችዎ የቀን፣ ወርሃዊ፣ ሩብ ዓመት እና ዓመታዊ የግዢ፣ የሽያጭ እና የወጪ ሪፖርት።',
  'audit.print': 'ሪፖርት አትም',
  'audit.period': 'ጊዜ',
  'audit.periodAria': 'የኦዲት ሪፖርት ጊዜ',
  'audit.filters': 'የሪፖርት ማጣሪያዎች',
  'audit.filtersSubtitle': 'ግብይቶች በግዢ/ሽያጭ ቀን ይጣራሉ።',
  'audit.fromDate': 'ከቀን',
  'audit.toDate': 'እስከ ቀን',
  'audit.transactionType': 'የግብይት ዓይነት',
  'audit.allTransactions': 'ሁሉም ግብይቶች',
  'audit.salesOnly': 'ሽያጮች ብቻ',
  'audit.purchasesOnly': 'ግዢዎች ብቻ',
  'audit.inRange': ({ count = 0 }) => `${count} ግብይት በክልሉ ውስጥ`,
  'audit.dateRangeError':
    'የመጀመሪያው ቀን ከመጨረሻው ቀን በኋላ ነው፣ ስለዚህ ምንም ግብይት አይታይም።',
  'audit.totalsAria': 'የኦዲት ጠቅላላዎች',
  'audit.salesRevenue': 'የሽያጭ ገቢ',
  'audit.purchaseCosts': 'የግዢ ወጪዎች',
  'audit.cogs': 'የተሸጡ ሸቀጦች ወጪ',
  'audit.grossProfit': 'ጠቅላላ ትርፍ',
  'audit.grossProfitEstimated': 'ጠቅላላ ትርፍ (ግምት)',
  'audit.grossProfitCosted': 'ጠቅላላ ትርፍ (ወጪ ከተቆጠሩ ሽያጮች ብቻ)',
  'audit.costUnavailable': 'ወጪ አይገኝም',
  'audit.salesRecorded': 'የተመዘገቡ ሽያጮች',
  'audit.purchasesRecorded': 'የተመዘገቡ ግዢዎች',
  'audit.stockReceived': 'የገባ ክምችት',
  'audit.stockSold': 'የተሸጠ ክምችት',
  'audit.baseUnits': '{count} መሰረታዊ አሃዶች',
  'audit.incompleteTitle': 'የወጪ መረጃው ያልተሟላ ነው።',
  'audit.incompleteUnavailable': ({ count = 0 }) =>
    `${count} ሽያጭ አስተማማኝ የግዢ ወጪ የለውም። `,
  'audit.incompletePartial': ({ count = 0 }) =>
    `${count} ሽያጭ በከፊል ብቻ ወጪ ተቆጥሯል። `,
  'audit.incompleteTail': ({ count = 0 }) =>
    `ጠቅላላ ትርፍ እነዚያን ሽያጮች አያካትትም፤ COGS ሙሉ በሙሉ ወጪ የተቆጠሩ ${count} ሽያጮችን ብቻ ይሸፍናል።`,
  'audit.estimateNote':
    'ጠቅላላ ትርፍ በግዢ ታሪክዎ ውስጥ በተመዘገቡ የFIFO ባች ወጪዎች ላይ የተመሰረተ ግምት ነው። ተዘዋዋሪ ወጪዎችን አያካትትም።',
  'audit.detailsTitle': 'ዝርዝር ሪፖርት',
  'audit.detailsSubtitle':
    'ለተመረጠው ጊዜ ገበታ፣ ግብይቶች እና የክምችት እንቅስቃሴዎች',
  'audit.filteredTransactions': 'የተጣሩ ግብይቶች',
  'audit.filteredSubtitle':
    'ከ{from} እስከ {to} · ወጪ የተቆጠሩ ሽያጮች የFIFO ወጪ እና ጠቅላላ ትርፍ ያሳያሉ',
  'audit.noMatch': 'ከተመረጡት ማጣሪያዎች ጋር የሚዛመድ ግብይት የለም።',
  'audit.stockMovements': 'የክምችት እንቅስቃሴዎች',
  'audit.stockMovementsSubtitle':
    'በተመረጠው ክልል ውስጥ የእያንዳንዱ መድሃኒት የመሰረታዊ አሃድ እንቅስቃሴ',
  'audit.stockIn': 'የገባ ክምችት',
  'audit.stockOut': 'የወጣ ክምችት',
  'audit.netChange': 'የተጣራ ለውጥ',
  'audit.noMovement': 'በክልሉ ውስጥ የክምችት እንቅስቃሴ የለም።',
  'audit.lowStockItems': 'ዝቅተኛ ክምችት ያላቸው ዕቃዎች',
  'audit.lowStockSubtitle': 'የአሁኑ ክምችት፣ በቀን ያልተጣራ',
  'audit.stock': 'ክምችት',
  'audit.threshold': 'ገደብ',
  'audit.status': 'ሁኔታ',
  'audit.noLowStock': 'ዝቅተኛ ክምችት ያላቸው ዕቃዎች የሉም።',
  'audit.printRange': 'የኦዲት ሪፖርት · ከ{from} እስከ {to} · {type}',
  'audit.printGenerated': 'ከፋርማሲ መዝገቦችዎ የተፈጠረ',
  'audit.exportCsv': 'CSV ወጪ አድርግ',
  'audit.exportPeriodPrompt': 'ለCSV ሪፖርቱ የሚካተትን ጊዜ ይምረጡ።',
  'audit.exportCsvHint':
    'ለተመረጠው ጊዜ ድምሮችን፣ የግብይት ዝርዝርን እና የክምችት እንቅስቃሴዎችን ያወርዳል።',
  'audit.exportPeriodAria': 'የሪፖርቱ ጊዜ',
  'audit.csvSelectedPeriod': 'የተመረጠ ጊዜ',
  'audit.showDetails': 'ዝርዝሮችን አሳይ',
  'audit.hideDetails': 'ዝርዝሮችን ደብቅ',
  'audit.focusSales': 'ሽያጮች',
  'audit.focusPurchases': 'ግዢዎች',
  'audit.focusCosted': 'ወጪ የተቆጠሩ ሽያጮች',
  'audit.focusLabel': 'የሚታየው፡ {label}',
  'audit.focusClear': 'ማጣሪያውን አጽዳ',
  'audit.sortBy': 'በ{column} ደርድር',
  'audit.csvTitle': 'የፋርማትራክ የኦዲት ሪፖርት',
  'audit.csvPharmacy': 'ፋርማሲ',
  'audit.csvGenerated': 'የተፈጠረ',
  'audit.csvSummary': 'ማጠቃለያ',
  'audit.csvMetric': 'መለኪያ',
  'audit.csvValue': 'እሴት',
  'audit.chartTitle': 'የጊዜ እንቅስቃሴ',
  'audit.chartSubtitle': 'በተመረጠው ጊዜ ውስጥ ሽያጮች እና ግዢዎች',
  'audit.chartAria': 'በተመረጠው ጊዜ ውስጥ ሽያጮች እና ግዢዎች',
  'audit.chartEmpty': 'በዚህ ጊዜ ውስጥ ግብይት የለም።',
  'audit.chartSales': 'ሽያጮች',
  'audit.chartPurchases': 'ግዢዎች',

  // Staff
  'staff.title': 'ሰራተኞች',
  'staff.subtitle':
    'የፋርማሲ አባልነቶች እና ሚናዎች። የሰራተኛ መለያዎች የሚፈጠሩት ተጠቃሚ ወደ ፋርማሲዎ ሲጨመር ነው።',
  'staff.members': 'የፋርማሲ አባላት',
  'staff.memberCount': ({ count = 0 }) => `${count} አባል`,
  'staff.empty':
    'ምንም የሰራተኛ አባልነት አልተጫነም። መዳረሻ ለመስጠት ተጠቃሚውን በመለያ ማዋቀሪያዎ በኩል ወደ ፋርማሲዎ ይጋብዙ።',
  'staff.member': 'አባል',
  'staff.phone': 'ስልክ',
  'staff.role': 'ሚና',
  'staff.status': 'ሁኔታ',
  'staff.unnamed': 'ስም የሌለው አባል',
  'staff.you': 'እርስዎ',
  'staff.legacyRole': 'የቀድሞ የዳታቤዝ ሚና፡ {role}',
  'staff.active': 'ንቁ',
  'staff.inactive': 'ያልነቃ',
  'staff.invited': 'ተጋብዟል',
  'staff.roleAria': 'የ{name} ሚና',
  'staff.statusAria': 'የ{name} ሁኔታ',
  'staff.memberFallback': 'አባል',
  'staff.note':
    'ባለቤቶች ሚናዎችን መቀየር እና አባላትን ማቦዘን ይችላሉ። ገንዘብ ተቀባዮች ይህን ገጽ መክፈት አይችሉም፣ እና ዳታቤዙ ከባለቤት ያልሆኑ መለያዎች የሚደረጉ የአባልነት ለውጦችን ውድቅ ያደርጋል።',
  'staff.updated': '{name} ተዘምኗል።',
  'staff.updateError': 'የሰራተኛውን አባል ማዘመን አልተቻለም።',

  // Settings
  'settings.title': 'ቅንብሮች',
  'settings.subtitle': 'መተግበሪያው እንዴት እንደሚታይ እና እንደሚሰማ ይምረጡ።',
  'settings.preferences': 'ምርጫዎች',
  'settings.savedOnDevice': 'በዚህ መሳሪያ ላይ ተቀምጧል።',
  'settings.darkMode': 'ጨለማ ገጽታ',
  'settings.darkModeDescription':
    'ለዓይን ምቹ የሆነ ጨለማ ቀለም ይጠቀሙ።',
  'settings.amharic': 'አማርኛ',
  'settings.amharicDescription':
    'ገጹን በአማርኛ ያሳዩ። በማንኛውም ጊዜ ወደ እንግሊዝኛ መመለስ ይችላሉ።',

  // Sign in
  'signIn.title': 'ግባ',
  'signIn.subtitle': 'ከፋርማሲ አባልነትዎ ጋር የተገናኘውን የሰራተኛ መለያ ይጠቀሙ።',
  'signIn.email': 'ኢሜይል',
  'signIn.password': 'የይለፍ ቃል',
  'signIn.signingIn': 'በመግባት ላይ…',
  'signIn.submit': 'ግባ',
  'signIn.hint':
    'መዳረሻ እና ፈቃዶች በፋርማሲ አባልነትዎ እና በዳታቤዝ መመሪያዎች ይተገበራሉ።',
  'signIn.noAccess': 'የፋርማሲ መዳረሻ የለም',
  'signIn.noAccessEmail':
    '{email} ገብቷል ነገር ግን ንቁ የፋርማሲ አባልነት የለውም።',
  'signIn.noAccessGeneric': 'ይህ መለያ ንቁ የፋርማሲ አባልነት የለውም።',
  'signIn.askOwner':
    'የሰራተኛ መለያዎን እንዲጨምር የፋርማሲውን ባለቤት ይጠይቁ፣ ከዚያ እንደገና ይግቡ።',
  'signIn.signOut': 'ውጣ',

  // Medicine picker
  'picker.searchAria': 'መድሃኒቶችን በስም ወይም በጥንካሬ ፈልግ',
  'picker.searchPlaceholder': 'በመድሃኒት ስም ወይም በጥንካሬ ፈልግ',
  'picker.emptyInventory': 'እስካሁን በክምችት ውስጥ መድሃኒት የለም።',
  'picker.notFound': 'መድሃኒቱ በክምችት ውስጥ አልተገኘም።',
  'picker.noMatch': 'ለ“{term}” ተዛማጅ የለም።',
  'picker.addNew': '+ አዲስ መድሃኒት ጨምር',
  'picker.ownerOnly':
    'መድሃኒት መጨመር የሚችለው ባለቤት ብቻ ነው። እንዲጨምር ባለቤቱን ይጠይቁ፣ ከዚያ እንደገና ይፈልጉ።',
  'picker.chooseAria': 'መድሃኒት ይምረጡ',
  'picker.availableStock': 'ያለ ክምችት፡ {count} {unit}',

  // Medicine form
  'form.editTitle': 'መድሃኒት አርትዕ',
  'form.quickAddTitle': 'የጎደለ መድሃኒት ጨምር',
  'form.addTitle': 'መድሃኒት ጨምር',
  'form.quickAddSubtitle':
    'መድሃኒቱን እዚህ ያስቀምጡ፣ ከዚያ ሽያጩን መመዝገብ ይቀጥሉ።',
  'form.subtitle': 'ለውጦች በፋርማሲ መዝገቦችዎ ውስጥ ይቀመጣሉ።',
  'form.saving': 'በማስቀመጥ ላይ…',
  'form.saveChanges': 'ለውጦችን አስቀምጥ',
  'form.addContinue': 'ጨምርና ቀጥል',
  'form.addMedicine': 'መድሃኒት ጨምር',
  'form.imageSection': 'የመድሃኒት ምስል',
  'form.previewAlt': 'የመድሃኒት ቅድመ እይታ',
  'form.noImage': 'ምስል አልተመረጠም',
  'form.replaceImage': 'ምስል ቀይር',
  'form.uploadImage': 'ምስል ስቀል',
  'form.imageHint': 'JPG፣ PNG ወይም WebP እስከ 5 MB።',
  'form.name': 'የመድሃኒት ስም',
  'form.namePlaceholder': 'ለምሳሌ አሞክሲሲሊን',
  'form.strength': 'ጥንካሬ',
  'form.strengthPlaceholder': 'ለምሳሌ 500 mg',
  'form.duplicateWarning':
    '{name} {strength} አስቀድሞ በክምችት ውስጥ አለ። አዲስ ከመፍጠር ይልቅ ያለውን መድሃኒት ይምረጡ።',
  'form.dosageForm': 'የመድሃኒት ዓይነት',
  'form.baseUnit': 'መሰረታዊ አሃድ (ትንሹ የሚከታተል አሃድ)',
  'form.baseUnitPlaceholder': 'ለምሳሌ ታብሌት',
  'form.threshold': 'የዝቅተኛ ክምችት ገደብ (መሰረታዊ አሃዶች)',
  'form.openingStock': 'የመክፈቻ ክምችት ({unit})',
  'form.baseUnits': 'መሰረታዊ አሃዶች',
  'form.openingHint': 'በ{unit} የመክፈቻ ክምችት እንቅስቃሴ ሆኖ ይመዘገባል።',
  'form.packagingSection': 'የማሸጊያ ውቅር እና የመሸጫ ዋጋዎች',
  'form.packagingHint':
    'ለእያንዳንዱ ለሚሸጥ አሃድ የመሸጫ ዋጋ ያስገቡ። እነዚህ የተቀመጡ ዋጋዎች በሽያጭ ውስጥ በራስ-ሰር ይጠቀማሉ፤ ገንዘብ ተቀባይ የመድሃኒቱን መዝገብ ሳይቀይር አንድ ሽያጭን ማስተካከል ይችላል።',
  'form.baseUnitFallback': 'መሰረታዊ አሃድ',
  'form.duplicateError':
    '{name} {strength} አስቀድሞ በክምችት ውስጥ አለ። አዲስ ከመፍጠር ይልቅ ያለውን ይምረጡ።',
  'form.saveError': 'መድሃኒቱን ማስቀመጥ አልተቻለም።',
  'form.imageSaveError': 'መድሃኒቱ ተቀምጧል፣ ነገር ግን ምስሉ ሊሰቀል አልቻለም።',

  // Dosage forms
  'dosage.Tablet': 'ታብሌት',
  'dosage.Capsule': 'ካፕሱል',
  'dosage.Syrup': 'ሽሮፕ',
  'dosage.Injection': 'መርፌ',
  'dosage.Injection pen': 'የመርፌ እስክሪብቶ',
  'dosage.Sachet': 'ሳሽ',
  'dosage.Cream': 'ክሬም',
  'dosage.Drops': 'ጠብታ',
  'dosage.Inhaler': 'ማስተንፋሻ',
  'dosage.Vial': 'ቪያል',
  'dosage.Other': 'ሌላ',

  // Modal and confirm
  'modal.close': 'ንግግሩን ዝጋ',
  'confirm.message': 'አረጋግጥ',
}

export const translations = { en, am }

function interpolate(template, params) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key]
    return value === undefined || value === null ? match : String(value)
  })
}

export function translate(language, key, params) {
  const dictionary = translations[language] ?? translations.en
  const entry = dictionary[key] ?? translations.en[key]
  if (entry === undefined) return key
  if (typeof entry === 'function') return entry(params ?? {})
  return interpolate(entry, params)
}

// Dosage form values are stored in English. Translate for display only.
export function translateDosage(t, value) {
  if (!value) return ''
  return t(`dosage.${value}`)
}
