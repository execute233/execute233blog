export function isHexAlphaColor(value: unknown): value is string {
    return typeof value === "string" && /^#[\da-f]{8}$/i.test(value);
}

export function normalizeHexColor(value: unknown): string | undefined {
    if (isHexAlphaColor(value)) return value;
    if (typeof value === "string" && /^#[\da-f]{6}$/i.test(value))
        return `${value}ff`;
    return undefined;
}
