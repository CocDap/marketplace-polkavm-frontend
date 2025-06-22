"use client";
import Collections from "@/components/collections";

export default function HomePage() {
  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Collections</h1>
      </div>
      <Collections />
    </>
  );
}
