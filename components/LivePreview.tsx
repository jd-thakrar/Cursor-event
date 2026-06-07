"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LiveError,
  LivePreview,
  LiveProvider,
} from "react-live";

type LivePreviewPanelProps = {
  code: string;
};

export default function LivePreviewPanel({ code }: LivePreviewPanelProps) {
  const scope = useMemo(
    () => ({
      React,
      useState,
      useEffect,
      useRef,
      useMemo,
      useCallback,
    }),
    [],
  );

  return (
    <LiveProvider code={code} scope={scope} noInline>
      <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-white">
        <LivePreview className="flex flex-1 items-center justify-center p-8 [&>*]:w-full" />
        <LiveError className="border-t border-red-200 bg-red-50 px-4 py-3 font-mono text-xs text-red-700" />
      </div>
    </LiveProvider>
  );
}
