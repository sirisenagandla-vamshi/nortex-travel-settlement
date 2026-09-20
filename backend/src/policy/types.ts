export type ExpenseCategory =
  | 'LODGING'
  | 'MEALS'
  | 'LOCAL_CONVEYANCE'
  | 'BUSINESS_ENTERTAINMENT'
  | 'AIR_TRAVEL'
  | 'OTHER';

export type Role =
  | 'EMPLOYEE'
  | 'REPORTING_MANAGER'
  | 'HEAD_OF_DEPARTMENT'
  | 'HEAD_OF_DIVISION'
  | 'MD'
  | 'FINANCE';

export type InboxClassification =
  | 'CONTEXT'
  | 'INCLUDE'
  | 'EXCLUDE'
  | 'DUPLICATE'
  | 'NOISE'
  | 'OTHER_PERSON';

export type PolicyLine = {
  category: ExpenseCategory;
  merchant: string;
  description: string;
  incurredOn: string;
  claimedPaise: number;
  reimbursablePaise: number;
  disallowedPaise: number;
  proofRef: string | null;
  included: boolean;
  flags: string[];
  sourceFilename?: string;
};

export type TripContext = {
  destination: string;
  cityClass: 'TIER_1' | 'TIER_2' | 'TIER_3';
  startDate: string;
  endDate: string;
  nightsRequested: number;
  nightsBooked: number;
  estimatedPaise: number;
  advanceDisbursedPaise: number;
  claimantName: string;
};

export type ApprovalBand = {
  roles: Role[];
  label: string;
};
