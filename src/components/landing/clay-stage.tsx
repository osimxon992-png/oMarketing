"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ClayVariant } from "./clay-scene";
import { cn } from "@/lib/utils/cn";

// three.js only loads in the browser, after the page's HTML is already readable.
const ClayScene = dynamic(() => import("./clay-scene"), { ssr: false });

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

/** Decorative WebGL clay tableau behind a section; pauses offscreen, holds still for reduced motion. */
export function ClayStage({ variant, className }: { variant: ClayVariant; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [still, setStill] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSupported(webglAvailable());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => setStill(mq.matches);
    onMotion();
    mq.addEventListener("change", onMotion);
    const io = new IntersectionObserver(([entry]) => setActive(Boolean(entry?.isIntersecting)), { rootMargin: "120px" });
    if (ref.current) io.observe(ref.current);
    return () => {
      io.disconnect();
      mq.removeEventListener("change", onMotion);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("absolute inset-0 transition-opacity duration-700 ease-out", ready ? "opacity-100" : "opacity-0", className)}
    >
      {supported && <ClayScene variant={variant} active={active} still={still} onReady={() => setReady(true)} />}
    </div>
  );
}
