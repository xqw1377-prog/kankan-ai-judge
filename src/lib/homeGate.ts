/** Where the home screen should send someone who just opened the app. */
export function homeGate(input: {
  hasSession: boolean;
  isGuest: boolean;
}): "home" | "login" {
  if (input.hasSession || input.isGuest) return "home";
  return "login";
}
