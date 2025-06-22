"use client";
import OwnedNfts from "@/components/owned-nfts";

export default function MyNftsPage() {
  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">My NFTs</h1>
        <div className="flex items-center gap-4">
            <OwnedNfts.MintNftButton />
        </div>
      </div>
      <OwnedNfts />
    </>
  );
} 