"use client";
import { useEffect, useState } from "react";
import { Button, type ButtonProps } from "./button";

/** Two-step destructive button: first click arms it, second click within 4s confirms. */
export function ConfirmButton({
  onConfirm,
  confirmLabel,
  children,
  ...props
}: Omit<ButtonProps, "onClick"> & { onConfirm: () => void; confirmLabel: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <Button
      {...props}
      variant={armed ? "danger" : props.variant}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
