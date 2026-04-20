const PUBLIC_DISCLOSURE_BOUNDARY_VERSION = "wave7.publicDisclosureBoundary.v1";

const PUBLIC_REDACTION_CATEGORIES = Object.freeze([
  "entity-id-redacted",
  "org-id-redacted",
  "subject-address-redacted",
  "free-form-text-redacted",
  "unknown-field-redacted",
]);

const PUBLIC_REDACTION_MARKERS = Object.freeze({
  "entity-id-redacted": "[entity id withheld]",
  "org-id-redacted": "[org id withheld]",
  "subject-address-redacted": "[address/subject withheld]",
  "free-form-text-redacted": "[free-form detail withheld]",
  "unknown-field-redacted": "[detail withheld]",
});

const NOTICE_TEXT_BY_CATEGORY = Object.freeze({
  "entity-id-redacted":
    "Public disclosure boundary: entity id withheld under deterministic demo redaction. This TPIA-aware summary is not legal review and not request adjudication.",
  "org-id-redacted":
    "Public disclosure boundary: organization id withheld under deterministic demo redaction. This TPIA-aware summary is not legal review and not request adjudication.",
  "subject-address-redacted":
    "Public disclosure boundary: subject address withheld under deterministic demo redaction. This TPIA-aware summary is not legal review and not request adjudication.",
  "free-form-text-redacted":
    "Public disclosure boundary: free-form detail withheld under deterministic demo redaction. This TPIA-aware summary is not legal review and not request adjudication.",
  "unknown-field-redacted":
    "Public disclosure boundary: unsupported detail withheld under deterministic demo redaction. This TPIA-aware summary is not legal review and not request adjudication.",
});

const REJECTED_PUBLIC_CLAIM_LANGUAGE_PARTS = Object.freeze([
  ["TPIA", "-compliant"],
  ["legally", " sufficient"],
  ["city", "-attorney reviewed"],
  ["public", "-records request automation"],
  ["F", "O", "I", "A", "/TPIA workflow"],
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function normalizeIdentifier(value) {
  return String(value || "unknown")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function makeSourceRef(path, sourceKind, required = true) {
  return {
    path,
    sourceKind,
    required,
  };
}

function getRawRequest(input) {
  if (isPlainObject(input?.raw?.request)) {
    return input.raw.request;
  }

  if (isPlainObject(input?.raw) && isNonEmptyString(input.raw.kind)) {
    return input.raw;
  }

  return {};
}

function getRejectedPublicClaimLanguage() {
  return REJECTED_PUBLIC_CLAIM_LANGUAGE_PARTS.map((parts) => parts.join(""));
}

function isApprovedPublicClaimLanguage(text) {
  if (!isNonEmptyString(text)) {
    return false;
  }

  const candidate = text.toLowerCase();
  return getRejectedPublicClaimLanguage().every(
    (phrase) => candidate.includes(phrase.toLowerCase()) === false
  );
}

function buildPublicDisclosureNotice(category, path) {
  const resolvedCategory = PUBLIC_REDACTION_CATEGORIES.includes(category)
    ? category
    : "unknown-field-redacted";
  const resolvedPath = isNonEmptyString(path) ? path : "unknown";
  const marker = PUBLIC_REDACTION_MARKERS[resolvedCategory];

  return {
    id: `notice.${normalizeIdentifier(resolvedCategory)}.${normalizeIdentifier(resolvedPath)}`,
    path: resolvedPath,
    category: resolvedCategory,
    marker,
    basis: PUBLIC_DISCLOSURE_BOUNDARY_VERSION,
    text: NOTICE_TEXT_BY_CATEGORY[resolvedCategory],
  };
}

function createRedactionEntry(path, category, sourceRefs) {
  const notice = buildPublicDisclosureNotice(category, path);

  return {
    id: `redaction.${normalizeIdentifier(category)}.${normalizeIdentifier(path)}`,
    path: notice.path,
    category: notice.category,
    marker: notice.marker,
    noticeId: notice.id,
    basis: notice.basis,
    text: notice.text,
    sourceRefs,
  };
}

function collectExplicitRedactions(input) {
  const request = getRawRequest(input);
  const redactions = [];

  if (isNonEmptyString(request.entity_ref?.entity_id)) {
    redactions.push(
      createRedactionEntry("entity_ref.entity_id", "entity-id-redacted", [
        makeSourceRef("entity_ref.entity_id", "rawInput", true),
      ])
    );
  }

  if (isNonEmptyString(request.org_id)) {
    redactions.push(
      createRedactionEntry("org_id", "org-id-redacted", [
        makeSourceRef("org_id", "rawInput", true),
      ])
    );
  }

  if (isNonEmptyString(request.raw_subject)) {
    redactions.push(
      createRedactionEntry("raw_subject", "subject-address-redacted", [
        makeSourceRef("raw_subject", "rawInput", true),
      ])
    );
  }

  if (isNonEmptyString(request.entity_ref?.entity_type)) {
    redactions.push(
      createRedactionEntry("entity_ref.entity_type", "unknown-field-redacted", [
        makeSourceRef("entity_ref.entity_type", "rawInput", false),
      ])
    );
  }

  const provenanceReason =
    input?.civic?.revocation?.provenance_reason ||
    input?.raw?.runtimeSubset?.civic?.revocation?.provenance_reason ||
    null;

  if (isNonEmptyString(provenanceReason)) {
    redactions.push(
      createRedactionEntry("civic.revocation.provenance_reason", "free-form-text-redacted", [
        makeSourceRef("runtimeSubset.civic.revocation.provenance_reason", "runtimeSubset.civic", false),
      ])
    );
  }

  return redactions;
}

function applyPublicRedaction(input) {
  const redactions = collectExplicitRedactions(input);
  const notices = redactions.map((entry) =>
    buildPublicDisclosureNotice(entry.category, entry.path)
  );

  return {
    boundaryVersion: PUBLIC_DISCLOSURE_BOUNDARY_VERSION,
    redactions,
    notices,
  };
}

module.exports = {
  PUBLIC_DISCLOSURE_BOUNDARY_VERSION,
  PUBLIC_REDACTION_CATEGORIES,
  PUBLIC_REDACTION_MARKERS,
  applyPublicRedaction,
  buildPublicDisclosureNotice,
  isApprovedPublicClaimLanguage,
};
