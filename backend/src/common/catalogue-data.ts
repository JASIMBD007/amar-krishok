export function catalogueKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function cropCreateData(name: string) {
  const normalizedName = name.trim();
  return {
    key: catalogueKey(normalizedName),
    name: normalizedName,
    nameBn: normalizedName,
    nameEn: normalizedName,
  };
}

export function districtCreateData(name: string) {
  const normalizedName = name.trim();
  return {
    name: normalizedName,
    nameBn: normalizedName,
    nameEn: normalizedName,
  };
}
