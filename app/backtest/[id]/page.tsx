
"use client";

import dynamic from "next/dynamic";

const ClientWorkspace = dynamic(() => import("./client-page"), {
  ssr: false,
});

export default function BacktestWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  return <ClientWorkspace params={params} />;
}
