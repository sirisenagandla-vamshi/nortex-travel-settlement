import { Link } from 'react-router-dom';

const CATEGORIES = [
  {
    id: 'DOMESTIC_TRAVEL',
    title: 'Domestic travel',
    blurb: 'Pre-trip request with booking, an advance if you need one, and settlement against your bills.',
    steps: 'Travel request → Trip approval → Advance → Settlement → Finance → Payout',
    enabled: true,
  },
  {
    id: 'CASH_ADVANCE',
    title: 'Cash advance',
    blurb: 'Money up front for planned spend, settled against receipts when it is done.',
    steps: 'Not in this pack',
    enabled: false,
  },
  {
    id: 'CONFERENCE',
    title: 'Conference & training',
    blurb: 'Courses, certifications and conference passes.',
    steps: 'Not in this pack',
    enabled: false,
  },
  {
    id: 'TEAM_MEALS',
    title: 'Team meals',
    blurb: 'Working meals with the team.',
    steps: 'Not in this pack',
    enabled: false,
  },
  {
    id: 'PHONE',
    title: 'Phone & internet',
    blurb: 'Monthly connection bill.',
    steps: 'Not in this pack',
    enabled: false,
  },
  {
    id: 'GENERAL',
    title: 'General expense',
    blurb: 'Anything without a category of its own.',
    steps: 'Not in this pack',
    enabled: false,
  },
];

export function NewRequestPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Raise a request</h1>
        <p className="text-sm text-muted mt-1">
          Pick a category — its form, approvers and policy checks follow from it. For this assignment the right choice
          is <strong>Domestic travel</strong> (Chaitanya’s Bengaluru trip in the pack).
        </p>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {CATEGORIES.map((c) =>
          c.enabled ? (
            <Link
              key={c.id}
              to="/claims/request/domestic"
              className="bg-white border border-line rounded-xl p-4 hover:border-brand"
            >
              <div className="font-medium">{c.title}</div>
              <p className="text-sm text-muted mt-2">{c.blurb}</p>
              <p className="text-xs text-brand mt-3">{c.steps}</p>
              <span className="inline-block mt-3 text-sm text-brand">Start →</span>
            </Link>
          ) : (
            <div key={c.id} className="bg-paper border border-line rounded-xl p-4 opacity-60">
              <div className="font-medium">{c.title}</div>
              <p className="text-sm text-muted mt-2">{c.blurb}</p>
              <p className="text-xs mt-3">{c.steps}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
