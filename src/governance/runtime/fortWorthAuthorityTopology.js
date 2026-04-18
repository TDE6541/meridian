function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }

  return value;
}

const FORT_WORTH_CIVIC_DOMAIN_IDS = [
  "permit_authorization",
  "inspection_resolution",
  "utility_corridor_action",
  "decision_closure",
  "public_notice_action",
];

const FORT_WORTH_PORTFOLIO_ORG_IDS = [
  "fw_city_manager",
  "fw_acm_public_space_planning",
  "fw_acm_environment_aviation_property",
  "fw_acm_development_infrastructure",
  "fw_acm_public_safety",
  "fw_acm_enterprise_services",
];

const FORT_WORTH_ROLE_IDS = [
  "city_manager",
  "acm_public_space_planning",
  "acm_environment_aviation_property",
  "acm_development_infrastructure",
  "acm_public_safety",
  "acm_enterprise_services",
];

const FORT_WORTH_AUTHORITY_TOPOLOGY = {
  version: "wave5-packet1-fort-worth-authority-topology-v1",
  source: {
    mode: "static_local_module",
    wave: "5",
    packet: "1",
    jurisdiction: "fort_worth_texas",
    notes: [
      "Stable org IDs and role IDs drive this topology pack; office-holder names remain snapshot metadata only.",
      "The pack is static local truth only with no live fetch, dynamic loading, KV reads, or filesystem reads at runtime.",
      "The declaration stays bounded to the five civic domains already shipped in the Wave 4A runtime pack.",
    ],
  },
  jurisdiction: {
    jurisdiction_id: "fort_worth_texas",
    display_name: "City of Fort Worth, Texas",
  },
  civic_domain_ids: FORT_WORTH_CIVIC_DOMAIN_IDS,
  civic_permit_semantics: {
    declaration_modes: ["city_manager_final", "portfolio_review"],
    notes: [
      "This matrix is a static declaration pack and not a live decision engine.",
      "City Manager entries represent final municipal signoff posture; ACM entries represent portfolio review posture.",
    ],
  },
  organizations: {
    fw_city_manager: {
      org_id: "fw_city_manager",
      name: "City Manager",
      org_type: "executive_office",
      parent_org_id: null,
      portfolio_org_id: null,
      authorized_domains: FORT_WORTH_CIVIC_DOMAIN_IDS,
      office_holder_snapshot: {
        name: "Jay Chapa",
        title: "City Manager",
      },
      role_ids: ["city_manager"],
      department_ids: [],
    },
    fw_acm_public_space_planning: {
      org_id: "fw_acm_public_space_planning",
      name: "Public Space Planning Portfolio",
      org_type: "assistant_city_manager_portfolio",
      parent_org_id: "fw_city_manager",
      portfolio_org_id: "fw_acm_public_space_planning",
      authorized_domains: FORT_WORTH_CIVIC_DOMAIN_IDS,
      office_holder_snapshot: {
        name: "Dana Burghdoff",
        title: "Assistant City Manager",
      },
      role_ids: ["acm_public_space_planning"],
      department_ids: [
        "library",
        "code_compliance",
        "neighborhood_services",
        "park_recreation",
        "greenspace_initiatives",
        "planning_office",
      ],
    },
    fw_acm_environment_aviation_property: {
      org_id: "fw_acm_environment_aviation_property",
      name: "Environment Aviation Property Portfolio",
      org_type: "assistant_city_manager_portfolio",
      parent_org_id: "fw_city_manager",
      portfolio_org_id: "fw_acm_environment_aviation_property",
      authorized_domains: FORT_WORTH_CIVIC_DOMAIN_IDS,
      office_holder_snapshot: {
        name: "Valerie Washington",
        title: "Assistant City Manager",
      },
      role_ids: ["acm_environment_aviation_property"],
      department_ids: [
        "aviation",
        "environmental_services",
        "property_management",
        "office_of_the_medical_director",
      ],
    },
    fw_acm_development_infrastructure: {
      org_id: "fw_acm_development_infrastructure",
      name: "Development Infrastructure Portfolio",
      org_type: "assistant_city_manager_portfolio",
      parent_org_id: "fw_city_manager",
      portfolio_org_id: "fw_acm_development_infrastructure",
      authorized_domains: FORT_WORTH_CIVIC_DOMAIN_IDS,
      office_holder_snapshot: {
        name: "Jesica McEachern",
        title: "Assistant City Manager",
      },
      role_ids: ["acm_development_infrastructure"],
      department_ids: [
        "development_services",
        "economic_development",
        "public_events",
        "transportation_public_works",
        "water_department",
      ],
    },
    fw_acm_public_safety: {
      org_id: "fw_acm_public_safety",
      name: "Public Safety Portfolio",
      org_type: "assistant_city_manager_portfolio",
      parent_org_id: "fw_city_manager",
      portfolio_org_id: "fw_acm_public_safety",
      authorized_domains: FORT_WORTH_CIVIC_DOMAIN_IDS,
      office_holder_snapshot: {
        name: "William Johnson",
        title: "Assistant City Manager",
      },
      role_ids: ["acm_public_safety"],
      department_ids: [
        "police",
        "fire",
        "municipal_court",
        "emergency_management_communications_911",
      ],
    },
    fw_acm_enterprise_services: {
      org_id: "fw_acm_enterprise_services",
      name: "Enterprise Services Portfolio",
      org_type: "assistant_city_manager_portfolio",
      parent_org_id: "fw_city_manager",
      portfolio_org_id: "fw_acm_enterprise_services",
      authorized_domains: FORT_WORTH_CIVIC_DOMAIN_IDS,
      office_holder_snapshot: {
        name: "Dianna Giordano",
        title: "Assistant City Manager",
      },
      role_ids: ["acm_enterprise_services"],
      department_ids: [
        "human_resources",
        "information_technology_solutions",
        "intergovernmental_relations",
        "cmo_administration",
      ],
    },
  },
  departments: {
    library: {
      department_id: "library",
      display_name: "Library",
      portfolio_org_id: "fw_acm_public_space_planning",
    },
    code_compliance: {
      department_id: "code_compliance",
      display_name: "Code Compliance",
      portfolio_org_id: "fw_acm_public_space_planning",
    },
    neighborhood_services: {
      department_id: "neighborhood_services",
      display_name: "Neighborhood Services",
      portfolio_org_id: "fw_acm_public_space_planning",
    },
    park_recreation: {
      department_id: "park_recreation",
      display_name: "Park & Recreation",
      portfolio_org_id: "fw_acm_public_space_planning",
    },
    greenspace_initiatives: {
      department_id: "greenspace_initiatives",
      display_name: "Greenspace Initiatives",
      portfolio_org_id: "fw_acm_public_space_planning",
    },
    planning_office: {
      department_id: "planning_office",
      display_name: "Planning Office",
      portfolio_org_id: "fw_acm_public_space_planning",
    },
    aviation: {
      department_id: "aviation",
      display_name: "Aviation",
      portfolio_org_id: "fw_acm_environment_aviation_property",
    },
    environmental_services: {
      department_id: "environmental_services",
      display_name: "Environmental Services",
      portfolio_org_id: "fw_acm_environment_aviation_property",
    },
    property_management: {
      department_id: "property_management",
      display_name: "Property Management",
      portfolio_org_id: "fw_acm_environment_aviation_property",
    },
    office_of_the_medical_director: {
      department_id: "office_of_the_medical_director",
      display_name: "Office of the Medical Director",
      portfolio_org_id: "fw_acm_environment_aviation_property",
    },
    development_services: {
      department_id: "development_services",
      display_name: "Development Services",
      portfolio_org_id: "fw_acm_development_infrastructure",
    },
    economic_development: {
      department_id: "economic_development",
      display_name: "Economic Development",
      portfolio_org_id: "fw_acm_development_infrastructure",
    },
    public_events: {
      department_id: "public_events",
      display_name: "Public Events",
      portfolio_org_id: "fw_acm_development_infrastructure",
    },
    transportation_public_works: {
      department_id: "transportation_public_works",
      display_name: "Transportation & Public Works",
      portfolio_org_id: "fw_acm_development_infrastructure",
    },
    water_department: {
      department_id: "water_department",
      display_name: "Water Department",
      portfolio_org_id: "fw_acm_development_infrastructure",
    },
    police: {
      department_id: "police",
      display_name: "Police",
      portfolio_org_id: "fw_acm_public_safety",
    },
    fire: {
      department_id: "fire",
      display_name: "Fire",
      portfolio_org_id: "fw_acm_public_safety",
    },
    municipal_court: {
      department_id: "municipal_court",
      display_name: "Municipal Court",
      portfolio_org_id: "fw_acm_public_safety",
    },
    emergency_management_communications_911: {
      department_id: "emergency_management_communications_911",
      display_name: "Emergency Management & Communications / 911",
      portfolio_org_id: "fw_acm_public_safety",
    },
    human_resources: {
      department_id: "human_resources",
      display_name: "Human Resources",
      portfolio_org_id: "fw_acm_enterprise_services",
    },
    information_technology_solutions: {
      department_id: "information_technology_solutions",
      display_name: "Information Technology Solutions",
      portfolio_org_id: "fw_acm_enterprise_services",
    },
    intergovernmental_relations: {
      department_id: "intergovernmental_relations",
      display_name: "Intergovernmental Relations",
      portfolio_org_id: "fw_acm_enterprise_services",
    },
    cmo_administration: {
      department_id: "cmo_administration",
      display_name: "CMO Administration",
      portfolio_org_id: "fw_acm_enterprise_services",
    },
  },
  roles: {
    city_manager: {
      role_id: "city_manager",
      org_id: "fw_city_manager",
      display_name: "City Manager",
      role_class: "city_manager",
    },
    acm_public_space_planning: {
      role_id: "acm_public_space_planning",
      org_id: "fw_acm_public_space_planning",
      display_name: "Assistant City Manager - Public Space Planning",
      role_class: "assistant_city_manager",
    },
    acm_environment_aviation_property: {
      role_id: "acm_environment_aviation_property",
      org_id: "fw_acm_environment_aviation_property",
      display_name: "Assistant City Manager - Environment Aviation Property",
      role_class: "assistant_city_manager",
    },
    acm_development_infrastructure: {
      role_id: "acm_development_infrastructure",
      org_id: "fw_acm_development_infrastructure",
      display_name: "Assistant City Manager - Development Infrastructure",
      role_class: "assistant_city_manager",
    },
    acm_public_safety: {
      role_id: "acm_public_safety",
      org_id: "fw_acm_public_safety",
      display_name: "Assistant City Manager - Public Safety",
      role_class: "assistant_city_manager",
    },
    acm_enterprise_services: {
      role_id: "acm_enterprise_services",
      org_id: "fw_acm_enterprise_services",
      display_name: "Assistant City Manager - Enterprise Services",
      role_class: "assistant_city_manager",
    },
  },
  role_domain_matrix: {
    city_manager: {
      permit_authorization: {
        declaration_mode: "city_manager_final",
        jurisdiction_ids: ["city", "franchise"],
      },
      inspection_resolution: {
        declaration_mode: "city_manager_final",
        jurisdiction_ids: ["city", "franchise"],
      },
      utility_corridor_action: {
        declaration_mode: "city_manager_final",
        jurisdiction_ids: ["city", "franchise"],
      },
      decision_closure: {
        declaration_mode: "city_manager_final",
        jurisdiction_ids: ["city", "franchise"],
      },
      public_notice_action: {
        declaration_mode: "city_manager_final",
        jurisdiction_ids: ["city", "franchise"],
      },
    },
    acm_public_space_planning: {
      permit_authorization: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      inspection_resolution: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      utility_corridor_action: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      decision_closure: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      public_notice_action: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
    },
    acm_environment_aviation_property: {
      permit_authorization: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      inspection_resolution: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      utility_corridor_action: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      decision_closure: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      public_notice_action: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
    },
    acm_development_infrastructure: {
      permit_authorization: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      inspection_resolution: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      utility_corridor_action: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      decision_closure: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      public_notice_action: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
    },
    acm_public_safety: {
      permit_authorization: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      inspection_resolution: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      utility_corridor_action: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      decision_closure: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      public_notice_action: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
    },
    acm_enterprise_services: {
      permit_authorization: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      inspection_resolution: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      utility_corridor_action: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      decision_closure: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
      public_notice_action: {
        declaration_mode: "portfolio_review",
        jurisdiction_ids: ["city", "franchise"],
      },
    },
  },
  cross_jurisdiction_resolver: {
    city: {
      jurisdiction_id: "city",
      display_name: "City-managed municipal action",
      permit_owner: "municipal_lane",
      escalation_role_id: "city_manager",
      supported_domain_ids: FORT_WORTH_CIVIC_DOMAIN_IDS,
    },
    franchise: {
      jurisdiction_id: "franchise",
      display_name: "Franchise action with city oversight",
      permit_owner: "franchise_lane_with_city_oversight",
      escalation_role_id: "city_manager",
      supported_domain_ids: FORT_WORTH_CIVIC_DOMAIN_IDS,
    },
  },
};

const FROZEN_FORT_WORTH_AUTHORITY_TOPOLOGY = deepFreeze(
  FORT_WORTH_AUTHORITY_TOPOLOGY
);

function getFortWorthOrganization(orgId) {
  if (typeof orgId !== "string") {
    return null;
  }

  return FROZEN_FORT_WORTH_AUTHORITY_TOPOLOGY.organizations[orgId] ?? null;
}

function getFortWorthRoleDomainDeclaration(roleId, domainId) {
  if (typeof roleId !== "string" || typeof domainId !== "string") {
    return null;
  }

  return (
    FROZEN_FORT_WORTH_AUTHORITY_TOPOLOGY.role_domain_matrix[roleId]?.[domainId] ??
    null
  );
}

function resolveFortWorthJurisdiction(jurisdictionId) {
  if (typeof jurisdictionId !== "string") {
    return null;
  }

  return (
    FROZEN_FORT_WORTH_AUTHORITY_TOPOLOGY.cross_jurisdiction_resolver[
      jurisdictionId
    ] ?? null
  );
}

module.exports = {
  FORT_WORTH_CIVIC_DOMAIN_IDS,
  FORT_WORTH_PORTFOLIO_ORG_IDS,
  FORT_WORTH_ROLE_IDS,
  FORT_WORTH_AUTHORITY_TOPOLOGY: FROZEN_FORT_WORTH_AUTHORITY_TOPOLOGY,
  getFortWorthOrganization,
  getFortWorthRoleDomainDeclaration,
  resolveFortWorthJurisdiction,
};
