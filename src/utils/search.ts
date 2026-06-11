export type SearchableValue = SearchableValue[] | boolean | null | number | string | undefined;

function flattenSearchValues(values: SearchableValue[]): Array<boolean | null | number | string | undefined> {
  return values.flatMap((value) => (Array.isArray(value) ? flattenSearchValues(value) : value));
}

export function normalizeSearchText(value: SearchableValue) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .trim();
}

export function matchesSearch(query: string, values: SearchableValue[]) {
  const needle = normalizeSearchText(query);

  if (!needle) {
    return true;
  }

  return flattenSearchValues(values).some((value) => normalizeSearchText(value).includes(needle));
}
