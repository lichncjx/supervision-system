function normalizeEmpty(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

function normalizeNumber(value: unknown) {
  const normalized = normalizeEmpty(value);
  if (normalized === null) return null;
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? numberValue : normalized;
}

function normalizeDateString(value: unknown) {
  const normalized = normalizeEmpty(value);
  if (normalized === null) return null;
  if (normalized instanceof Date) return normalized.toISOString().split('T')[0];
  const text = String(normalized);
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date.toISOString().split('T')[0];
  return text;
}

function normalizeNode(value: any) {
  return {
    title: normalizeEmpty(value?.title),
    completeTime: normalizeDateString(value?.completeTime),
    children: Array.isArray(value?.children)
      ? value.children.map(normalizeNode)
      : [],
  };
}

function normalizeCooperator(value: any) {
  return {
    departmentId: normalizeNumber(value?.departmentId),
    leaderMemberId: normalizeNumber(value?.leaderMemberId),
    leader: normalizeEmpty(value?.leader),
    personMemberId: normalizeNumber(value?.personMemberId),
    person: normalizeEmpty(value?.person),
  };
}

function normalizeComparableObject(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, normalizeComparableValue(key, item)] as const)
      .filter(([, item]) => item !== null),
  );
}

function normalizeComparableValue(field: string, value: unknown): unknown {
  const normalized = normalizeEmpty(value);
  if (normalized === null) return null;

  if (
    field === 'departmentId' ||
    field === 'responsibleLeaderMemberId' ||
    field === 'responsiblePersonMemberId'
  ) {
    return normalizeNumber(normalized);
  }

  if (field === 'formedTime' || field === 'planCompleteTime' || field === 'completeTime') {
    return normalizeDateString(normalized);
  }

  if (field === 'isInnovation') return Boolean(normalized);

  if (field === 'nodes') {
    return Array.isArray(normalized) ? normalized.map(normalizeNode) : [];
  }

  if (field === 'cooperators') {
    return Array.isArray(normalized) ? normalized.map(normalizeCooperator) : [];
  }

  if (typeof normalized === 'string') return normalized.trim();

  if (Array.isArray(normalized)) {
    return normalized.map((item) => (
      item && typeof item === 'object'
        ? normalizeComparableObject(item as Record<string, unknown>)
        : normalizeEmpty(item)
    ));
  }

  if (typeof normalized === 'object') {
    return normalizeComparableObject(normalized as Record<string, unknown>);
  }

  return normalized;
}

export function hasAdjustmentValueChanged(field: string, before: unknown, after: unknown) {
  return (
    JSON.stringify(normalizeComparableValue(field, before)) !==
    JSON.stringify(normalizeComparableValue(field, after))
  );
}

export function getChangedAdjustmentFields(
  beforeSnapshot: Record<string, unknown>,
  patch: Record<string, unknown>,
) {
  return Object.keys(patch).filter((field) =>
    hasAdjustmentValueChanged(field, beforeSnapshot[field], patch[field]),
  );
}
