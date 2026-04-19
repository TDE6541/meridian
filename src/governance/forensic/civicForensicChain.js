const CIVIC_FORENSIC_CHAIN_VERSION = "wave6-packet1-civic-forensic-chain-v1";

const ACTIVE_CIVIC_ENTRY_TYPES = Object.freeze([
  "GOVERNANCE_DECISION",
  "AUTHORITY_EVALUATION",
]);

const DEFERRED_CIVIC_ENTRY_TYPES = Object.freeze([
  "MEETING_DECISION",
  "PERMIT_ACTION",
  "INSPECTION_RESULT",
  "OBLIGATION_CREATED",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isStringArray(value) {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim() !== "")
  );
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (isPlainObject(value)) {
    const result = {};
    for (const [key, itemValue] of Object.entries(value)) {
      result[key] = cloneValue(itemValue);
    }

    return result;
  }

  return value;
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }

    return Object.freeze(value);
  }

  if (isPlainObject(value)) {
    for (const itemValue of Object.values(value)) {
      deepFreeze(itemValue);
    }

    return Object.freeze(value);
  }

  return value;
}

function normalizeBaseEntryTypes(baseEntryTypes = []) {
  if (!isStringArray(baseEntryTypes)) {
    throw new TypeError("baseEntryTypes must be an array of non-empty strings");
  }

  const uniqueTypes = [...new Set(baseEntryTypes)];

  for (const entryType of uniqueTypes) {
    if (ACTIVE_CIVIC_ENTRY_TYPES.includes(entryType)) {
      throw new Error(`base_entry_type_conflicts_with_active_type:${entryType}`);
    }

    if (DEFERRED_CIVIC_ENTRY_TYPES.includes(entryType)) {
      throw new Error(`base_entry_type_conflicts_with_deferred_type:${entryType}`);
    }
  }

  return Object.freeze(uniqueTypes);
}

function normalizeEntryType(entryType, allowedEntryTypes) {
  if (!isNonEmptyString(entryType)) {
    throw new TypeError("entry.entry_type must be a non-empty string");
  }

  if (DEFERRED_CIVIC_ENTRY_TYPES.includes(entryType)) {
    throw new Error(`deferred_civic_entry_type:${entryType}`);
  }

  if (!allowedEntryTypes.includes(entryType)) {
    throw new Error(`unknown_forensic_chain_entry_type:${entryType}`);
  }

  return entryType;
}

function normalizeLinkedEntryIds(value) {
  if (value === undefined) {
    return [];
  }

  if (!isStringArray(value)) {
    throw new TypeError("entry.linked_entry_ids must be an array of non-empty strings");
  }

  const uniqueEntryIds = [...new Set(value)];
  if (uniqueEntryIds.length !== value.length) {
    throw new Error("forensic_chain_duplicate_link_ref");
  }

  return uniqueEntryIds;
}

function normalizeSerializableEntry(input, allowedEntryTypes, knownEntryIds) {
  if (!isPlainObject(input)) {
    throw new TypeError("entry must be a plain object");
  }

  if (!isNonEmptyString(input.entry_id)) {
    throw new TypeError("entry.entry_id must be a non-empty string");
  }

  if (knownEntryIds.has(input.entry_id)) {
    throw new Error(`duplicate_entry_id:${input.entry_id}`);
  }

  const entryType = normalizeEntryType(input.entry_type, allowedEntryTypes);

  if (!isNonEmptyString(input.occurred_at)) {
    throw new TypeError("entry.occurred_at must be a non-empty string");
  }

  const linkedEntryIds = normalizeLinkedEntryIds(input.linked_entry_ids);
  if (linkedEntryIds.includes(input.entry_id)) {
    throw new Error(`forensic_chain_self_link:${input.entry_id}`);
  }

  for (const linkedEntryId of linkedEntryIds) {
    if (!knownEntryIds.has(linkedEntryId)) {
      throw new Error(`forensic_chain_dangling_link:${linkedEntryId}`);
    }
  }

  if (input.refs !== undefined && !isPlainObject(input.refs)) {
    throw new TypeError("entry.refs must be a plain object");
  }

  if (input.payload !== undefined && !isPlainObject(input.payload)) {
    throw new TypeError("entry.payload must be a plain object");
  }

  return deepFreeze({
    entry_id: input.entry_id,
    entry_type: entryType,
    occurred_at: input.occurred_at,
    linked_entry_ids: linkedEntryIds,
    refs: cloneValue(input.refs || {}),
    payload: cloneValue(input.payload || {}),
  });
}

class CivicForensicChain {
  constructor(options = {}) {
    if (!isPlainObject(options)) {
      throw new TypeError("options must be a plain object");
    }

    const baseEntryTypes =
      options.baseEntryTypes || options.base_entry_types || [];

    this.version = CIVIC_FORENSIC_CHAIN_VERSION;
    this.baseEntryTypes = normalizeBaseEntryTypes(baseEntryTypes);
    this.allowedEntryTypes = Object.freeze([
      ...this.baseEntryTypes,
      ...ACTIVE_CIVIC_ENTRY_TYPES,
    ]);
    this.entries = [];
    this.entryIds = new Set();

    if (options.entries !== undefined) {
      if (!Array.isArray(options.entries)) {
        throw new TypeError("options.entries must be an array");
      }

      this.appendAll(options.entries);
    }
  }

  append(entry) {
    const normalizedEntry = normalizeSerializableEntry(
      entry,
      this.allowedEntryTypes,
      this.entryIds
    );

    this.entries.push(normalizedEntry);
    this.entryIds.add(normalizedEntry.entry_id);

    return normalizedEntry;
  }

  appendAll(entries) {
    if (!Array.isArray(entries)) {
      throw new TypeError("entries must be an array");
    }

    return entries.map((entry) => this.append(entry));
  }

  hasEntry(entryId) {
    return this.entryIds.has(entryId);
  }

  getEntry(entryId) {
    return this.entries.find((entry) => entry.entry_id === entryId) || null;
  }

  getEntries() {
    return [...this.entries];
  }

  getSnapshot() {
    return {
      version: this.version,
      base_entry_types: [...this.baseEntryTypes],
      allowed_entry_types: [...this.allowedEntryTypes],
      entries: this.entries.map((entry) => cloneValue(entry)),
    };
  }

  static fromSnapshot(snapshot) {
    if (!isPlainObject(snapshot)) {
      throw new TypeError("snapshot must be a plain object");
    }

    if (snapshot.version !== CIVIC_FORENSIC_CHAIN_VERSION) {
      throw new Error(
        `unsupported_forensic_chain_snapshot_version:${snapshot.version || "unknown"}`
      );
    }

    return new CivicForensicChain({
      base_entry_types: snapshot.base_entry_types || [],
      entries: snapshot.entries || [],
    });
  }
}

module.exports = {
  ACTIVE_CIVIC_ENTRY_TYPES,
  CIVIC_FORENSIC_CHAIN_VERSION,
  DEFERRED_CIVIC_ENTRY_TYPES,
  CivicForensicChain,
  cloneValue,
  deepFreeze,
  normalizeBaseEntryTypes,
};
