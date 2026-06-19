export type ModerationAction = "suspend" | "unsuspend" | "delete";

export function moderationActionMessage(
  entityLabel: string,
  action: ModerationAction,
  options?: { deletePastTense?: "removed" | "deleted" },
): string {
  const deletePastTense = options?.deletePastTense ?? "removed";

  switch (action) {
    case "suspend":
      return `${entityLabel} suspended`;
    case "unsuspend":
      return `${entityLabel} unsuspended`;
    case "delete":
      return `${entityLabel} ${deletePastTense}`;
    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
}
