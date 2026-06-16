module.exports = function (api) {
    api.cache(true);
    return {
        // `unstable_transformImportMeta` rewrites `import.meta` to Expo's runtime
        // registry. Required for web: zustand's middleware module (pulled in via
        // `persist`) contains `import.meta.env` in its unused devtools impl; the
        // web bundle is served as a classic script, so leaving `import.meta` in
        // is a parse-time SyntaxError that blanks the whole app. Harmless on
        // native (the code path is dead) and avoids the Hermes import.meta throw.
        presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    };
};
