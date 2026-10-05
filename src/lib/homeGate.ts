/** Home is browsable without an account; guests get one free AI analysis via an anonymous session. */
export function homeGate(_input: { hasSession: boolean; isGuest: boolean }): "home" | "login" {
  return "home";
}
