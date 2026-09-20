export type Role =
  | 'EMPLOYEE'
  | 'REPORTING_MANAGER'
  | 'HEAD_OF_DEPARTMENT'
  | 'HEAD_OF_DIVISION'
  | 'MD'
  | 'FINANCE';

export type ClaimStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_RM'
  | 'PENDING_HOD'
  | 'PENDING_FINANCE'
  | 'RETURNED'
  | 'REJECTED'
  | 'READY_TO_PAY'
  | 'PAID';

export type User = {
  id: string;
  empCode: string;
  name: string;
  email: string;
  role: Role;
  designation: string;
  department?: string;
  costCentre?: string;
  passwordHint?: string;
};

export type InboxMessage = {
  id: string;
  filename: string;
  subject: string;
  fromAddr: string;
  receivedAt: string;
  body: string;
  classification: 'CONTEXT' | 'INCLUDE' | 'EXCLUDE' | 'DUPLICATE' | 'NOISE' | 'OTHER_PERSON';
  reason: string;
};

export type ExpenseLine = {
  id: string;
  category: string;
  merchant: string;
  description: string;
  incurredOn: string;
  claimedPaise: number;
  reimbursablePaise: number;
  disallowedPaise: number;
  proofRef: string | null;
  included: boolean;
  flags: string[];
};

export type ApprovalStep = {
  id: string;
  stepOrder: number;
  role: Role;
  action: 'PENDING' | 'APPROVED' | 'RETURNED' | 'REJECTED' | 'SKIPPED';
  remarks: string | null;
  actedAt: string | null;
  assignee: { id: string; empCode: string; name: string; role: Role; designation: string };
};

export type TravelRequest = {
  travelRequestId: string;
  purpose: string;
  destination: string;
  cityClass: string;
  startDate: string;
  endDate: string;
  estimatedPaise: number;
  advanceDisbursed: number;
  advanceRef: string | null;
  nightsRequested: number;
  nightsBooked: number;
};

export type Claim = {
  id: string;
  claimNumber: string;
  status: ClaimStatus;
  claimedPaise: number;
  reimbursablePaise: number;
  disallowedPaise: number;
  advanceAppliedPaise: number;
  payablePaise: number;
  financeNotes: string | null;
  employeeNotes: string | null;
  submittedAt: string | null;
  claimant: User;
  travelRequest: TravelRequest;
  lines: ExpenseLine[];
  approvals: ApprovalStep[];
};

export type Dashboard = {
  needsAttention: number;
  inProgress: number;
  toApprove: number;
  toVerify: number;
  reimbursedPaise: number;
  primaryClaimId: string | null;
};
