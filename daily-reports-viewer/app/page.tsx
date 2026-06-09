"use client";

import dynamic from "next/dynamic";

const ReportsApp = dynamic(() => import("./ReportsApp"), { ssr: false });

export default function Page() {
  return <ReportsApp />;
}
