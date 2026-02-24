import path from "node:path";

export function normalizePathForMatch(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function isSourceLocalePath(filePath: string, sourceLocale: string): boolean {
  const basename = path.basename(filePath).toLowerCase();
  const normalizedLocale = sourceLocale.toLowerCase();
  return (
    basename === `${normalizedLocale}.json` || basename.endsWith(`.${normalizedLocale}.json`)
  );
}

export function buildTargetLocalePath(
  sourceFilePath: string,
  sourceLocale: string,
  targetLocale: string
): string | undefined {
  const basename = path.basename(sourceFilePath);
  const sourceLower = sourceLocale.toLowerCase();
  const basenameLower = basename.toLowerCase();
  const directory = path.dirname(sourceFilePath);

  if (basenameLower === `${sourceLower}.json`) {
    return path.join(directory, `${targetLocale}.json`);
  }

  const suffix = `.${sourceLower}.json`;
  if (basenameLower.endsWith(suffix)) {
    const prefix = basename.slice(0, basename.length - suffix.length);
    return path.join(directory, `${prefix}.${targetLocale}.json`);
  }

  return undefined;
}

