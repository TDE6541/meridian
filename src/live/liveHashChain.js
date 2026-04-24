const crypto = require("node:crypto");

const LIVE_HASH_CHAIN_GENESIS = "GENESIS";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createValidationResult(issues, extra = {}) {
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze([...issues]),
    ...extra,
  });
}

function stringifyCanonicalValue(value, path, seen) {
  if (value === null) {
    return {
      valid: true,
      json: "null",
      issues: [],
    };
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return {
      valid: true,
      json: JSON.stringify(value),
      issues: [],
    };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return {
        valid: false,
        json: "",
        issues: [`${path} must be a finite number.`],
      };
    }

    return {
      valid: true,
      json: JSON.stringify(value),
      issues: [],
    };
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return {
        valid: false,
        json: "",
        issues: [`${path} must not contain circular references.`],
      };
    }

    seen.add(value);

    const parts = [];
    const issues = [];
    value.forEach((entry, index) => {
      const result = stringifyCanonicalValue(entry, `${path}[${index}]`, seen);
      if (!result.valid) {
        issues.push(...result.issues);
      }
      parts.push(result.json);
    });

    seen.delete(value);

    return {
      valid: issues.length === 0,
      json: `[${parts.join(",")}]`,
      issues,
    };
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) {
      return {
        valid: false,
        json: "",
        issues: [`${path} must not contain circular references.`],
      };
    }

    seen.add(value);

    const keys = Object.keys(value).sort();
    const parts = [];
    const issues = [];

    for (const key of keys) {
      const entry = value[key];
      if (entry === undefined || typeof entry === "function") {
        issues.push(`${path}.${key} must be JSON-serializable.`);
        continue;
      }

      if (typeof entry === "symbol" || typeof entry === "bigint") {
        issues.push(`${path}.${key} must be JSON-serializable.`);
        continue;
      }

      const result = stringifyCanonicalValue(entry, `${path}.${key}`, seen);
      if (!result.valid) {
        issues.push(...result.issues);
      }

      parts.push(`${JSON.stringify(key)}:${result.json}`);
    }

    seen.delete(value);

    return {
      valid: issues.length === 0,
      json: `{${parts.join(",")}}`,
      issues,
    };
  }

  return {
    valid: false,
    json: "",
    issues: [`${path} must be JSON-serializable.`],
  };
}

function canonicalJson(value) {
  const result = stringifyCanonicalValue(value, "$", new WeakSet());
  return createValidationResult(result.issues, {
    json: result.valid ? result.json : null,
  });
}

function omitCurrentHash(record) {
  if (!isPlainObject(record)) {
    return null;
  }

  const nextRecord = {};
  for (const key of Object.keys(record)) {
    if (key !== "hash") {
      nextRecord[key] = record[key];
    }
  }

  return nextRecord;
}

function hashCanonicalJson(json) {
  return crypto.createHash("sha256").update(json, "utf8").digest("hex");
}

function hashRecord(record) {
  const issues = [];

  if (!isPlainObject(record)) {
    return createValidationResult(
      ["record must be a plain object."],
      { hash: null, canonical: null }
    );
  }

  if (typeof record.previous_hash !== "string" || record.previous_hash === "") {
    issues.push("record.previous_hash must be a non-empty string.");
  }

  const hashInput = omitCurrentHash(record);
  const canonical = canonicalJson(hashInput);
  issues.push(...canonical.issues);

  if (issues.length > 0) {
    return createValidationResult(issues, {
      hash: null,
      canonical: null,
    });
  }

  return createValidationResult([], {
    hash: hashCanonicalJson(canonical.json),
    canonical: canonical.json,
  });
}

function verifyRecordHash(record) {
  const result = hashRecord(record);
  const issues = [...result.issues];

  if (result.valid && record.hash !== result.hash) {
    issues.push("record.hash does not match canonical record hash.");
  }

  return createValidationResult(issues, {
    expected_hash: result.hash,
  });
}

module.exports = {
  LIVE_HASH_CHAIN_GENESIS,
  canonicalJson,
  hashCanonicalJson,
  hashRecord,
  verifyRecordHash,
};
