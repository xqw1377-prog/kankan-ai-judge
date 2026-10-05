/** Old links used /record for the meal log. That screen is /history. */
export function canonicalPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/record") return "/history";
  return path;
}
