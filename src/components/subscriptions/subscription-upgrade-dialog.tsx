"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api/admin";
import type { SubscriptionRecord } from "@/types/admin";

interface SubscriptionUpgradeDialogProps {
  subscription: SubscriptionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SubscriptionUpgradeDialog({
  subscription,
  open,
  onOpenChange,
  onSuccess,
}: SubscriptionUpgradeDialogProps) {
  const [planCode, setPlanCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: plansData } = useSWR(open ? "subscription-plans" : null, () =>
    adminApi.getSubscriptionPlans(),
  );

  useEffect(() => {
    if (!open) {
      setPlanCode("");
      return;
    }

    const firstUpgrade = plansData?.plans.find(
      (plan) => plan.code !== subscription?.planCode,
    );
    if (firstUpgrade) {
      setPlanCode(firstUpgrade.code);
    }
  }, [open, plansData?.plans, subscription?.planCode]);

  const handleUpgrade = async () => {
    if (!subscription || !planCode) return;

    setSubmitting(true);
    try {
      const result = await adminApi.upgradeUserSubscription(
        subscription.id,
        planCode,
      );

      if (result.requiresPayment && result.authorizationUrl) {
        toast.message("Checkout link generated", {
          description: result.message,
          action: {
            label: "Open checkout",
            onClick: () => window.open(result.authorizationUrl, "_blank"),
          },
        });
      } else {
        toast.success(result.message);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upgrade failed");
    } finally {
      setSubmitting(false);
    }
  };

  const availablePlans =
    plansData?.plans.filter((plan) => plan.code !== subscription?.planCode) ??
    [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade subscription</DialogTitle>
          <DialogDescription>
            {subscription?.userEmail
              ? `Change plan for ${subscription.userEmail}. If a saved card exists, it will be charged immediately. Otherwise a checkout link is generated for the user.`
              : "Select a new plan for this subscription."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Current plan</p>
          <p className="font-medium">
            {subscription?.planName || subscription?.planCode || "—"}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">New plan</p>
          <Select
            value={planCode}
            onValueChange={(value) => {
              if (value) setPlanCode(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
              {availablePlans.map((plan) => (
                <SelectItem key={plan.code} value={plan.code}>
                  {plan.name} — {plan.formattedPrice}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={submitting || !planCode || availablePlans.length === 0}
            onClick={handleUpgrade}
          >
            {submitting ? "Processing…" : "Upgrade plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
