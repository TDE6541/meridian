const {
  createHash,
  createHmac,
  timingSafeEqual,
} = require("node:crypto");

const {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
} = require("../contracts");
const { isValidDateTimeString } = require("./authorityContracts");

const AUTHORITY_ACTION_TOKEN_PREFIX = "garp-action-v1";
const AUTHORITY_ACTION_TOKEN_ACTIONS = Object.freeze([
  "approve",
  "deny",
  "request_info",
]);

function createTokenResult(ok, extra = {}, issues = []) {
  return {
    ok,
    valid: ok,
    status: ok ? "PASS" : "HOLD",
    issues: Object.freeze([...issues]),
    ...extra,
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payloadText, secret) {
  return createHmac("sha256", secret).update(payloadText).digest("hex");
}

function safeEqualHex(left, right) {
  if (!isNonEmptyString(left) || !isNonEmptyString(right)) {
    return false;
  }

  if (left.length !== right.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
  } catch (_error) {
    return false;
  }
}

function hashAuthorityActionToken(token) {
  if (!isNonEmptyString(token)) {
    return null;
  }

  return createHash("sha256").update(token).digest("hex");
}

function validateTokenPayload(payload) {
  const issues = [];

  if (!isPlainObject(payload)) {
    return createValidationResult(["token payload must be a plain object."]);
  }

  if (payload.token_version !== AUTHORITY_ACTION_TOKEN_PREFIX) {
    issues.push(`token_version must equal ${AUTHORITY_ACTION_TOKEN_PREFIX}.`);
  }

  if (!isNonEmptyString(payload.request_id)) {
    issues.push("request_id must be a non-empty string.");
  }

  if (!AUTHORITY_ACTION_TOKEN_ACTIONS.includes(payload.action)) {
    issues.push(`action is not allowed: ${String(payload.action)}`);
  }

  if (!isValidDateTimeString(payload.issued_at)) {
    issues.push("issued_at must be a valid date-time string.");
  }

  if (!isValidDateTimeString(payload.expires_at)) {
    issues.push("expires_at must be a valid date-time string.");
  }

  if (
    isValidDateTimeString(payload.issued_at) &&
    isValidDateTimeString(payload.expires_at) &&
    Date.parse(payload.expires_at) <= Date.parse(payload.issued_at)
  ) {
    issues.push("expires_at must be after issued_at.");
  }

  return createValidationResult(issues);
}

function normalizeSecret(options = {}) {
  return isNonEmptyString(options.secret)
    ? options.secret
    : isNonEmptyString(options.tokenSecret)
    ? options.tokenSecret
    : null;
}

function createAuthorityActionToken(input = {}, options = {}) {
  const secret = normalizeSecret(options);

  if (!secret) {
    return createTokenResult(false, { token: null, payload: null }, [
      "token_secret_required",
    ]);
  }

  const payload = {
    token_version: AUTHORITY_ACTION_TOKEN_PREFIX,
    request_id: input.request_id,
    action: input.action,
    issued_at: input.issued_at,
    expires_at: input.expires_at,
  };
  const validation = validateTokenPayload(payload);

  if (!validation.valid) {
    return createTokenResult(false, { token: null, payload: null }, validation.issues);
  }

  const payloadText = stableStringify(payload);
  const encodedPayload = base64UrlEncode(payloadText);
  const signature = signPayload(payloadText, secret);
  const token = `${AUTHORITY_ACTION_TOKEN_PREFIX}.${encodedPayload}.${signature}`;

  return createTokenResult(true, {
    token,
    token_hash: hashAuthorityActionToken(token),
    payload,
  });
}

function decodeAuthorityActionToken(token) {
  if (!isNonEmptyString(token)) {
    return createTokenResult(false, { payload: null }, [
      "token must be a non-empty string.",
    ]);
  }

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== AUTHORITY_ACTION_TOKEN_PREFIX) {
    return createTokenResult(false, { payload: null }, [
      "token is malformed.",
    ]);
  }

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return createTokenResult(true, {
      payload,
      encoded_payload: parts[1],
      signature: parts[2],
    });
  } catch (_error) {
    return createTokenResult(false, { payload: null }, [
      "token payload is malformed.",
    ]);
  }
}

function resolveVerificationCurrentTime(input = {}, options = {}) {
  const inputTime = input.current_time;
  const optionTime = options.currentTime;

  if (isNonEmptyString(inputTime) && isNonEmptyString(optionTime)) {
    if (inputTime !== optionTime) {
      return {
        current_time: null,
        issues: ["current_time_conflict"],
      };
    }

    return {
      current_time: inputTime,
      issues: [],
    };
  }

  return {
    current_time: isNonEmptyString(inputTime)
      ? inputTime
      : isNonEmptyString(optionTime)
      ? optionTime
      : null,
    issues: [],
  };
}

function verifyAuthorityActionToken(token, expected = {}, options = {}) {
  const secret = normalizeSecret(options);
  if (!secret) {
    return createTokenResult(false, { payload: null, token_hash: null }, [
      "token_secret_required",
    ]);
  }

  const current = resolveVerificationCurrentTime(expected, options);
  if (current.issues.length > 0) {
    return createTokenResult(false, { payload: null, token_hash: null }, current.issues);
  }

  if (!isValidDateTimeString(current.current_time)) {
    return createTokenResult(false, { payload: null, token_hash: null }, [
      "current_time_required",
    ]);
  }

  const decoded = decodeAuthorityActionToken(token);
  if (!decoded.ok) {
    return createTokenResult(false, { payload: null, token_hash: null }, decoded.issues);
  }

  const validation = validateTokenPayload(decoded.payload);
  if (!validation.valid) {
    return createTokenResult(false, { payload: decoded.payload, token_hash: null }, validation.issues);
  }

  const payloadText = stableStringify(decoded.payload);
  const expectedSignature = signPayload(payloadText, secret);
  if (!safeEqualHex(decoded.signature, expectedSignature)) {
    return createTokenResult(false, { payload: decoded.payload, token_hash: null }, [
      "token_signature_invalid",
    ]);
  }

  if (
    isNonEmptyString(expected.request_id) &&
    decoded.payload.request_id !== expected.request_id
  ) {
    return createTokenResult(false, { payload: decoded.payload, token_hash: null }, [
      "token_request_id_mismatch",
    ]);
  }

  if (
    isNonEmptyString(expected.action) &&
    decoded.payload.action !== expected.action
  ) {
    return createTokenResult(false, { payload: decoded.payload, token_hash: null }, [
      "token_action_mismatch",
    ]);
  }

  if (Date.parse(current.current_time) > Date.parse(decoded.payload.expires_at)) {
    return createTokenResult(false, { payload: decoded.payload, token_hash: null }, [
      "token_expired",
    ]);
  }

  return createTokenResult(true, {
    payload: decoded.payload,
    token_hash: hashAuthorityActionToken(token),
  });
}

module.exports = {
  AUTHORITY_ACTION_TOKEN_ACTIONS,
  AUTHORITY_ACTION_TOKEN_PREFIX,
  createAuthorityActionToken,
  decodeAuthorityActionToken,
  hashAuthorityActionToken,
  stableStringify,
  verifyAuthorityActionToken,
};
