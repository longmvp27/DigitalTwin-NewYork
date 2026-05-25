"use client"
import dynamic from "next/dynamic";

const Layout = dynamic(
  () => import("../src/components/layout"),
  { ssr: false }
);

export default function Home() {
  return <Layout />;
}
