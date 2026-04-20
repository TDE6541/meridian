const {
  CIVIC_ABSENCE_REASONS,
  CIVIC_CLAIM_KINDS,
  CIVIC_SKIN_AUDIENCES,
  CIVIC_SKIN_INPUT_SCHEMA_VERSION,
  CIVIC_SKIN_SOURCE_KINDS,
  CIVIC_SKIN_VIEW_TYPES,
  CIVIC_SOURCE_REF_KINDS,
  CIVIC_TRUTH_FINGERPRINT_SCHEMA_VERSION,
  buildCivicSkinInput,
  buildTruthFingerprint,
  normalizeCivicSkinInput,
  registerSkin,
  renderSkin,
  resolveSkin,
} = require("./CivicSkinFramework");
const {
  PERMITTING_SKIN_ID,
  permittingSkinDescriptor,
} = require("./civic/permitting");

const DEFAULT_CIVIC_SKIN_REGISTRY = new Map();
registerSkin(DEFAULT_CIVIC_SKIN_REGISTRY, permittingSkinDescriptor);

function renderDefaultSkin(source, skinId = PERMITTING_SKIN_ID, options = {}) {
  const descriptor = resolveSkin(DEFAULT_CIVIC_SKIN_REGISTRY, skinId);
  if (!descriptor) {
    throw new TypeError(`Unknown civic skin id: ${skinId}`);
  }

  return renderSkin(source, descriptor, options);
}

module.exports = {
  CIVIC_ABSENCE_REASONS,
  CIVIC_CLAIM_KINDS,
  CIVIC_SKIN_AUDIENCES,
  CIVIC_SKIN_INPUT_SCHEMA_VERSION,
  CIVIC_SKIN_SOURCE_KINDS,
  CIVIC_SKIN_VIEW_TYPES,
  CIVIC_SOURCE_REF_KINDS,
  CIVIC_TRUTH_FINGERPRINT_SCHEMA_VERSION,
  DEFAULT_CIVIC_SKIN_REGISTRY,
  PERMITTING_SKIN_ID,
  buildCivicSkinInput,
  buildTruthFingerprint,
  normalizeCivicSkinInput,
  registerSkin,
  renderDefaultSkin,
  renderSkin,
  resolveSkin,
};
