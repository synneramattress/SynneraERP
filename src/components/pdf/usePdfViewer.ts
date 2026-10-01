"use client";

import { useCallback, useState } from "react";
import type { InAppPdfSource } from "./InAppPdfViewer";

export function usePdfViewer() {
  const [source, setSource] = useState<InAppPdfSource | null>(null);
  const [title, setTitle] = useState("PDF");
  const [fileName, setFileName] = useState<string | undefined>();

  const openUrl = useCallback((url: string, opts?: { title?: string; fileName?: string }) => {
    setTitle(opts?.title || "PDF");
    setFileName(opts?.fileName);
    setSource({ kind: "url", url });
  }, []);

  const openBlob = useCallback(
    (blob: Blob, opts?: { title?: string; fileName?: string }) => {
      setTitle(opts?.title || "PDF");
      setFileName(opts?.fileName || "document.pdf");
      setSource({ kind: "blob", blob, fileName: opts?.fileName });
    },
    []
  );

  const close = useCallback(() => {
    setSource(null);
  }, []);

  return {
    source,
    title,
    fileName,
    openUrl,
    openBlob,
    close,
    isOpen: source != null,
  };
}
