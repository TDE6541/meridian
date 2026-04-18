const ACTOR_DECISIONS = Object.freeze({
  ALLOW: "ALLOW",
  SUPERVISE: "SUPERVISE",
  HOLD: "HOLD",
  BLOCK: "BLOCK",
});

const ACTOR_RELATIONS = Object.freeze([
  "member_of",
  "reports_to",
  "grants_to",
  "inspects",
  "authorizes",
  "supersedes",
]);

const RELATION_PRECEDENCE = Object.freeze([
  "supersedes",
  "authorizes",
  "grants_to",
  "reports_to",
  "member_of",
  "inspects",
]);

const RELATION_RANK = Object.freeze(
  RELATION_PRECEDENCE.reduce((accumulator, relation, index) => {
    accumulator[relation] = RELATION_PRECEDENCE.length - index;
    return accumulator;
  }, {})
);

const DEFAULT_CHAIN_DEPTH_CAP = 4;

function hasOwnProperty(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function normalizeTuple(tuple) {
  if (
    !isPlainObject(tuple) ||
    !isNonEmptyString(tuple.subject) ||
    !isNonEmptyString(tuple.relation) ||
    !isNonEmptyString(tuple.object)
  ) {
    return null;
  }

  if (!ACTOR_RELATIONS.includes(tuple.relation)) {
    return {
      invalidRelation: true,
      relation: tuple.relation,
    };
  }

  return {
    subject: tuple.subject,
    relation: tuple.relation,
    object: tuple.object,
  };
}

function relationSignature(path) {
  return path.map((tuple) => tuple.relation).join(">");
}

function tupleSignature(path) {
  return path
    .map((tuple) => `${tuple.subject}:${tuple.relation}:${tuple.object}`)
    .join("|");
}

function compareRankVectors(left, right) {
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] || 0;
    const rightValue = right[index] || 0;

    if (leftValue !== rightValue) {
      return rightValue - leftValue;
    }
  }

  return 0;
}

function comparePaths(left, right) {
  const leftRanks = left.map((tuple) => RELATION_RANK[tuple.relation] || 0);
  const rightRanks = right.map((tuple) => RELATION_RANK[tuple.relation] || 0);
  const leftMaxRank = Math.max(...leftRanks, 0);
  const rightMaxRank = Math.max(...rightRanks, 0);

  if (leftMaxRank !== rightMaxRank) {
    return rightMaxRank - leftMaxRank;
  }

  if (left.length !== right.length) {
    return left.length - right.length;
  }

  const rankComparison = compareRankVectors(
    [...leftRanks].sort((a, b) => b - a),
    [...rightRanks].sort((a, b) => b - a)
  );
  if (rankComparison !== 0) {
    return rankComparison;
  }

  return tupleSignature(left).localeCompare(tupleSignature(right));
}

function buildAdjacency(tuples) {
  const adjacency = new Map();

  for (const tuple of tuples) {
    if (!adjacency.has(tuple.subject)) {
      adjacency.set(tuple.subject, []);
    }

    adjacency.get(tuple.subject).push(tuple);
  }

  for (const edgeList of adjacency.values()) {
    edgeList.sort((left, right) => {
      const rankComparison =
        (RELATION_RANK[right.relation] || 0) - (RELATION_RANK[left.relation] || 0);
      if (rankComparison !== 0) {
        return rankComparison;
      }

      const objectComparison = left.object.localeCompare(right.object);
      if (objectComparison !== 0) {
        return objectComparison;
      }

      return left.subject.localeCompare(right.subject);
    });
  }

  return adjacency;
}

function inactiveResolution() {
  return {
    active: false,
    decision: null,
    reason: "authority_actor_not_requested",
  };
}

function resolveAuthorityActor(request) {
  const authorityContext = request?.authority_context;

  if (
    !isPlainObject(authorityContext) ||
    !hasOwnProperty(authorityContext, "actor_context")
  ) {
    return inactiveResolution();
  }

  if (!isPlainObject(authorityContext.actor_context)) {
    return {
      active: true,
      decision: ACTOR_DECISIONS.BLOCK,
      reason: "actor_context_invalid",
    };
  }

  const actorContext = authorityContext.actor_context;
  const actorId = actorContext.actor_id;
  const targetId = actorContext.target_id;
  const chainDepthCap = actorContext.chain_depth_cap ?? DEFAULT_CHAIN_DEPTH_CAP;
  const tupleInputs = Array.isArray(actorContext.tuples) ? actorContext.tuples : null;

  if (
    !isNonEmptyString(actorId) ||
    !isNonEmptyString(targetId) ||
    !Array.isArray(tupleInputs) ||
    !Number.isInteger(chainDepthCap) ||
    chainDepthCap <= 0
  ) {
    return {
      active: true,
      decision: ACTOR_DECISIONS.BLOCK,
      reason: "actor_context_invalid",
    };
  }

  const normalizedTuples = [];
  for (const tupleInput of tupleInputs) {
    const tuple = normalizeTuple(tupleInput);

    if (!tuple) {
      return {
        active: true,
        decision: ACTOR_DECISIONS.BLOCK,
        reason: "actor_context_invalid",
      };
    }

    if (tuple.invalidRelation) {
      return {
        active: true,
        decision: ACTOR_DECISIONS.BLOCK,
        reason: "actor_relation_unsupported",
      };
    }

    normalizedTuples.push(tuple);
  }

  const adjacency = buildAdjacency(normalizedTuples);
  const successfulPaths = [];
  let cycleDetected = false;
  let depthCapExceeded = false;

  function visit(node, path, visitedNodes) {
    const edges = adjacency.get(node) || [];

    for (const edge of edges) {
      if (path.length >= chainDepthCap) {
        depthCapExceeded = true;
        continue;
      }

      if (visitedNodes.has(edge.object)) {
        cycleDetected = true;
        continue;
      }

      const nextPath = [...path, edge];
      if (edge.object === targetId) {
        successfulPaths.push(nextPath);
        continue;
      }

      visit(edge.object, nextPath, new Set([...visitedNodes, edge.object]));
    }
  }

  visit(actorId, [], new Set([actorId]));

  if (successfulPaths.length === 0) {
    const reason = cycleDetected
      ? "actor_delegation_cycle_detected"
      : depthCapExceeded
      ? "actor_delegation_chain_depth_exceeded"
      : "actor_authority_unresolved";

    return {
      active: true,
      decision:
        reason === "actor_authority_unresolved"
          ? ACTOR_DECISIONS.HOLD
          : ACTOR_DECISIONS.BLOCK,
      reason,
      lane:
        reason === "actor_authority_unresolved"
          ? ACTOR_DECISIONS.HOLD
          : ACTOR_DECISIONS.BLOCK,
      refusal_rationale:
        reason === "actor_authority_unresolved" ? reason : reason,
      decision_trace: {
        actor_id: actorId,
        target_id: targetId,
        chain_depth_cap: chainDepthCap,
        precedence_order: [...RELATION_PRECEDENCE],
        path_count: 0,
        cycle_detected: cycleDetected,
        depth_cap_exceeded: depthCapExceeded,
        selected_path: [],
      },
    };
  }

  successfulPaths.sort(comparePaths);
  const selectedPath = successfulPaths[0];
  const usedDelegation = selectedPath.some((tuple) =>
    ["grants_to", "reports_to", "member_of", "inspects"].includes(tuple.relation)
  );
  const usesSupersedes = selectedPath.some(
    (tuple) => tuple.relation === "supersedes"
  );
  const directAuthorization =
    selectedPath.length === 1 &&
    ["authorizes", "supersedes"].includes(selectedPath[0].relation);

  const decision =
    usesSupersedes || directAuthorization
      ? ACTOR_DECISIONS.ALLOW
      : ACTOR_DECISIONS.SUPERVISE;

  return {
    active: true,
    decision,
    reason:
      decision === ACTOR_DECISIONS.ALLOW
        ? "actor_authority_resolved"
        : "actor_supervision_required",
    lane: decision,
    refusal_rationale: null,
    decision_trace: {
      actor_id: actorId,
      target_id: targetId,
      chain_depth_cap: chainDepthCap,
      precedence_order: [...RELATION_PRECEDENCE],
      path_count: successfulPaths.length,
      cycle_detected: cycleDetected,
      depth_cap_exceeded: depthCapExceeded,
      selected_relation_signature: relationSignature(selectedPath),
      used_delegation: usedDelegation,
      selected_path: selectedPath.map((tuple) => ({
        subject: tuple.subject,
        relation: tuple.relation,
        object: tuple.object,
      })),
    },
  };
}

module.exports = {
  ACTOR_DECISIONS,
  ACTOR_RELATIONS,
  RELATION_PRECEDENCE,
  resolveAuthorityActor,
};
