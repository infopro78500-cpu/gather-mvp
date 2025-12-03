declare module "slice-ansi" {
  type Options = {
    preserveAnsiEscapeCodes?: boolean;
  };

  function sliceAnsi(input: string, begin: number, end?: number, options?: Options): string;

  export = sliceAnsi;
}
