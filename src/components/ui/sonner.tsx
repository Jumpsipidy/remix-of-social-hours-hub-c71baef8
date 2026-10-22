import { Toaster as Sonner } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from "lucide-react";
import { useSiteTheme } from "@/components/theme-provider";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Custom "Socialinės Valandos" notification surface.
 * Dark glass card, gradient accent rail, spring-ish entrance — nothing default.
 */
const iconWrap =
  "grid h-8 w-8 shrink-0 place-items-center rounded-xl border shadow-inner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useSiteTheme();
  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      offset={16}
      gap={10}
      visibleToasts={3}
      closeButton
      className="sv-toaster"
      icons={{
        success: (
          <span className={`${iconWrap} border-success/40 bg-success/15 text-success`}>
            <CheckCircle2 className="h-4 w-4" />
          </span>
        ),
        error: (
          <span className={`${iconWrap} border-destructive/40 bg-destructive/15 text-destructive`}>
            <XCircle className="h-4 w-4" />
          </span>
        ),
        warning: (
          <span className={`${iconWrap} border-warning/40 bg-warning/15 text-warning`}>
            <AlertTriangle className="h-4 w-4" />
          </span>
        ),
        info: (
          <span className={`${iconWrap} border-primary/40 bg-primary/15 text-primary`}>
            <Info className="h-4 w-4" />
          </span>
        ),
        loading: (
          <span className={`${iconWrap} border-border bg-muted/40 text-muted-foreground`}>
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        ),
      }}
      toastOptions={{
        unstyled: true,
        duration: 6000,
        classNames: {
          toast:
            "sv-toast group pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg",
          title: "text-sm font-semibold leading-relaxed [overflow-wrap:anywhere]",
          description: "mt-0.5 text-xs leading-snug text-muted-foreground",
          icon: "mt-0.5",
          content: "min-w-0 flex-1",
          actionButton:
            "ml-2 shrink-0 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow",
          cancelButton:
            "ml-2 shrink-0 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground",
          closeButton:
            "rounded-full border border-border bg-card text-muted-foreground hover:text-foreground",
          success: "sv-toast-success",
          error: "sv-toast-error",
          warning: "sv-toast-warning",
          info: "sv-toast-info",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
