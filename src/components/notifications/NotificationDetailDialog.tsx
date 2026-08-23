import { Bell, X } from "lucide-react";
import { Box, Dialog, IconButton, Typography } from "@mui/material";
import { useTranslate } from "../../i18n";
import type { AppNotification } from "../../types";

function splitNotificationBody(body: string) {
  return body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseNotificationLine(line: string) {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex <= 0) {
    return null;
  }

  return {
    label: line.slice(0, separatorIndex).trim(),
    value: line.slice(separatorIndex + 1).trim(),
  };
}

function formatNotificationDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function NotificationDetailDialog({
  notification,
  onClose,
}: {
  notification: AppNotification;
  onClose: () => void;
}) {
  const t = useTranslate();
  const lines = splitNotificationBody(notification.body);
  const createdAt = formatNotificationDate(notification.createdAt);

  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby="notification-detail-title"
      slotProps={{
        backdrop: { className: "admin-modal-backdrop notification-detail-backdrop" },
        paper: { className: "admin-modal notification-detail-modal" },
      }}
    >
        <Box className="admin-modal-header">
          <Box>
            <Typography component="span">{t("Notification details")}</Typography>
            <Typography component="h2" id="notification-detail-title">{t(notification.title)}</Typography>
          </Box>
          <IconButton className="icon-button close-button" aria-label={t("Close modal")} onClick={onClose}>
            <X size={20} />
          </IconButton>
        </Box>
        <Box className="notification-detail-body">
          <Box className={`notification-detail-type ${notification.tone}`}>
            <Bell size={18} />
            <Typography component="strong">{t(notification.meta)}</Typography>
            {createdAt ? <Typography component="span">{createdAt}</Typography> : null}
          </Box>
          <Box className="notification-detail-summary">
            {lines.length > 0 ? (
              lines.map((line, index) => {
                const parsed = parseNotificationLine(line);
                if (!parsed) {
                  return (
                    <Typography component="p" className="notification-detail-paragraph" key={`${line}-${index}`}>
                      {line}
                    </Typography>
                  );
                }

                return (
                  <Box className="notification-detail-line" key={`${line}-${index}`}>
                    <Typography component="strong">{t(parsed.label)}</Typography>
                    <Typography component="span">{parsed.value || "-"}</Typography>
                  </Box>
                );
              })
            ) : (
              <Typography component="p" className="notification-detail-paragraph">{t("No details provided.")}</Typography>
            )}
          </Box>
        </Box>
    </Dialog>
  );
}
