/** Permanent accounts can log out. An anonymous trial cannot; register-and-keep or delete the trial. */
export function canShowLogout(user: { is_anonymous?: boolean } | null | undefined): boolean {
  if (!user) return false;
  return user.is_anonymous !== true;
}
