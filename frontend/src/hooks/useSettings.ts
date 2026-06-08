"use client";

import { useState, useEffect } from "react";

export function useSettings() {
  const [disable3D, setDisable3D] = useState(false);

  useEffect(() => {
    const val = localStorage.getItem("disable3D") === "true";
    setDisable3D(val);

    const handleStorageChange = () => {
      setDisable3D(localStorage.getItem("disable3D") === "true");
    };

    window.addEventListener("settings-changed", handleStorageChange);
    return () => window.removeEventListener("settings-changed", handleStorageChange);
  }, []);

  const toggle3D = () => {
    const next = !disable3D;
    localStorage.setItem("disable3D", String(next));
    setDisable3D(next);
    window.dispatchEvent(new Event("settings-changed"));
  };

  return { disable3D, toggle3D };
}