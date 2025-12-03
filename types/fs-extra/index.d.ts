declare module "fs-extra" {
  import fs from "fs";

  export * from "fs";

  export function copy(src: string, dest: string): Promise<void>;
  export function pathExists(path: string): Promise<boolean>;
  export function ensureDir(path: string): Promise<void>;

  const fsExtra: typeof fs;
  export default fsExtra;
}
