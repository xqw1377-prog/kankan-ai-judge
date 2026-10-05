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

export const AI_CONSENT_VERSION = "2026-10-05";
const CONSENT_VERSION_KEY = "kankan_ai_consent_version";
const LEGACY_CONSENT_KEY = "kankan_ai_consent";

/** Only the current version counts. A leftover kankan_ai_consent=yes does not. */
export const hasAiConsent = () => localStorage.getItem(CONSENT_VERSION_KEY) === AI_CONSENT_VERSION;

export const setAiConsent = () => {
  localStorage.setItem(CONSENT_VERSION_KEY, AI_CONSENT_VERSION);
  localStorage.removeItem(LEGACY_CONSENT_KEY);
};

export const revokeAiConsent = () => {
  localStorage.removeItem(CONSENT_VERSION_KEY);
  localStorage.removeItem(LEGACY_CONSENT_KEY);
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
          className="text-xs text-primary underline text-left px-1"
        >
          {t.aiConsentPrivacy}
        </button>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={() => { setAiConsent(); onAgree(); }} className="w-full">
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
