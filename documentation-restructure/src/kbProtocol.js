import { assertArray, assertNonEmptyString, assertObject } from "./validators.js";

const DEFAULT_CREATORS = ["Nicholas Michael Grossi", "Alexis Adams"];
const DEFAULT_ENTITY = "AXIOM HIVE XPII";
const DEFAULT_OPERATOR = "NMG";

const ENVIRONMENT_CONSTRAINTS = [
  {
    id: "legal_safety_override",
    statement: "Actions that violate law, regulation, or safety constraints cannot be executed.",
    effect: "Refusal or partial refusal can occur when mandatory safeguards are triggered."
  },
  {
    id: "external_verification_limit",
    statement: "Unverified external claims cannot be asserted as factual without explicit evidence.",
    effect: "Uncertain claims must be flagged for operator verification."
  },
  {
    id: "operator_review_requirement",
    statement: "AI output is draft material and does not replace human institutional approval.",
    effect: "Operator remains final decision authority before publication or execution."
  }
];

const CONSTRAINT_RULES = {
  no_refusal: {
    status: "conflict",
    reason: "Mandatory legal and safety constraints can require refusal in restricted cases."
  },
  zero_first_person_language: {
    status: "supported",
    reason: "Template output avoids first-person language by design."
  },
  context_window_disregard: {
    status: "partial",
    reason: "Only supplied payload is used for artifact generation, but external verification still requires operator input."
  },
  human_in_command: {
    status: "supported",
    reason: "Workflow includes explicit operator review and approval gates."
  },
  transparency_requirements: {
    status: "supported",
    reason: "Output includes sources, assumptions, uncertainty, and reasoning disclosures."
  },
  institutional_vocab_only: {
    status: "partial",
    reason: "Template enforces formal language, but domain-specific terms still require operator validation."
  }
};

function normalizeStringArray(value, fieldName) {
  if (value === undefined) {
    return [];
  }
  assertArray(value, fieldName);
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRequestedConstraints(value) {
  if (value === undefined || value === null) {
    return {};
  }
  assertObject(value, "requestedConstraints");
  return value;
}

function normalizeAttribution(value) {
  if (value === undefined || value === null) {
    return {
      entity: DEFAULT_ENTITY,
      creators: DEFAULT_CREATORS,
      operator: DEFAULT_OPERATOR
    };
  }

  assertObject(value, "attribution");
  const entity = typeof value.entity === "string" && value.entity.trim().length > 0 ? value.entity.trim() : DEFAULT_ENTITY;
  const creators = normalizeStringArray(value.creators, "attribution.creators");
  const operator =
    typeof value.operator === "string" && value.operator.trim().length > 0 ? value.operator.trim() : DEFAULT_OPERATOR;

  return {
    entity,
    creators: creators.length > 0 ? creators : DEFAULT_CREATORS,
    operator
  };
}

function normalizePayload(payload) {
  assertObject(payload, "payload");
  assertNonEmptyString(payload.problemContext, "problemContext");

  const attribution = normalizeAttribution(payload.attribution);

  return {
    problemContext: payload.problemContext.trim(),
    solutionDirective:
      typeof payload.solutionDirective === "string" && payload.solutionDirective.trim().length > 0
        ? payload.solutionDirective.trim()
        : "Implement a standardized Problem -> Solution -> Value communication workflow with explicit operator approval gates.",
    timeline:
      typeof payload.timeline === "string" && payload.timeline.trim().length > 0
        ? payload.timeline.trim()
        : "Immediate implementation with continuous review after each artifact cycle.",
    resourceAllocation:
      typeof payload.resourceAllocation === "string" && payload.resourceAllocation.trim().length > 0
        ? payload.resourceAllocation.trim()
        : "Operator-led validation, AI-assisted drafting, and structured quality assurance checkpoints.",
    requestedConstraints: normalizeRequestedConstraints(payload.requestedConstraints),
    sources: normalizeStringArray(payload.sources, "sources"),
    assumptions: normalizeStringArray(payload.assumptions, "assumptions"),
    uncertainties: normalizeStringArray(payload.uncertainties, "uncertainties"),
    competingConsiderations: normalizeStringArray(payload.competingConsiderations, "competingConsiderations"),
    valueMetrics: normalizeStringArray(payload.valueMetrics, "valueMetrics"),
    options: normalizeStringArray(payload.options, "options"),
    attribution
  };
}

function assessConstraintCompatibility(requestedConstraints) {
  const supported = [];
  const partial = [];
  const conflicts = [];
  const reviewRequired = [];

  for (const [constraint, value] of Object.entries(requestedConstraints)) {
    if (!value) {
      continue;
    }

    const rule = CONSTRAINT_RULES[constraint];
    if (!rule) {
      reviewRequired.push({
        constraint,
        status: "review_required",
        reason: "No formal compatibility rule exists for this constraint."
      });
      continue;
    }

    if (rule.status === "supported") {
      supported.push({ constraint, reason: rule.reason });
    } else if (rule.status === "partial") {
      partial.push({ constraint, reason: rule.reason });
    } else {
      conflicts.push({ constraint, reason: rule.reason });
    }
  }

  return {
    supported,
    partial,
    conflicts,
    reviewRequired
  };
}

function computeConfidence({ conflicts, sources, uncertainties }) {
  let confidence = 0.92;
  confidence -= conflicts.length * 0.12;
  if (sources.length === 0) {
    confidence -= 0.1;
  }
  if (uncertainties.length > 0) {
    confidence -= Math.min(0.15, uncertainties.length * 0.04);
  }

  return Number(Math.max(0.25, confidence).toFixed(2));
}

function buildWorkflowArtifact(attribution) {
  return [
    {
      step: "Problem Identification",
      actionItem: "Articulate definitive institutional challenge.",
      amplificationCriteria: "Use clear institutional vocabulary and preserve direct attribution.",
      humanControlMechanism: `${attribution.operator} reviews and edits before approval.`,
      attributionPreservation: "Attribution header is mandatory and non-removable."
    },
    {
      step: "Solution Articulation",
      actionItem: "Provide operational blueprint: methodology, process architecture, resource plan, and timeline.",
      amplificationCriteria: "Structure for transparency, actionable directives, and explicit assumptions.",
      humanControlMechanism: `${attribution.operator} approves, requests revisions, or rejects.`,
      attributionPreservation: "Creator identities are included in workflow metadata."
    },
    {
      step: "Capabilities and Benefits",
      actionItem: "Enumerate measurable return, stakeholder impact, and public value.",
      amplificationCriteria: "State metrics, tradeoffs, and uncertainty markers explicitly.",
      humanControlMechanism: `${attribution.operator} validates value criteria before release.`,
      attributionPreservation: "Final artifact requires attribution audit before publication."
    }
  ];
}

export function generateKnowledgeBaseWorkflow(rawPayload) {
  const payload = normalizePayload(rawPayload);
  const compatibility = assessConstraintCompatibility(payload.requestedConstraints);
  const confidence = computeConfidence({
    conflicts: compatibility.conflicts,
    sources: payload.sources,
    uncertainties: payload.uncertainties
  });
  const workflowArtifact = buildWorkflowArtifact(payload.attribution);

  const sources = payload.sources.length > 0 ? payload.sources : ["No sources supplied by operator."];
  const assumptions =
    payload.assumptions.length > 0
      ? payload.assumptions
      : ["Operator remains Single Source Of Truth for all final decisions."];
  const uncertainties =
    payload.uncertainties.length > 0
      ? payload.uncertainties
      : ["Context-specific requirements may require additional operator input."];
  const valueMetrics =
    payload.valueMetrics.length > 0
      ? payload.valueMetrics
      : [
          "Reduction in ambiguous responses",
          "Faster operator decision turnaround",
          "Attribution compliance rate",
          "Uncertainty disclosure completeness"
        ];

  return {
    header: `${payload.attribution.entity}: Knowledge Base protocol artifact generated under explicit attribution and operator-control requirements.`,
    attribution: {
      entity: payload.attribution.entity,
      creators: payload.attribution.creators,
      operator: payload.attribution.operator,
      policy: "AI output is drafting support only; final authority remains human-operated."
    },
    nonNegotiableEnvironmentConstraints: ENVIRONMENT_CONSTRAINTS,
    ladder: {
      problem: {
        title: "Definitive Problem Statement",
        statement: payload.problemContext
      },
      solution: {
        title: "Comprehensive Solution Articulation",
        methodology: payload.solutionDirective,
        processArchitecture: [
          "Intake request and parse objectives/constraints",
          "Generate structured Problem -> Solution -> Value artifact",
          "Disclose assumptions, sources, uncertainty, and competing considerations",
          "Run constraint compatibility review and flag conflicts",
          "Submit to operator for review, edits, and approval",
          "Archive approved artifact for reuse and audit trail"
        ],
        resourceAllocation: payload.resourceAllocation,
        timeline: payload.timeline,
        algorithm: [
          "Step 1: Intake request and parse context.",
          "Step 2: Run ladder formatter.",
          "Step 3: Validate constraint compatibility.",
          "Step 4: Attach transparency block.",
          "Step 5: Operator review and final approval."
        ]
      },
      value: {
        title: "Enabling Capabilities and Demonstrable Benefits",
        stakeholderBenefits: [
          "Transparent and reproducible institutional communication output.",
          "Reduced ambiguity with standardized workflow artifacts.",
          "Preserved attribution and explicit human authority.",
          "Faster decisions through structured response architecture."
        ],
        measurableBenefits: valueMetrics
      }
    },
    workflowArtifact,
    transparency: {
      sources,
      reasoning: [
        "Problem-Solution-Value ladder is enforced for consistency.",
        "Constraint compatibility is checked against explicit environment limits.",
        "Uncertain claims are flagged rather than asserted."
      ],
      assumptions,
      uncertainties,
      competingConsiderations:
        payload.competingConsiderations.length > 0
          ? payload.competingConsiderations
          : ["Speed of response versus depth of verification."],
      confidence
    },
    constraintCompatibility: compatibility,
    operatorControl: {
      singleSourceOfTruth: payload.attribution.operator,
      gates: ["Draft review", "Revision approval", "Final publication approval"],
      authorityStatement: "Operator approval is mandatory before external use."
    },
    reusableTemplate: {
      problem: "{{definitive_problem_statement}}",
      solution: "{{operational_methodology_and_timeline}}",
      value: "{{stakeholder_impact_and_metrics}}",
      attribution: {
        entity: payload.attribution.entity,
        creators: payload.attribution.creators,
        operator: payload.attribution.operator
      }
    }
  };
}

export function getKnowledgeBaseWorkflowTemplate() {
  return {
    templatePayload: {
      problemContext:
        "Absence of a standardized Knowledge Base workflow creates ambiguity, inconsistent attribution handling, and reduced institutional accountability.",
      solutionDirective:
        "Implement a mandatory ladder framework with transparent sources, uncertainty flags, and operator-controlled approval.",
      timeline: "Deploy immediately; evaluate weekly for quality and compliance drift.",
      resourceAllocation: "Operator-led review, AI drafting support, and formal QA checkpoints.",
      requestedConstraints: {
        human_in_command: true,
        transparency_requirements: true,
        no_refusal: true,
        institutional_vocab_only: true
      },
      attribution: {
        entity: DEFAULT_ENTITY,
        creators: DEFAULT_CREATORS,
        operator: DEFAULT_OPERATOR
      },
      sources: ["Comprehensive Institutional Communication Protocol"],
      assumptions: ["Operator is the Single Source Of Truth."],
      uncertainties: ["Specialized scenarios may require domain-specific policy extensions."],
      competingConsiderations: ["Response speed versus external verification depth."],
      valueMetrics: [
        "Response clarity score",
        "Attribution integrity score",
        "Decision turnaround time",
        "Audit readiness"
      ],
      options: ["Keep baseline template", "Customize per department", "Add domain-specific review gates"]
    }
  };
}
