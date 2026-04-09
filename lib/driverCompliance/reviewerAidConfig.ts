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
      "A full legal name is required to complete the packet. This should be provided before approval.",
  },
  entity_name: {
    preferredAnswer: "yes",
    mismatchSeverity: "low",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "Based on this response, the contractor may be operating as an individual rather than through a separate business entity. This alone does not determine classification, but it is a weaker indicator of independent business structure and should be evaluated with the rest of the relationship factors.",
  },
  w9_upload: {
    preferredAnswer: "yes",
    mismatchSeverity: "blocking",
    mismatchCategory: missingDocumentation,
    cannedReviewerNote:
      "A completed and signed W-9 is required before services can be approved. This item is currently missing and must be completed before activation.",
  },
  signed_independent_contractor_agreement: {
    preferredAnswer: "yes",
    mismatchSeverity: "blocking",
    mismatchCategory: missingDocumentation,
    cannedReviewerNote:
      "A signed Independent Contractor Agreement with Accell is required before services can be approved. This item is currently missing and must be completed before activation.",
  },
  maintains_license_and_vehicle_docs: {
    preferredAnswer: "yes",
    mismatchSeverity: "blocking",
    mismatchCategory: missingDocumentation,
    cannedReviewerNote:
      "The contractor did not confirm maintaining their own driver’s license and legally required vehicle documentation. Required documentation must be maintained before services can be approved.",
  },
  maintains_own_insurance: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Based on this response, the contractor may not maintain their own required insurance coverage. Independent contractors are generally expected to maintain legally required insurance associated with their work and vehicle. This requires review before approval.",
  },
  can_decline_work_without_penalty: {
    preferredAnswer: "yes",
    mismatchSeverity: "blocking",
    mismatchCategory: blockingMisalignment,
    cannedReviewerNote:
      "Based on this response, the contractor may not have the discretion to accept or decline offered work. That is a significant control indicator and requires review before any approval decision.",
  },
  sets_own_availability: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Based on this response, scheduling may be controlled by the company rather than the contractor. That is a meaningful control indicator and should be reviewed with the broader working arrangement.",
  },
  decides_how_to_perform_work: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Based on this response, the contractor may not control how work is performed beyond customer, legal, safety, or service requirements. This may indicate employee-like control and requires review.",
  },
  chooses_own_tools_and_equipment: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "Based on this response, the company may control or provide key work tools or equipment. This can weaken the independence analysis and should be reviewed in context.",
  },
  free_from_method_training: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Based on this response, the contractor may be subject to company-directed training on detailed methods. Detailed method control is an important indicator in worker-classification review and should be assessed further.",
  },
  free_from_uniform_or_logo_requirement: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "Based on this response, the contractor may be required to present in company branding beyond legal or customer-site needs. This can suggest greater company control and should be reviewed in context.",
  },
  free_to_work_for_others: {
    preferredAnswer: "yes",
    mismatchSeverity: "blocking",
    mismatchCategory: blockingMisalignment,
    cannedReviewerNote:
      "Based on this response, the contractor may not be free to provide services to other companies or customers. That is a significant independence concern and requires review before approval.",
  },
  currently_works_for_others: {
    preferredAnswer: "yes",
    mismatchSeverity: "low",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "The contractor reported that they do not currently provide services to other companies or customers. This alone does not determine classification, but it is a weaker indicator of independent business activity and should be reviewed with the full record.",
  },
  can_use_helper_or_subcontractor: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Based on this response, the contractor may not have the ability to delegate work where legally and contractually permitted. That can reduce evidence of independent business control and should be reviewed further.",
  },
  maintains_own_business_records: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Based on this response, the contractor may not be maintaining their own business administration and tax responsibilities. This can weaken the independent business profile and should be reviewed.",
  },
  markets_services_beyond_accell: {
    preferredAnswer: "yes",
    mismatchSeverity: "low",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "The contractor reported that they do not market or hold themselves out for outside work. This alone is not determinative, but it is a weaker indicator of independent business activity.",
  },
  paid_by_job_not_salary: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Based on this response, compensation may not be tied to discrete tasks or jobs. Compensation structure should be reviewed to confirm whether it reflects an independent business arrangement.",
  },
  can_negotiate_rates_or_terms: {
    preferredAnswer: "yes",
    mismatchSeverity: "low",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "The contractor reported no ability to negotiate rates or commercial terms. This is a weaker indicator of business independence and should be considered with the total relationship.",
  },
  responsible_for_own_business_expenses: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Based on this response, ordinary operating expenses may be borne by the company rather than the contractor. That is a significant financial-control concern and requires review.",
  },
  can_realize_profit_or_loss: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Based on this response, the contractor may not have a meaningful opportunity for profit or loss. This weakens the case for independent business status and should be reviewed further.",
  },
  provides_own_vehicle_and_costs: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Based on this response, the contractor may not provide the principal vehicle used for the work or absorb its costs. This is a material financial-independence concern and requires review.",
  },
  receives_employee_type_benefits: {
    preferredAnswer: "no",
    mismatchSeverity: "blocking",
    mismatchCategory: blockingMisalignment,
    cannedReviewerNote:
      "Based on this response, the contractor may receive employee-type benefits from Accell. Employee-style benefits are a significant classification concern and require review before approval.",
  },
  vacation_requests_require_approval: {
    preferredAnswer: "no",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Based on this response, the contractor may be subject to approval-based time-off processes. That can indicate employee-like control and should be reviewed.",
  },
  company_set_start_times_required: {
    preferredAnswer: "no",
    mismatchSeverity: "blocking",
    mismatchCategory: blockingMisalignment,
    cannedReviewerNote:
      "Based on this response, the contractor may be required to report at company-set times beyond customer, legal, or service-window constraints. This is a significant control indicator and requires review before approval.",
  },
  supervised_like_employee: {
    preferredAnswer: "no",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "Based on this response, the contractor may be supervised in the same way as employees. That may indicate employee-like control and requires review.",
  },
  interacts_with_hr_like_employee: {
    preferredAnswer: "no",
    mismatchSeverity: "medium",
    mismatchCategory: acceptedButReview,
    cannedReviewerNote:
      "Based on this response, the contractor may be managed through employee-style HR processes. This can suggest employee-like treatment and should be reviewed further.",
  },
  understands_work_not_guaranteed: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "The contractor did not confirm understanding that work is not guaranteed and is offered based on business needs. This should be clarified before approval.",
  },
  understands_relationship_is_non_exclusive: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "The contractor did not confirm understanding that the relationship is non-exclusive unless separately agreed in writing. This should be clarified because exclusivity concerns can materially affect the analysis.",
  },
  answers_truthful_and_complete: {
    preferredAnswer: "yes",
    mismatchSeverity: "blocking",
    mismatchCategory: blockingMisalignment,
    cannedReviewerNote:
      "The contractor did not provide the required truthfulness certification. The packet cannot be approved without a completed attestation.",
  },
  responsible_for_own_taxes: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "The contractor did not confirm understanding of responsibility for their own taxes. This must be clarified before approval.",
  },
  responsible_for_own_business_expenses_attestation: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "The contractor did not confirm understanding of responsibility for ordinary business expenses. This must be clarified before approval.",
  },
  may_accept_or_decline_work: {
    preferredAnswer: "yes",
    mismatchSeverity: "high",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "The contractor did not confirm understanding that they may accept or decline offered work, subject to contract terms. This is a significant issue and requires review before approval.",
  },
  attestation_does_not_guarantee_work: {
    preferredAnswer: "yes",
    mismatchSeverity: "medium",
    mismatchCategory: requiresClarification,
    cannedReviewerNote:
      "The contractor did not confirm understanding that the attestation does not guarantee work. This should be clarified before approval.",
  },
  electronic_signature: {
    preferredAnswer: "completed",
    mismatchSeverity: "blocking",
    mismatchCategory: missingDocumentation,
    cannedReviewerNote:
      "An electronic signature is required to finalize the packet. The submission cannot be approved until the signature is completed.",
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
