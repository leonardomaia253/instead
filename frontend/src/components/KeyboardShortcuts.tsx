"use client";

import { useEffect } from "react";
import { useRouter } from "@/navigation";
import { useToast } from "@/components/Toast";

export function KeyboardShortcuts() {
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Verifica se o usuário está digitando em um input, textarea ou select
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      if (e.altKey) {
        let targetPath = "";
        let pageName = "";

        switch (e.key.toLowerCase()) {
          case "l":
            targetPath = "/lending";
            pageName = "Lending Hub";
            break;
          case "f":
            targetPath = "/factory";
            pageName = "Token Factory";
            break;
          case "s":
            targetPath = "/staking";
            pageName = "Staking Pool";
            break;
          case "d":
            targetPath = "/dashboard";
            pageName = "Dashboard";
            break;
          default:
            return;
        }

        if (targetPath) {
          e.preventDefault();
          router.push(targetPath);
          toast.info(`Navegando para ${pageName} 🚀`);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, toast]);

  return null;
}