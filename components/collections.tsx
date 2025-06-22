"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { NFT_MARKETPLACE_ADDRESS } from "@/lib/addresses";
import { NFT_MARKETPLACE_ABI } from "@/lib/abi";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { formatEther, Address } from "viem";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface MarketItem {
  tokenId: bigint;
  seller: Address;
  owner: Address;
  price: bigint;
  sold: boolean;
}

interface NftMetadata {
  name: string;
  description: string;
  image: string;
}

interface NftData extends MarketItem {
    metadata: NftMetadata;
}


const NftCard = ({ item, onPurchaseSuccess, onPurchaseError }: { item: NftData; onPurchaseSuccess: () => void; onPurchaseError: (error: Error) => void; }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { address } = useAccount();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess, isError, error: txError } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      setOpen(false);
      onPurchaseSuccess();
    }
    if (isError && txError) {
      onPurchaseError(txError);
    }
  }, [isSuccess, isError, txError, onPurchaseSuccess, onPurchaseError, setOpen]);

  const handleBuy = async () => {
    if (!address) {
      toast({ title: "Error", description: "Please connect your wallet first.", variant: "destructive" });
      return;
    }

    toast({ title: "Processing Purchase...", description: "Please confirm the transaction in your wallet." });

    try {
      await writeContractAsync({
        address: NFT_MARKETPLACE_ADDRESS as Address,
        abi: NFT_MARKETPLACE_ABI,
        functionName: "buy",
        args: [item.tokenId],
        value: item.price,
      });
    } catch (error) {
      // This toast handles user wallet rejection
      console.error("Purchase failed:", error);
      toast({ title: "Purchase Canceled", description: "You rejected the transaction in your wallet.", variant: "destructive" });
    }
  };

  const isOwner = item.seller.toLowerCase() === address?.toLowerCase();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden group cursor-pointer">
          <div className="overflow-hidden">
            <Image
              src={item.metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/")}
              alt={item.metadata.name}
              width={300}
              height={300}
              className="object-cover h-56 w-full group-hover:scale-105 transition-transform duration-300"
              priority={false}
            />
          </div>
          <div className="p-4 border-t">
            <h3 className="text-md font-semibold truncate">{item.metadata.name}</h3>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="text-lg font-bold">{formatEther(item.price)} PAS</p>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{item.metadata.name}</DialogTitle>
          <DialogDescription>{item.metadata.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden border">
             <Image
                src={item.metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/")}
                alt={item.metadata.name}
                width={400}
                height={400}
                className="object-cover w-full"
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="text-2xl font-bold">{formatEther(item.price)} PAS</p>
          </div>
           <div>
            <p className="text-sm text-muted-foreground">Seller</p>
            <p className="text-sm font-mono">{item.seller}</p>
          </div>
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
          <Button onClick={handleBuy} disabled={isPending || isConfirming || isOwner}>
            {isPending || isConfirming ? "Buying..." : isOwner ? "Your Listing" : "Buy Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function Collections() {
  const [nfts, setNfts] = useState<NftData[]>([]);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const { toast } = useToast();

  const { data: marketItems, isLoading: isLoadingMarketItems, refetch } = useReadContract({
    address: NFT_MARKETPLACE_ADDRESS as Address,
    abi: NFT_MARKETPLACE_ABI,
    functionName: "fetchMarketItems",
    args: [],
  });

  const listedItems = useMemo(() => 
    marketItems ? (marketItems as MarketItem[]).filter(item => !item.sold) : [],
    [marketItems]
  );

  const tokenUrisContracts = useMemo(() =>
    listedItems.map(item => ({
        address: NFT_MARKETPLACE_ADDRESS as Address,
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'tokenURI',
        args: [item.tokenId]
    })),
    [listedItems]
  );

  const { data: tokenUrisData, isLoading: isLoadingUris } = useReadContracts({
    contracts: tokenUrisContracts,
    query: {
        enabled: listedItems.length > 0,
    }
  });

  const handlePurchaseSuccess = () => {
    toast({ title: "Purchase Successful!", description: "The NFT has been transferred to your wallet." });
    refetch();
  };

  const handlePurchaseError = (error: Error) => {
    toast({
        title: "Transaction Failed",
        description: error.message,
        variant: "destructive",
    });
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!tokenUrisData) {
        if (listedItems.length === 0) {
            setNfts([]);
        }
        return;
      };
      
      setIsFetchingMetadata(true);
      const metadataPromises = tokenUrisData.map(uriResult => {
          if (uriResult.status === 'success' && typeof uriResult.result === 'string') {
              const url = uriResult.result.replace("ipfs://", "https://ipfs.io/ipfs/");
              return fetch(url).then(res => res.json()).catch(() => null);
          }
          return Promise.resolve(null);
      });

      const metadatas = await Promise.all(metadataPromises);
      const newNfts = listedItems
        .map((item, index) => ({
            ...item,
            metadata: metadatas[index]
        }))
        .filter((item): item is NftData => item.metadata !== null);
      setNfts(newNfts);
      setIsFetchingMetadata(false);
    };

    fetchMetadata();
  }, [tokenUrisData, listedItems]);

  const isLoading = isLoadingMarketItems || isLoadingUris || isFetchingMetadata;

  if (isLoading) {
    return (
      <div className="w-full">
        <p className="text-center py-4 text-muted-foreground">Fetching listed NFTs...</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-56 w-full rounded-xl" />
              <div className="space-y-2 mt-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isLoading && nfts.length === 0) {
      return <div className="text-center py-10 text-muted-foreground">No items listed on the marketplace.</div>
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {nfts.map((item) => (
          <NftCard key={item.tokenId.toString()} item={item} onPurchaseSuccess={handlePurchaseSuccess} onPurchaseError={handlePurchaseError} />
        ))}
      </div>
    </div>
  );
} 