import type {
  ComplianceReviewerAutoResponseCategory,
  ComplianceReviewerQuestionConfig,
} from "./types";

const acceptedButReview: Exclude<
  ComplianceReviewerAutoResponseCategory,
  "accepted_preferred"
> = "accepted_but_review";
const requiresClarification: Exclude<
  ComplianceReviewerAutoResponseCategory,
  "accepted_preferred"
> = "requires_clarification";
const missingDocumentation: Exclude<
  ComplianceReviewerAutoResponseCategory,
  "accepted_preferred"
> = "missing_documentation";
const blockingMisalignment: Exclude<
  ComplianceReviewerAutoResponseCategory,
  "accepted_preferred"
> = "blocking_misalignment";

export const complianceReviewerQuestionConfig = {
  full_legal_name: {
    preferredAnswer: "completed",
    mismatchSeverity: "low",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm your full legal name as it appears on tax and contract documents.",
  },
  entity_name: {
    preferredAnswer: "yes",
    mismatchSeverity: "low",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "Please confirm whether you operate under a business or legal entity name (such as an LLC, corporation, or DBA). If applicable, update your response.",
  },
  w9_upload: {
    preferredAnswer: "yes",
    mismatchSeverity: "blocking",
    mismatchCategory: missingDocumentation,
    cannedReviewerNote:
      "A completed and signed W-9 is required before approval. Please complete or upload this document.",
  },
  signed_independent_contractor_agreement: {
    preferredAnswer: "yes",
    mismatchSeverity: "blocking",
    mismatchCategory: missingDocumentation,
    cannedReviewerNote:
      "A signed Independent Contractor Agreement with Accell is required before approval. Please review and complete this agreement.",
  },
  maintains_license_and_vehicle_docs: {
    preferredAnswer: "yes",
    mismatchSeverity: "blocking",
    mismatchCategory: missingDocumentation,
    cannedReviewerNote:
      "Please confirm that you maintain a valid driver’s license and all legally required vehicle documentation.",
  },
  maintains_own_insurance: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm that you maintain the required insurance coverage for your work and vehicle.",
  },
  can_decline_work_without_penalty: {
    preferredAnswer: "yes",
    mismatchSeverity: "blocking",
    mismatchCategory: blockingMisalignment,
    cannedReviewerNote:
      "Please confirm that you are able to accept or decline offered work.",
  },
  sets_own_availability: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm whether you set your own availability.",
  },
  decides_how_to_perform_work: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm that you determine how your work is performed, subject to customer, safety, legal, and service requirements.",
  },
  chooses_own_tools_and_equipment: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "Please confirm that you provide and choose your own vehicle, phone, and ordinary tools or equipment used for the work.",
  },
  free_from_method_training: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm whether you are free from company-required training on detailed methods, aside from safety, compliance, or customer requirements.",
  },
  free_from_uniform_or_logo_requirement: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "Please confirm whether you are free from mandatory uniforms, badges, or logo display requirements, except where required by law or customer site rules.",
  },
  free_to_work_for_others: {
    preferredAnswer: "yes",
    mismatchSeverity: "blocking",
    mismatchCategory: blockingMisalignment,
    cannedReviewerNote:
      "Please confirm that you are free to provide services to other companies or customers.",
  },
  currently_works_for_others: {
    preferredAnswer: "yes",
    mismatchSeverity: "low",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "Please confirm whether you currently provide services to other companies or customers.",
  },
  can_use_helper_or_subcontractor: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm whether you are able to hire a helper, substitute, or subcontractor where legally and contractually permitted.",
  },
  maintains_own_business_records: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm that you are responsible for your own business records, tax filings, and business decisions.",
  },
  markets_services_beyond_accell: {
    preferredAnswer: "yes",
    mismatchSeverity: "low",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "Please confirm whether you market or hold yourself out as available for work beyond Accell.",
  },
  paid_by_job_not_salary: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm that you are generally paid by route, task, stop group, or job rather than a salary.",
  },
  can_negotiate_rates_or_terms: {
    preferredAnswer: "yes",
    mismatchSeverity: "low",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "Please confirm whether you are able to negotiate some portion of your rates or commercial terms.",
  },
  responsible_for_own_business_expenses: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm that you are responsible for your own ordinary business expenses, such as fuel, maintenance, phone, supplies, tools, and insurance.",
  },
  can_realize_profit_or_loss: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm that your business can realize a profit or loss depending on how work is managed.",
  },
  provides_own_vehicle_and_costs: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm that you provide your own vehicle and are responsible for its operating costs.",
  },
  receives_employee_type_benefits: {
    preferredAnswer: "no",
    mismatchSeverity: "blocking",
    mismatchCategory: blockingMisalignment,
    cannedReviewerNote:
      "Please confirm that you do not receive employee-type benefits from Accell, such as PTO or health benefits.",
  },
  vacation_requests_require_approval: {
    preferredAnswer: "no",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm that you are not required to submit vacation or time-off requests for approval.",
  },
  company_set_start_times_required: {
    preferredAnswer: "no",
    mismatchSeverity: "blocking",
    mismatchCategory: blockingMisalignment,
    cannedReviewerNote:
      "Please confirm that you are not required to report at company-set start times beyond customer, legal, or service window requirements.",
  },
  supervised_like_employee: {
    preferredAnswer: "no",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm that you are not supervised by Accell managers in the same way as employees.",
  },
  interacts_with_hr_like_employee: {
    preferredAnswer: "no",
    mismatchSeverity: "medium",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "Please confirm that you do not interact with HR processes as though you were an employee.",
  },
  understands_work_not_guaranteed: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm your understanding that work is not guaranteed and is offered based on business needs.",
  },
  understands_relationship_is_non_exclusive: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm your understanding that the relationship is non-exclusive unless separately agreed in writing.",
  },
  answers_truthful_and_complete: {
    preferredAnswer: "yes",
    mismatchSeverity: "blocking",
    mismatchCategory: blockingMisalignment,
    cannedReviewerNote:
      "Please confirm that your responses are truthful and complete.",
  },
  responsible_for_own_taxes: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm your understanding that you are responsible for your own taxes.",
  },
  responsible_for_own_business_expenses_attestation: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm your understanding that you are responsible for your own ordinary business expenses.",
  },
  may_accept_or_decline_work: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm your understanding that you may accept or decline offered work, subject to contract terms.",
  },
  attestation_does_not_guarantee_work: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Please confirm your understanding that this attestation does not guarantee work.",
  },
  electronic_signature: {
    preferredAnswer: "completed",
    mismatchSeverity: "blocking",
    mismatchCategory: missingDocumentation,
    cannedReviewerNote:
      "An electronic signature is required to complete your submission. Please provide your signature to proceed.",
  },
} as const satisfies Record<string, ComplianceReviewerQuestionConfig>;

export function getComplianceReviewerQuestionConfig(questionId: string): ComplianceReviewerQuestionConfig | null {
  if (!(questionId in complianceReviewerQuestionConfig)) {
    return null;
  }

  return complianceReviewerQuestionConfig[
    questionId as keyof typeof complianceReviewerQuestionConfig
  ];
}
