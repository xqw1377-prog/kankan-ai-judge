import { useI18n } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AI_CONSENT_VERSION = "2026-10-07";

const LEGACY_VERSION_KEY = "kankan_ai_consent_version";
const LEGACY_AT_KEY = "kankan_ai_consent_at";
const LEGACY_YES_KEY = "kankan_ai_consent";

export type AiConsentRecord = { version: string; acceptedAt: string | null };

export function consentStorageKey(userId: string) {
  return `kankan_ai_consent:${userId}`;
}

function readRecord(userId: string): AiConsentRecord | null {
  try {
    const raw = localStorage.getItem(consentStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: unknown; acceptedAt?: unknown };
    if (typeof parsed.version !== "string") return null;
    return {
      version: parsed.version,
      acceptedAt: typeof parsed.acceptedAt === "string" ? parsed.acceptedAt : null,
    };
  } catch {
    return null;
  }
}

function clearLegacyGlobalConsent() {
  localStorage.removeItem(LEGACY_VERSION_KEY);
  localStorage.removeItem(LEGACY_AT_KEY);
  localStorage.removeItem(LEGACY_YES_KEY);
}

/** A global kankan_ai_consent* key does not count. Consent is this user id plus the current version. */
export const hasAiConsent = (userId: string | null | undefined) => {
  if (!userId) return false;
  return readRecord(userId)?.version === AI_CONSENT_VERSION;
};

export const getAiConsentRecord = (userId: string | null | undefined): AiConsentRecord | null => {
  if (!userId) return null;
  const record = readRecord(userId);
  if (!record || record.version !== AI_CONSENT_VERSION) return null;
  return record;
};

export const setAiConsent = (userId: string) => {
  if (!userId) return;
  localStorage.setItem(consentStorageKey(userId), JSON.stringify({
    version: AI_CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
  }));
  clearLegacyGlobalConsent();
};

export const revokeAiConsent = (userId: string | null | undefined) => {
  if (userId) localStorage.removeItem(consentStorageKey(userId));
  clearLegacyGlobalConsent();
};

interface Props {
  open: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

const AiConsentDialog = ({ open, onAgree, onDecline }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <AlertDialogTitle className="text-lg">{t.aiConsentTitle}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm leading-relaxed">
            {t.aiConsentBody}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <button
          onClick={() => navigate("/privacy")}
          className="min-h-11 text-sm text-primary underline text-left px-1"
        >
          {t.aiConsentPrivacy}
        </button>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onAgree} className="w-full">
            {t.aiConsentAgree}
          </Button>
          <Button variant="ghost" onClick={onDecline} className="w-full text-muted-foreground">
            {t.aiConsentDecline}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AiConsentDialog;
