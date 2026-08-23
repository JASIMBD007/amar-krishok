import { ShoppingBag, Sprout, X } from "lucide-react";
import { Box, ButtonBase, Dialog, IconButton, Typography } from "@mui/material";
import { useTranslate } from "../i18n";
import type { RegistrationRole } from "../types";

export function RegisterChoiceModal({
  onChoose,
  onClose,
}: {
  onChoose: (role: RegistrationRole) => void;
  onClose: () => void;
}) {
  const t = useTranslate();

  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby="registration-choice-title"
      slotProps={{
        backdrop: { className: "admin-modal-backdrop auth-choice-backdrop" },
        paper: { className: "admin-modal auth-choice-modal" },
      }}
    >
        <Box className="admin-modal-header">
          <Box>
            <Typography component="span">{t("Create account")}</Typography>
            <Typography component="h2" id="registration-choice-title">{t("Do you want to buy or sell?")}</Typography>
          </Box>
          <IconButton className="icon-button close-button" aria-label={t("Close modal")} onClick={onClose}>
            <X size={18} />
          </IconButton>
        </Box>
        <Box className="auth-choice-grid">
          <ButtonBase className="auth-choice-card" onClick={() => onChoose("buyer")}>
            <Box component="span" className="auth-choice-icon">
              <ShoppingBag size={22} />
            </Box>
            <Typography component="strong">{t("I want to buy crops")}</Typography>
            <Typography component="em">{t("Create a buyer account to order from verified farmers.")}</Typography>
          </ButtonBase>
          <ButtonBase className="auth-choice-card" onClick={() => onChoose("farmer")}>
            <Box component="span" className="auth-choice-icon">
              <Sprout size={22} />
            </Box>
            <Typography component="strong">{t("I want to sell crops")}</Typography>
            <Typography component="em">{t("Create a seller account to post harvest lots.")}</Typography>
          </ButtonBase>
        </Box>
    </Dialog>
  );
}
