import type {
  ComplianceSection,
  ComplianceSectionKey,
  ComplianceSurveyDefinition,
} from "./types";

export const DRIVER_COMPLIANCE_SURVEY_VERSION = "v1";

export const complianceSectionOrder: ComplianceSectionKey[] = [
  "identity",
  "control",
  "separation",
  "money",
  "operations",
  "attestation",
];

export const driverComplianceSurveySchema: ComplianceSection[] = [
  {
    key: "identity",
    title: "Identity",
    description:
      "Basic legal and insurance documentation confirming the contractor is operating independently.",
    questions: [
      {
        id: "full_legal_name",
        key: "full_legal_name",
        section: "identity",
        prompt: "Full legal name",
        label: "Full legal name",
        required: true,
        type: "text",
        description: "Enter the legal name used for tax and contract records.",
        weight: 3,
      },
      {
        id: "entity_name",
        key: "entity_name",
        section: "identity",
        prompt: "Do you operate under a business or legal entity name?",
        label: "Do you operate under a business or legal entity name?",
        required: true,
        type: "yes_no",
        description: "Examples include an LLC, corporation, DBA, or other legal business name.",
        weight: 3,
        riskIf: [
          {
            equals: false,
            severity: "medium",
            code: "no_entity_name",
            message: "No business or legal entity name was reported.",
          },
        ],
      },
      {
        id: "w9_upload",
        key: "w9_upload",
        section: "identity",
        prompt: "Have you completed and signed a W-9?",
        label: "Have you completed and signed a W-9?",
        required: true,
        type: "yes_no",
        description: "Answer yes only if your W-9 has been fully completed and signed.",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "missing_w9",
            message: "The driver has not completed and signed a W-9.",
          },
          {
            equals: null,
            severity: "high",
            code: "missing_w9",
            message: "The driver has not completed and signed a W-9.",
          },
        ],
      },
      {
        id: "signed_independent_contractor_agreement",
        key: "signed_independent_contractor_agreement",
        section: "identity",
        prompt: "Have you signed the Independent Contractor Agreement with Accell?",
        label: "Have you signed the Independent Contractor Agreement with Accell?",
        required: true,
        type: "yes_no",
        description: "Answer yes only if your Independent Contractor Agreement with Accell has been signed.",
        weight: 5,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "independent_contractor_agreement_not_signed",
            message: "The driver has not signed the Independent Contractor Agreement with Accell.",
          },
        ],
      },
      {
        id: "maintains_license_and_vehicle_docs",
        key: "maintains_license_and_vehicle_docs",
        section: "identity",
        prompt:
          "Do you maintain your own driver’s license and legally required vehicle documentation?",
        label:
          "Do you maintain your own driver’s license and legally required vehicle documentation?",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "license_or_docs_not_maintained",
            message: "The driver does not maintain required license or vehicle documentation independently.",
          },
        ],
      },
      {
        id: "maintains_own_insurance",
        key: "maintains_own_insurance",
        section: "identity",
        prompt: "Do you maintain your own insurance required for your work and vehicle?",
        label: "Do you maintain your own insurance required for your work and vehicle?",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "insurance_not_maintained",
            message: "Required insurance is not maintained by the contractor.",
          },
        ],
      },
    ],
  },
  {
    key: "control",
    title: "Control",
    description:
      "Questions focused on whether the contractor controls when and how the work is performed.",
    questions: [
      {
        id: "can_decline_work_without_penalty",
        key: "can_decline_work_without_penalty",
        section: "control",
        prompt: "Can you decline offered work without penalty?",
        label: "Can you decline offered work without penalty?",
        required: true,
        type: "yes_no",
        weight: 5,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "cannot_decline_work",
            message: "The driver reports they cannot decline offered work without penalty.",
          },
        ],
      },
      {
        id: "sets_own_availability",
        key: "sets_own_availability",
        section: "control",
        prompt: "Do you set your own availability?",
        label: "Do you set your own availability?",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "medium",
            code: "availability_not_self_directed",
            message: "Availability appears to be controlled by the company rather than the contractor.",
          },
        ],
      },
      {
        id: "decides_how_to_perform_work",
        key: "decides_how_to_perform_work",
        section: "control",
        prompt:
          "Do you decide how to perform the work, subject only to customer, safety, legal, and service requirements?",
        label:
          "Do you decide how to perform the work, subject only to customer, safety, legal, and service requirements?",
        required: true,
        type: "yes_no",
        weight: 5,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "method_of_work_controlled",
            message: "Detailed work methods appear to be controlled beyond basic safety or service requirements.",
          },
        ],
      },
      {
        id: "chooses_own_tools_and_equipment",
        key: "chooses_own_tools_and_equipment",
        section: "control",
        prompt:
          "Do you choose your own vehicle, phone, and ordinary tools/equipment?",
        label: "Do you choose your own vehicle, phone, and ordinary tools/equipment?",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "medium",
            code: "tools_not_self_selected",
            message: "Ordinary tools or equipment may be company-controlled.",
          },
        ],
      },
      {
        id: "free_from_method_training",
        key: "free_from_method_training",
        section: "control",
        prompt:
          "Are you free from company-required training on detailed methods, except safety/compliance/customer requirements?",
        label:
          "Are you free from company-required training on detailed methods, except safety/compliance/customer requirements?",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "medium",
            code: "detailed_method_training_required",
            message: "The driver reports company-required detailed methods training beyond allowed safety or compliance training.",
          },
        ],
      },
      {
        id: "free_from_uniform_or_logo_requirement",
        key: "free_from_uniform_or_logo_requirement",
        section: "control",
        prompt:
          "Are you free from mandatory company uniforms, unless required by law or customer site rules?",
        label:
          "Are you free from mandatory company uniforms, unless required by law or customer site rules?",
        required: true,
        type: "yes_no",
        weight: 3,
        riskIf: [
          {
            equals: false,
            severity: "medium",
            code: "uniform_or_logo_required",
            message: "Company-required uniform or logo display may indicate employee-like control.",
          },
        ],
      },
    ],
  },
  {
    key: "separation",
    title: "Separation",
    description:
      "Questions that help show whether the contractor runs an independent business distinct from Accell.",
    questions: [
      {
        id: "free_to_work_for_others",
        key: "free_to_work_for_others",
        section: "separation",
        prompt: "Are you free to provide services to other companies or customers?",
        label: "Are you free to provide services to other companies or customers?",
        required: true,
        type: "yes_no",
        weight: 5,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "not_free_to_work_for_others",
            message: "The contractor reports they are not free to provide services elsewhere.",
          },
        ],
      },
      {
        id: "currently_works_for_others",
        key: "currently_works_for_others",
        section: "separation",
        prompt: "Do you currently provide services to other companies or customers?",
        label: "Do you currently provide services to other companies or customers?",
        required: true,
        type: "yes_no",
        description: "A “No” answer does not automatically disqualify independence, but it can increase review need.",
        weight: 3,
        riskIf: [
          {
            equals: false,
            severity: "low",
            code: "no_other_clients_reported",
            message: "The contractor does not currently report serving other clients.",
          },
        ],
      },
      {
        id: "can_use_helper_or_subcontractor",
        key: "can_use_helper_or_subcontractor",
        section: "separation",
        prompt:
          "Can you hire a helper, substitute, or subcontractor where legally and contractually permitted?",
        label:
          "Can you hire a helper, substitute, or subcontractor where legally and contractually permitted?",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "medium",
            code: "cannot_delegate_work",
            message: "The contractor reports they cannot use helpers or substitutes where otherwise permitted.",
          },
        ],
      },
      {
        id: "maintains_own_business_records",
        key: "maintains_own_business_records",
        section: "separation",
        prompt:
          "Are you responsible for maintaining your own business records, tax filings, and business decisions?",
        label:
          "Are you responsible for maintaining your own business records, tax filings, and business decisions?",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "business_records_not_maintained",
            message: "The contractor does not report maintaining their own records, tax filings, or business decisions.",
          },
        ],
      },
      {
        id: "markets_services_beyond_accell",
        key: "markets_services_beyond_accell",
        section: "separation",
        prompt:
          "Do you market or hold yourself out as available for work beyond Accell, even informally?",
        label:
          "Do you market or hold yourself out as available for work beyond Accell, even informally?",
        required: true,
        type: "yes_no",
        weight: 3,
        riskIf: [
          {
            equals: false,
            severity: "low",
            code: "not_marketing_services_elsewhere",
            message: "The contractor does not currently market their services beyond Accell.",
          },
        ],
      },
    ],
  },
  {
    key: "money",
    title: "Money",
    description:
      "Questions about rate structure, expenses, and the ability to realize profit or loss.",
    questions: [
      {
        id: "paid_by_job_not_salary",
        key: "paid_by_job_not_salary",
        section: "money",
        prompt:
          "Are you generally paid by route, task, stop group, or job rather than salary?",
        label:
          "Are you generally paid by route, task, stop group, or job rather than salary?",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "salary_like_pay_structure",
            message: "The driver reports a salary-like pay structure rather than task-based compensation.",
          },
        ],
      },
      {
        id: "can_negotiate_rates_or_terms",
        key: "can_negotiate_rates_or_terms",
        section: "money",
        prompt: "Can you negotiate some part of your rates or commercial terms?",
        label: "Can you negotiate some part of your rates or commercial terms?",
        required: true,
        type: "yes_no",
        weight: 3,
        riskIf: [
          {
            equals: false,
            severity: "medium",
            code: "cannot_negotiate_terms",
            message: "The contractor reports no ability to negotiate rates or commercial terms.",
          },
        ],
      },
      {
        id: "responsible_for_own_business_expenses",
        key: "responsible_for_own_business_expenses",
        section: "money",
        prompt:
          "Are you responsible for your own ordinary business expenses, such as fuel, maintenance, phone, supplies, tolls, and insurance?",
        label:
          "Are you responsible for your own ordinary business expenses, such as fuel, maintenance, phone, supplies, tolls, and insurance?",
        required: true,
        type: "yes_no",
        weight: 5,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "expenses_not_borne_by_driver",
            message: "Ordinary business expenses do not appear to be borne by the contractor.",
          },
        ],
      },
      {
        id: "can_realize_profit_or_loss",
        key: "can_realize_profit_or_loss",
        section: "money",
        prompt:
          "Can your business realize a profit or loss depending on how you manage costs and work accepted?",
        label:
          "Can your business realize a profit or loss depending on how you manage costs and work accepted?",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "no_profit_or_loss_exposure",
            message: "The contractor reports no real profit-or-loss exposure.",
          },
        ],
      },
      {
        id: "provides_own_vehicle_and_costs",
        key: "provides_own_vehicle_and_costs",
        section: "money",
        prompt: "Do you provide your own vehicle and absorb the normal operating costs?",
        label: "Do you provide your own vehicle and absorb the normal operating costs?",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "vehicle_or_costs_not_self_provided",
            message: "Vehicle ownership or ordinary operating costs do not appear to be handled by the contractor.",
          },
        ],
      },
      {
        id: "receives_employee_type_benefits",
        key: "receives_employee_type_benefits",
        section: "money",
        prompt:
          "Do you receive employee-type benefits from Accell, such as PTO, health benefits, or similar benefits?",
        label:
          "Do you receive employee-type benefits from Accell, such as PTO, health benefits, or similar benefits?",
        required: true,
        type: "yes_no",
        weight: 5,
        riskIf: [
          {
            equals: true,
            severity: "high",
            code: "employee_type_benefits_reported",
            message: "The contractor reports receiving employee-type benefits from Accell.",
          },
        ],
      },
    ],
  },
  {
    key: "operations",
    title: "Operations",
    description:
      "Questions about ongoing operational expectations and whether the relationship is treated as non-exclusive contract work.",
    questions: [
      {
        id: "vacation_requests_require_approval",
        key: "vacation_requests_require_approval",
        section: "operations",
        prompt: "Are you required to submit vacation requests for approval?",
        label: "Are you required to submit vacation requests for approval?",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: true,
            severity: "medium",
            code: "vacation_approval_required",
            message: "The driver reports vacation requests require approval in an employee-like manner.",
          },
        ],
      },
      {
        id: "company_set_start_times_required",
        key: "company_set_start_times_required",
        section: "operations",
        prompt:
          "Are you required to report at company-set start times other than customer, legal, or service-window requirements?",
        label:
          "Are you required to report at company-set start times other than customer, legal, or service-window requirements?",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: true,
            severity: "medium",
            code: "company_set_start_times",
            message: "Company-set start times may indicate more control than intended for independent contractors.",
          },
        ],
      },
      {
        id: "supervised_like_employee",
        key: "supervised_like_employee",
        section: "operations",
        prompt: "Are you supervised by Accell managers in the same way employees are supervised?",
        label: "Are you supervised by Accell managers in the same way employees are supervised?",
        required: true,
        type: "yes_no",
        weight: 5,
        riskIf: [
          {
            equals: true,
            severity: "high",
            code: "employee_style_supervision",
            message: "The contractor reports employee-style supervision by Accell managers.",
          },
        ],
      },
      {
        id: "interacts_with_hr_like_employee",
        key: "interacts_with_hr_like_employee",
        section: "operations",
        prompt: "Do you interact with HR as though you were an employee?",
        label: "Do you interact with HR as though you were an employee?",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: true,
            severity: "high",
            code: "employee_style_hr_interaction",
            message: "The contractor reports HR interaction similar to an employee relationship.",
          },
        ],
      },
      {
        id: "understands_work_not_guaranteed",
        key: "understands_work_not_guaranteed",
        section: "operations",
        prompt: "Do you understand that work is not guaranteed and is offered based on business needs?",
        label: "Do you understand that work is not guaranteed and is offered based on business needs?",
        required: true,
        type: "yes_no",
        weight: 3,
        riskIf: [
          {
            equals: false,
            severity: "medium",
            code: "guaranteed_work_not_understood",
            message: "The driver does not acknowledge that work is offered based on business needs and is not guaranteed.",
          },
        ],
      },
      {
        id: "understands_relationship_is_non_exclusive",
        key: "understands_relationship_is_non_exclusive",
        section: "operations",
        prompt: "Do you understand that this relationship is non-exclusive unless separately agreed in writing?",
        label: "Do you understand that this relationship is non-exclusive unless separately agreed in writing?",
        required: true,
        type: "yes_no",
        weight: 3,
        riskIf: [
          {
            equals: false,
            severity: "medium",
            code: "non_exclusive_relationship_not_acknowledged",
            message: "The contractor does not acknowledge the non-exclusive nature of the relationship.",
          },
        ],
      },
    ],
  },
  {
    key: "attestation",
    title: "Attestation",
    description:
      "Final certifications confirming the contractor understands the relationship and is attesting truthfully.",
    questions: [
      {
        id: "answers_truthful_and_complete",
        key: "answers_truthful_and_complete",
        section: "attestation",
        prompt: "I certify my answers are truthful and complete",
        label: "I certify my answers are truthful and complete",
        required: true,
        type: "yes_no",
        weight: 5,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "truthfulness_not_certified",
            message: "The driver did not certify the truthfulness and completeness of the answers.",
          },
        ],
      },
      {
        id: "responsible_for_own_taxes",
        key: "responsible_for_own_taxes",
        section: "attestation",
        prompt: "I understand I am responsible for my own taxes",
        label: "I understand I am responsible for my own taxes",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "tax_responsibility_not_acknowledged",
            message: "The driver did not acknowledge responsibility for their own taxes.",
          },
        ],
      },
      {
        id: "responsible_for_own_business_expenses_attestation",
        key: "responsible_for_own_business_expenses_attestation",
        section: "attestation",
        prompt: "I understand I am responsible for my own ordinary business expenses",
        label: "I understand I am responsible for my own ordinary business expenses",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "expense_responsibility_not_acknowledged",
            message: "The driver did not acknowledge responsibility for ordinary business expenses.",
          },
        ],
      },
      {
        id: "may_accept_or_decline_work",
        key: "may_accept_or_decline_work",
        section: "attestation",
        prompt: "I understand I may accept or decline offered work, subject to contract terms",
        label: "I understand I may accept or decline offered work, subject to contract terms",
        required: true,
        type: "yes_no",
        weight: 4,
        riskIf: [
          {
            equals: false,
            severity: "high",
            code: "right_to_decline_not_acknowledged",
            message: "The driver did not acknowledge the right to accept or decline work under the contract.",
          },
        ],
      },
      {
        id: "attestation_does_not_guarantee_work",
        key: "attestation_does_not_guarantee_work",
        section: "attestation",
        prompt: "I understand this attestation does not guarantee work",
        label: "I understand this attestation does not guarantee work",
        required: true,
        type: "yes_no",
        weight: 3,
        riskIf: [
          {
            equals: false,
            severity: "medium",
            code: "work_guarantee_not_understood",
            message: "The driver did not acknowledge that this attestation does not guarantee work.",
          },
        ],
      },
      {
        id: "electronic_signature",
        key: "electronic_signature",
        section: "attestation",
        prompt: "Electronic signature (typed legal name)",
        label: "Electronic signature (typed legal name)",
        required: true,
        type: "signature",
        description: "Typed legal name used as the electronic signature for the packet.",
        weight: 5,
        riskIf: [
          {
            equals: null,
            severity: "high",
            code: "signature_missing",
            message: "The electronic signature is missing.",
          },
        ],
      },
    ],
  },
];

export const driverComplianceSurveyDefinition: ComplianceSurveyDefinition = {
  version: DRIVER_COMPLIANCE_SURVEY_VERSION,
  title: "Driver Compliance Survey",
  description:
    "Config-driven questionnaire for assessing contractor compliance indicators without hardcoding survey content in UI pages.",
  sectionOrder: [...complianceSectionOrder],
  sections: driverComplianceSurveySchema,
};

export function getComplianceSectionDefinition(key: ComplianceSectionKey) {
  return driverComplianceSurveyDefinition.sections.find((section) => section.key === key) ?? null;
}

export function getComplianceQuestionDefinition(
  sectionKey: ComplianceSectionKey,
  questionId: string
) {
  return (
    getComplianceSectionDefinition(sectionKey)?.questions.find(
      (question) => question.id === questionId || question.key === questionId
    ) ?? null
  );
}

export function getComplianceQuestionNumber(
  sectionKey: ComplianceSectionKey,
  questionId: string
): number | null {
  let questionNumber = 1;

  for (const section of driverComplianceSurveyDefinition.sections) {
    for (const question of section.questions) {
      if (section.key === sectionKey && (question.id === questionId || question.key === questionId)) {
        return questionNumber;
      }

      questionNumber += 1;
    }
  }

  return null;
}
