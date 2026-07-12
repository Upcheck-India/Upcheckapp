// Farm team / worker membership screens.
const members = {
    // Profile QR
    workerCode: 'My worker code',
    workerCodeHint: 'Show this code to a farm owner so they can add you to their farm.',
    workerCodeCopied: 'Code copied',
    workerCodeShareMessage: 'My Upcheck worker code: {{code}}',

    // Members list
    title: 'Farm Team',
    emptyTitle: 'No team members yet',
    emptySub: 'Add a worker so they can log water quality and feed for this farm.',
    addWorker: 'Add worker',
    role_owner: 'Owner',
    role_worker: 'Worker',
    remove: 'Remove',
    removeTitle: 'Remove member',
    removeConfirm: 'Remove {{name}} from this farm?',
    removeError: 'Could not remove this member.',

    // Add worker
    scanTab: 'Scan QR',
    manualTab: 'Enter ID',
    scanHint: "Point the camera at the worker's profile QR code.",
    cameraChecking: 'Checking camera permission…',
    cameraDenied: 'Camera access is off. Allow it to scan, or enter the ID manually.',
    grantCamera: 'Allow camera',
    enterManually: 'Enter ID instead',
    identifierLabel: 'Worker ID, phone or email',
    identifierPlaceholder: 'Paste ID or type phone / email',
    findUser: 'Find user',

    // Lookup / add results
    notFoundTitle: 'User not found',
    notFoundSub: 'No account matches that identifier. Check and try again.',
    invalidQrTitle: 'Unrecognized QR',
    invalidQrSub: 'That is not an Upcheck worker code.',
    confirmAdd: 'Add to farm',
    addedTitle: 'Worker added',
    addedSub: '{{name}} can now log data for this farm.',
    addError: 'Could not add this worker.',
};

export default members;
