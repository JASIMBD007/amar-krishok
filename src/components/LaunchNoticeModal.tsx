import { ArrowRight, Rocket, X } from "lucide-react";
import { Box, Button, Dialog, IconButton, Typography } from "@mui/material";
import { useTranslate } from "../i18n";

export function LaunchNoticeModal({ onClose }: { onClose: () => void }) {
  const t = useTranslate();

  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby="launch-notice-title"
      slotProps={{
        backdrop: { className: "launch-notice-backdrop" },
        paper: { className: "launch-notice-modal" },
      }}
    >
      <Box component="section">
        <IconButton
          aria-label={t("Close")}
          className="icon-button close-button launch-notice-close"
          onClick={onClose}
          title={t("Close")}
        >
          <X size={20} />
        </IconButton>
        <Box aria-hidden className="launch-notice-icon">
          <Rocket size={28} />
        </Box>
        <Typography component="span" className="launch-notice-eyebrow">{t("Launching soon")}</Typography>
        <Typography component="h2" id="launch-notice-title">{t("A fairer harvest journey is coming")}</Typography>
        <Typography component="p">
          {t(
            "AmarKrishok is preparing to connect farmers, buyers, and trusted delivery partners across Bangladesh.",
          )}
        </Typography>
        <Button className="primary-button" variant="contained" onClick={onClose} type="button">
          <ArrowRight size={18} />
          {t("Explore the preview")}
        </Button>
      </Box>
    </Dialog>
  );
}
