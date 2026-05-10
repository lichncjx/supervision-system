# Regression Tests

## Current Baseline

`tests/regression-baseline.cjs` is a lightweight manual regression script for the current 9-state workflow.

It no longer asserts the historical 15-state workflow. Legacy states are only used as negative checks, such as verifying that `/api/works?status=APPROVED` is rejected.

Current runtime states:

- `DRAFT`
- `PENDING_DECOMPOSE`
- `PROPOSING`
- `IN_PROGRESS`
- `ADJUSTING`
- `CANCELLING`
- `COMPLETING`
- `COMPLETED`
- `CANCELLED`

Important current rules:

- Returned work is displayed as returned draft by deriving it from `DRAFT` plus reject traces.
- Proposal approval enters `IN_PROGRESS`.
- Completion approval uses `COMPLETING`.
- Cancel approval uses `CANCELLING`; priority-work main-leader approval remains in `CANCELLING` until final approval.
- `PENDING_DECOMPOSE` only means a company-leader-created todo is waiting for department decomposition.

## Target Contract

The primary automated business contract is:

```bash
TARGET_CONTRACT_ENV=local TARGET_CONTRACT_RESET=1 node tests/target-contract/run-target-contract.cjs --base-url http://localhost:5000
```

This suite owns the detailed role, visibility, dashboard, Excel, and workflow assertions.

## Manual Baseline

Prerequisites:

1. Database is running.
2. Migrations and seed data have been applied.
3. Local app is running on port 5000.

Run:

```bash
node tests/regression-baseline.cjs
```

The script creates temporary work items with a timestamp prefix, exercises representative 9-state workflow paths, and attempts to clean up created items at the end.
