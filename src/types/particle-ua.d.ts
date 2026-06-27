// The Particle UA SDK ships types at dist/index.d.ts but its package.json
// "exports" map doesn't expose them, so TS can't resolve them under bundler
// resolution. Declare the module so imports type as `any` (we cast at the
// call sites). Drop this shim if the package fixes its exports.
declare module "@particle-network/universal-account-sdk";
