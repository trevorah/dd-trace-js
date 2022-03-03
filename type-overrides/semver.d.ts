declare module 'semver' {
  function satisfies(version: string, range: string): boolean;
  function coerce(version: string | number | null | undefined): string;
}
