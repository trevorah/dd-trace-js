declare module 'import-in-the-middle' {
  function iitm(names: string[], hook: (
    moduleExports: unknown,
    name: string,
    baseDir: string
  ) => unknown): undefined;
  export = iitm;
}
