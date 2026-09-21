// F5/F6/F8.1 — new photo surfaces, the pond Photos tab, and the first-upload
// acceptable-use acknowledgement (photos spec 2026-09-20). Does not touch the
// `storage` or `consent` namespaces (F2/F7, owned elsewhere).
const photos = {
  addPhoto: 'Add photo',
  takePhoto: 'Take photo',
  fromGallery: 'Choose from gallery',
  optional: 'Optional',
  uploadFailed: 'Could not add the photo. The record will still save.',
  removeFailed: 'Could not remove the photo.',
  capReached: 'You can add up to {{count}} photos here.',

  // F8.1: shown once, before the very first photo upload on the account.
  ackTitle: 'Before you add a photo',
  ackBody: 'Farm records only. Personal photos are not allowed here.',
  ackAccept: 'I understand',
  ackLink: 'Read the full rule',

  // F5 surface labels — the picker's prompt for what to photograph.
  surface: {
    expense_receipt: 'Bill or receipt',
    transaction_receipt: 'Bill or receipt',
    harvest_slip: "Buyer's weighing slip",
    treatment_label: 'Product label + batch number',
    feed_label: 'Feed label + batch number',
    inventory_label: 'Product label + batch number',
    inventory_purchase_receipt: 'Bill or receipt',
    seed_pcr: 'Seed PCR certificate',
    pond_identity: 'Pond photo',
    farm_identity: 'Farm photo',
    water_colour: 'Water colour',
    feed_tray: 'Feeding tray',
  },

  // F6: the pond Photos tab.
  tab: {
    title: 'Photos',
    empty: 'No photos in this pond yet.',
    loadFailed: 'Could not load photos. Pull down to try again.',
    filters: {
      all: 'All',
      health: 'Health',
      money: 'Money',
      inputs: 'Inputs',
      pond: 'Pond',
    },
    protectedBadge: 'Protected',
    hiddenForRole: 'Hidden — ask an owner or manager',
  },
};

export default photos;
