"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { trackClientError, trackEvent } from "@/lib/observability";

export function Observability() {
  const pathname = usePathname();

  useReportWebVitals((metric) => {
    void trackEvent({
      event_type: "web_vital",
      severity: metric.rating === "poor" ? "warn" : "info",
      route: pathname,
      metadata: {
        id: metric.id,
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
      },
    });
  });

  useEffect(() => {
    function onError(event: ErrorEvent) {
      trackClientError(event.error ?? event.message, pathname);
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      trackClientError(event.reason, pathname);
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [pathname]);

  return null;
}
