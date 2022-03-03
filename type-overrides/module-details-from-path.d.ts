declare module 'module-details-from-path' {
  function parse(name: string): {
    basedir: string
  };
  export = parse;
}
