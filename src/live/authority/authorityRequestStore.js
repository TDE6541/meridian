const {
  AUTHORITY_REQUEST_STORE_CONTRACT_VERSION,
  G2_GENERATED_AUTHORITY_REQUEST_STATUS,
  cloneJsonValue,
  validateAuthorityResolutionRequestV1,
} = require("./authorityContracts");

function createStoreResult(ok, extra = {}, issues = []) {
  return {
    ok,
    valid: ok,
    issues: Object.freeze([...issues]),
    ...extra,
  };
}

function createAuthorityRequestStore(initialRequests = []) {
  const requests = [];
  const initializationIssues = [];

  function hasRequestId(requestId) {
    return requests.some((request) => request.request_id === requestId);
  }

  function findPendingRequestBySourceAbsenceId(sourceAbsenceId) {
    const request = requests.find(
      (entry) =>
        entry.source_absence_id === sourceAbsenceId &&
        entry.status === G2_GENERATED_AUTHORITY_REQUEST_STATUS
    );

    return request ? cloneJsonValue(request) : null;
  }

  function hasPendingRequestForSourceAbsenceId(sourceAbsenceId, excludedRequestId) {
    return requests.some(
      (entry) =>
        entry.source_absence_id === sourceAbsenceId &&
        entry.status === G2_GENERATED_AUTHORITY_REQUEST_STATUS &&
        entry.request_id !== excludedRequestId
    );
  }

  function validateStoreRequest(request, excludedRequestId = null) {
    const validation = validateAuthorityResolutionRequestV1(request);
    const issues = [...validation.issues];

    if (validation.valid && hasRequestId(request.request_id)) {
      const isSameRequest =
        excludedRequestId !== null && request.request_id === excludedRequestId;
      if (!isSameRequest) {
        issues.push(`request_id already exists: ${request.request_id}`);
      }
    }

    if (
      validation.valid &&
      request.status === G2_GENERATED_AUTHORITY_REQUEST_STATUS &&
      hasPendingRequestForSourceAbsenceId(
        request.source_absence_id,
        excludedRequestId
      )
    ) {
      issues.push(
        `pending request already exists for source_absence_id: ${request.source_absence_id}`
      );
    }

    return issues;
  }

  function addRequest(request) {
    const issues = validateStoreRequest(request);

    if (issues.length > 0) {
      return createStoreResult(false, { request: null }, issues);
    }

    const stored = cloneJsonValue(request);
    requests.push(stored);

    return createStoreResult(true, { request: cloneJsonValue(stored) });
  }

  function listRequests() {
    return requests.map(cloneJsonValue);
  }

  function getRequestById(requestId) {
    const request = requests.find((entry) => entry.request_id === requestId);
    return request ? cloneJsonValue(request) : null;
  }

  function updateRequestById(requestId, updater) {
    const index = requests.findIndex((entry) => entry.request_id === requestId);

    if (index === -1) {
      return createStoreResult(false, { request: null }, [
        `request_id not found: ${String(requestId)}`,
      ]);
    }

    if (typeof updater !== "function") {
      return createStoreResult(false, { request: null }, [
        "updater must be a function.",
      ]);
    }

    const previous = cloneJsonValue(requests[index]);
    let next;

    try {
      next = updater(cloneJsonValue(previous));
    } catch (error) {
      return createStoreResult(false, { request: null }, [
        `updater failed: ${error.message}`,
      ]);
    }

    if (!next || typeof next !== "object" || Array.isArray(next)) {
      return createStoreResult(false, { request: null }, [
        "updated request must be a plain object.",
      ]);
    }

    if (next.request_id !== requestId) {
      return createStoreResult(false, { request: null }, [
        "request_id cannot be changed.",
      ]);
    }

    const issues = validateStoreRequest(next, requestId);
    if (issues.length > 0) {
      return createStoreResult(false, { request: null }, issues);
    }

    const stored = cloneJsonValue(next);
    requests[index] = stored;

    return createStoreResult(true, {
      previous_request: previous,
      request: cloneJsonValue(stored),
    });
  }

  function exportSnapshot() {
    return {
      contract: AUTHORITY_REQUEST_STORE_CONTRACT_VERSION,
      requests: listRequests(),
    };
  }

  for (const request of Array.isArray(initialRequests) ? initialRequests : []) {
    const added = addRequest(request);
    if (!added.ok) {
      initializationIssues.push(...added.issues);
    }
  }

  return Object.freeze({
    addRequest,
    exportSnapshot,
    findPendingRequestBySourceAbsenceId,
    getRequestById,
    initialization_issues: Object.freeze(initializationIssues),
    listRequests,
    updateRequestById,
  });
}

module.exports = {
  createAuthorityRequestStore,
};
