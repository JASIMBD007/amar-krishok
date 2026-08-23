import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Box, CircularProgress, Typography } from "@mui/material";

/** A friendly empty-state block: icon chip, title, optional hint and action. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <Box className="empty-state">
      <Box component="span" className="empty-state-icon">
        <Icon size={24} />
      </Box>
      <Typography component="strong">{title}</Typography>
      {hint ? <Typography component="p">{hint}</Typography> : null}
      {action ? <Box className="empty-state-action">{action}</Box> : null}
    </Box>
  );
}

/** A lightweight loading row for lists, consistent across dashboards. */
export function ListLoading({ label }: { label: string }) {
  return (
    <Box className="list-loading" role="status">
      <CircularProgress aria-hidden="true" size={18} thickness={5} />
      <Typography component="span">{label}</Typography>
    </Box>
  );
}
