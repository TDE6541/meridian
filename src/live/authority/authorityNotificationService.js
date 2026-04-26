const {
  isNonEmptyString,
  isPlainObject,
} = require("../contracts");
const {
  cloneJsonValue,
  isValidDateTimeString,
  validateAuthorityResolutionRequestV1,
} = require("./authorityContracts");
const {
  AUTHORITY_ACTION_TOKEN_ACTIONS,
  createAuthorityActionToken,
} = require("./authorityTokens");

const AUTHORITY_NOTIFICATION_CHANNEL_PRIORITY = Object.freeze([
  "simulated_device",
  "browser_push",
  "email",
]);

function createNotificationResult(ok, extra = {}, issues = []) {
  return {
    ok,
    valid: ok,
    status: ok ? "PASS" : "HOLD",
    issues: Object.freeze([...issues]),
    ...extra,
  };
}

function normalizeSecret(options = {}) {
  return isNonEmptyString(options.secret)
    ? options.secret
    : isNonEmptyString(options.tokenSecret)
    ? options.tokenSecret
    : null;
}

function resolveCurrentTime(input = {}, options = {}) {
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

function normalizeRouteBase(routeBaseUrl) {
  if (!isNonEmptyString(routeBaseUrl)) {
    return null;
  }

  return routeBaseUrl.replace(/\/+$/, "");
}

function normalizeChannels(inputChannels, recipientChannels) {
  const requested = Array.isArray(inputChannels)
    ? inputChannels
    : Array.isArray(recipientChannels)
    ? recipientChannels
    : ["simulated_device"];
  const unique = [...new Set(requested.filter(isNonEmptyString))];
  const supported = [];
  const skipped = [];

  for (const channel of unique) {
    if (AUTHORITY_NOTIFICATION_CHANNEL_PRIORITY.includes(channel)) {
      supported.push(channel);
    } else {
      skipped.push({
        channel,
        reason: "unsupported_channel",
      });
    }
  }

  supported.sort(
    (left, right) =>
      AUTHORITY_NOTIFICATION_CHANNEL_PRIORITY.indexOf(left) -
      AUTHORITY_NOTIFICATION_CHANNEL_PRIORITY.indexOf(right)
  );

  return {
    supported,
    skipped,
  };
}

function buildActionRoute(routeBaseUrl, requestId, action, token) {
  return `${routeBaseUrl}/authority/respond?request_id=${encodeURIComponent(
    requestId
  )}&action=${encodeURIComponent(action)}&token=${encodeURIComponent(token)}`;
}

function createActionTokens({ request, currentTime, routeBaseUrl, secret }) {
  const actionTokens = {};
  const actionTokenHashes = {};
  const issues = [];

  for (const action of AUTHORITY_ACTION_TOKEN_ACTIONS) {
    const created = createAuthorityActionToken(
      {
        request_id: request.request_id,
        action,
        issued_at: currentTime,
        expires_at: request.expiry,
      },
      { secret }
    );

    if (!created.ok) {
      issues.push(...created.issues);
      continue;
    }

    actionTokens[action] = {
      action,
      token: created.token,
      token_hash: created.token_hash,
      response_url: buildActionRoute(
        routeBaseUrl,
        request.request_id,
        action,
        created.token
      ),
    };
    actionTokenHashes[action] = created.token_hash;
  }

  return {
    action_tokens: actionTokens,
    action_token_hashes: actionTokenHashes,
    issues,
  };
}

function buildChannelPayload(channel, request, recipient, actionTokens) {
  const actions = AUTHORITY_ACTION_TOKEN_ACTIONS.map((action) => ({
    action,
    response_url: actionTokens[action].response_url,
  }));

  if (channel === "simulated_device") {
    return {
      device_ref: recipient.device_ref || recipient.recipient_id,
      title: "Authority resolution requested",
      body: `${request.required_authority_role} response requested for ${request.request_id}.`,
      actions: AUTHORITY_ACTION_TOKEN_ACTIONS.map((action) => ({
        action,
        response_token: actionTokens[action].token,
        response_url: actionTokens[action].response_url,
      })),
    };
  }

  if (channel === "browser_push") {
    return {
      endpoint_ref: recipient.browser_push_ref || recipient.recipient_id,
      title: "Authority resolution requested",
      body: `${request.required_authority_role} response requested for ${request.request_id}.`,
      data: {
        request_id: request.request_id,
        actions,
      },
    };
  }

  return {
    to_ref: recipient.email_ref || recipient.recipient_id,
    subject: `Authority resolution requested: ${request.request_id}`,
    body:
      `${request.required_authority_department} requires ` +
      `${request.required_authority_role} action.`,
    actions,
  };
}

function buildAuthorityNotificationPayload(input = {}, options = {}) {
  if (!isPlainObject(input)) {
    return createNotificationResult(false, { notification: null }, [
      "input must be a plain object.",
    ]);
  }

  const secret = normalizeSecret(options);
  if (!secret) {
    return createNotificationResult(false, { notification: null }, [
      "token_secret_required",
    ]);
  }

  const current = resolveCurrentTime(input, options);
  if (current.issues.length > 0) {
    return createNotificationResult(false, { notification: null }, current.issues);
  }

  if (!isValidDateTimeString(current.current_time)) {
    return createNotificationResult(false, { notification: null }, [
      "current_time_required",
    ]);
  }

  const routeBaseUrl = normalizeRouteBase(
    input.route_base_url || options.routeBaseUrl
  );
  if (!routeBaseUrl) {
    return createNotificationResult(false, { notification: null }, [
      "route_base_url_required",
    ]);
  }

  const request = input.request;
  const requestValidation = validateAuthorityResolutionRequestV1(request);
  if (!requestValidation.valid) {
    return createNotificationResult(false, { notification: null }, [
      ...requestValidation.issues,
    ]);
  }

  if (!isValidDateTimeString(request.expiry)) {
    return createNotificationResult(false, { notification: null }, [
      "request_expiry_required",
    ]);
  }

  const recipient = input.recipient;
  if (!isPlainObject(recipient) || !isNonEmptyString(recipient.recipient_id)) {
    return createNotificationResult(false, { notification: null }, [
      "recipient_required",
    ]);
  }

  const channels = normalizeChannels(input.channels, recipient.channels);
  if (channels.supported.length === 0) {
    return createNotificationResult(false, { notification: null }, [
      "supported_channel_required",
    ]);
  }

  const tokenSet = createActionTokens({
    request,
    currentTime: current.current_time,
    routeBaseUrl,
    secret,
  });
  if (tokenSet.issues.length > 0) {
    return createNotificationResult(false, { notification: null }, tokenSet.issues);
  }

  const notification = {
    kind: "authority_resolution_request_notification",
    built_at: current.current_time,
    request: cloneJsonValue(request),
    recipient: cloneJsonValue(recipient),
    channels: channels.supported.map((channel, index) => ({
      channel,
      priority: index + 1,
      payload: buildChannelPayload(
        channel,
        request,
        recipient,
        tokenSet.action_tokens
      ),
    })),
    skipped_channels: channels.skipped,
    evidence: {
      request_id: request.request_id,
      action_token_hashes: cloneJsonValue(tokenSet.action_token_hashes),
    },
    storage: {
      consumed_action_token_hashes: [],
      action_token_hashes: cloneJsonValue(tokenSet.action_token_hashes),
    },
  };

  return createNotificationResult(true, {
    notification,
    action_token_hashes: cloneJsonValue(tokenSet.action_token_hashes),
  });
}

module.exports = {
  AUTHORITY_NOTIFICATION_CHANNEL_PRIORITY,
  buildAuthorityNotificationPayload,
};
