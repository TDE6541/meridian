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

  function addRequest(request) {
    const validation = validateAuthorityResolutionRequestV1(request);
    const issues = [...validation.issues];

    if (validation.valid && hasRequestId(request.request_id)) {
      issues.push(`request_id already exists: ${request.request_id}`);
    }

    if (
      validation.valid &&
      request.status === G2_GENERATED_AUTHORITY_REQUEST_STATUS &&
      findPendingRequestBySourceAbsenceId(request.source_absence_id)
    ) {
      issues.push(
        `pending request already exists for source_absence_id: ${request.source_absence_id}`
      );
    }

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
  });
}

module.exports = {
  createAuthorityRequestStore,
};
