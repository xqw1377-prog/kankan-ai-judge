/** Home is browsable without an account; AI analysis asks for sign-in instead. */
export function homeGate(_input: { hasSession: boolean; isGuest: boolean }): "home" | "login" {
  return "home";
}
