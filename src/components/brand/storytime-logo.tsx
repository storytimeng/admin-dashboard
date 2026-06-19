import Image from "next/image";
import { cn } from "@/lib/utils";

export const STORYTIME_LOGO_SRC = "/image/logo.png";

type StorytimeLogoProps = {
  className?: string;
  imageClassName?: string;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
};

const sizeClasses = {
  sm: "h-8 w-auto",
  md: "h-10 w-auto",
  lg: "h-16 w-auto",
} as const;

export function StorytimeLogo({
  className,
  imageClassName,
  size = "md",
  priority = false,
}: StorytimeLogoProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src={STORYTIME_LOGO_SRC}
        alt="Storytime"
        width={120}
        height={160}
        priority={priority}
        className={cn("object-contain", sizeClasses[size], imageClassName)}
      />
    </span>
  );
}

type StorytimeBrandProps = {
  className?: string;
  logoSize?: StorytimeLogoProps["size"];
  showSubtitle?: boolean;
  subtitle?: string;
  priority?: boolean;
};

export function StorytimeBrand({
  className,
  logoSize = "md",
  showSubtitle = true,
  subtitle = "Admin Console",
  priority = false,
}: StorytimeBrandProps) {
  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      <StorytimeLogo size={logoSize} priority={priority} />
      <div className="flex min-w-0 flex-col">
        <span className="font-semibold tracking-tight truncate">Storytime</span>
        {showSubtitle ? (
          <span className="text-xs text-muted-foreground truncate">
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}
