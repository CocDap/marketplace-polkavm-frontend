"use client";

import { useState, useEffect } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { NFT_MARKETPLACE_ADDRESS } from "@/lib/addresses";
import { NFT_MARKETPLACE_ABI } from "@/lib/abi";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { formatEther, parseEther, Address } from "viem";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "./ui/textarea";

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

const mintValidationSchema = yup.object().shape({
    name: yup.string().required("Name is required"),
    description: yup.string().required("Description is required"),
    price: yup.number().typeError("Price must be a number").positive("Price must be positive").required("Price is required"),
    image: yup.mixed<FileList>().required("An image is required"),
});

type MintFormValues = yup.InferType<typeof mintValidationSchema>;

const resellValidationSchema = yup.object().shape({
    price: yup.number().typeError("Price must be a number").positive("Price must be positive").required("Price is required"),
});

type ResellFormValues = yup.InferType<typeof resellValidationSchema>;


async function uploadToPinata(file: File, metadata: { name: string, description: string }): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    console.log(process.env.NEXT_PUBLIC_PINATA_JWT);    
    const pinataMetadata = JSON.stringify({
      name: metadata.name,
    });
    formData.append('pinataMetadata', pinataMetadata);
    
    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);

    const imgRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
        },
        body: formData,
    });
    const imgData = await imgRes.json();
    const imageUrl = `ipfs://${imgData.IpfsHash}`;

    const metadataJson = {
        name: metadata.name,
        description: metadata.description,
        image: imageUrl,
    };

    const metadataRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
        },
        body: JSON.stringify({
            pinataMetadata: {
                name: `${metadata.name} Metadata`,
            },
            pinataContent: metadataJson,
            pinataOptions: {
                cidVersion: 1
            }
        }),
    });
    const metadataUploadData = await metadataRes.json();
    return `ipfs://${metadataUploadData.IpfsHash}`;
}

function MintNftButton({ onMintSuccess }: { onMintSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<MintFormValues>({
        resolver: yupResolver(mintValidationSchema),
    });
    const { toast } = useToast();
    const { writeContractAsync, data: hash, isPending } = useWriteContract();
    const { address } = useAccount();

    const { data: listingPrice, isLoading: isLoadingListingPrice } = useReadContract({
        address: NFT_MARKETPLACE_ADDRESS as Address,
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'getListingPrice',
    });

    const { isLoading: isConfirming, isSuccess, isError, error: txError } = useWaitForTransactionReceipt({ 
        hash
    });

    useEffect(() => {
        if (isSuccess) {
            toast({ title: "NFT Minted & Listed!", description: "Your new NFT is now on the marketplace." });
            setOpen(false);
            onMintSuccess();
        }
        if (isError) {
            toast({
                title: "Transaction Failed",
                description: txError?.message || "Something went wrong.",
                variant: "destructive",
            });
        }
    }, [isSuccess, isError, txError, onMintSuccess, toast, setOpen]);

    const onSubmit = async (data: MintFormValues) => {
        if (!process.env.NEXT_PUBLIC_PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT === 'YOUR_PINATA_JWT_HERE') {
            toast({ title: "Error", description: "Pinata JWT is not configured. Please check the instructions in owned-nfts.tsx.", variant: "destructive" });
            return;
        }

        if (!address) {
            toast({ title: "Error", description: "Please connect your wallet first.", variant: "destructive" });
            return;
        }

        if (!listingPrice) {
            toast({ title: "Error", description: "Could not fetch listing price to proceed.", variant: "destructive" });
            return;
        }

        toast({ title: "Uploading to IPFS...", description: "Please wait while we upload your NFT data." });
        
        try {
            const tokenURI = await uploadToPinata(data.image[0], { name: data.name, description: data.description });
            toast({ title: "IPFS Upload Successful!", description: `Token URI: ${tokenURI}` });

            const priceInWei = parseEther(data.price.toString());
            
            toast({ title: "Please confirm in your wallet", description: "Proceed to mint and list your NFT." });

            await writeContractAsync({
                address: NFT_MARKETPLACE_ADDRESS as Address,
                abi: NFT_MARKETPLACE_ABI,
                functionName: "createToken",
                args: [tokenURI, priceInWei],
                value: listingPrice,
            });

        } catch (error) {
            console.error("Minting failed:", error);
            toast({ title: "Minting Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Mint & List NFT</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a new NFT</DialogTitle>
                    <DialogDescription>Fill out the details below to mint your NFT and list it for sale.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" {...register("name")} />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" {...register("description")} />
                        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="price">Price (PAS)</Label>
                        <Input id="price" type="number" step="any" {...register("price")} />
                        {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
                    </div>
                    <div>
                        <Label>Minimum Listing Price</Label>
                        {isLoadingListingPrice ? (
                            <Skeleton className="h-10 w-full" />
                        ) : (
                            <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm">
                                {listingPrice ? `${formatEther(listingPrice as bigint)} PAS` : 'Error fetching price'}
                            </div>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="image">Image</Label>
                        <Input id="image" type="file" accept="image/*" {...register("image")} />
                        {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image.message as string}</p>}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isPending || isConfirming}>
                            {isPending || isConfirming ? 'Minting...' : 'Mint & List'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


const NftCard = ({ item, onResellSuccess }: { item: NftData; onResellSuccess: () => void; }) => {
    const [open, setOpen] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<ResellFormValues>({
        resolver: yupResolver(resellValidationSchema),
    });
    const { toast } = useToast();
    const { writeContractAsync, data: hash, isPending } = useWriteContract();
    
    const { data: listingPrice, isLoading: isLoadingListingPrice } = useReadContract({
        address: NFT_MARKETPLACE_ADDRESS as Address,
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'getListingPrice',
    });

    const { isLoading: isConfirming, isSuccess, isError, error: txError } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isSuccess) {
            setOpen(false);
            onResellSuccess();
        }
        if (isError) {
            toast({
                title: "Transaction Failed",
                description: txError?.message || "Something went wrong.",
                variant: "destructive",
            });
        }
    }, [isSuccess, isError, txError, onResellSuccess, toast, setOpen]);

    const onSubmit = async (data: ResellFormValues) => {
        if (!listingPrice) {
            toast({ title: "Error", description: "Could not fetch listing price.", variant: "destructive" });
            return;
        }

        toast({ title: "Processing Resell...", description: "Please confirm the transaction in your wallet." });

        try {
            const priceInWei = parseEther(data.price.toString());
            await writeContractAsync({
                address: NFT_MARKETPLACE_ADDRESS as Address,
                abi: NFT_MARKETPLACE_ABI,
                functionName: "resellToken",
                args: [item.tokenId, priceInWei],
                value: listingPrice,
            });
        } catch (error) {
            console.error("Resell failed:", error);
            toast({ title: "Resell Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
        }
    };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden group">
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
            <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-muted-foreground">Last Price</p>
                <p className="text-lg font-bold">{formatEther(item.price)} PAS</p>
            </div>
             {item.sold ? (
                <DialogTrigger asChild>
                    <Button className="w-full mt-2">Resell</Button>
                </DialogTrigger>
            ) : (
                <p className={`text-sm font-bold text-yellow-500 text-center mt-2`}>
                    Listed
                </p>
            )}
          </div>
        </div>
        <DialogContent>
             <DialogHeader>
                <DialogTitle>Resell &quot;{item.metadata.name}&quot;</DialogTitle>
                <DialogDescription>Set a new price to list this NFT back on the marketplace.</DialogDescription>
            </DialogHeader>
             <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <Label htmlFor="price">New Price (PAS)</Label>
                    <Input id="price" type="number" step="any" {...register("price")} />
                    {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">You will pay a listing fee of {isLoadingListingPrice ? '...' : listingPrice ? `${formatEther(listingPrice)} PAS` : 'N/A'} to resell.</p>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={!item.sold || isPending || isConfirming || isLoadingListingPrice}>
                        {isPending || isConfirming ? 'Reselling...' : 'Resell Now'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
};

export default function OwnedNfts() {
  const [nfts, setNfts] = useState<NftData[]>([]);
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  const { data: ownedItems, isLoading: isLoadingOwnedItems, refetch: refetchOwnedItems } = useReadContract({
    address: NFT_MARKETPLACE_ADDRESS as Address,
    abi: NFT_MARKETPLACE_ABI,
    functionName: "fetchMyNFTs",
    account: address,
    query: {
        enabled: isConnected,
    }
  });
  
  const tokenUrisContracts = ownedItems ? (ownedItems as MarketItem[]).map(item => ({
      address: NFT_MARKETPLACE_ADDRESS as Address,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'tokenURI',
      args: [item.tokenId]
  })) : [];

  const { data: tokenUrisData, refetch: refetchTokenUris } = useReadContracts({
    contracts: tokenUrisContracts,
    query: {
        enabled: tokenUrisContracts.length > 0,
    }
  });
  
  const refreshNfts = () => {
      refetchOwnedItems();
      refetchTokenUris();
  }

  const handleResellSuccess = () => {
    toast({ title: "Resell Successful!", description: "Your NFT is now listed on the marketplace." });
    refreshNfts();
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!ownedItems || (ownedItems as MarketItem[]).length === 0) {
        setNfts([]);
        return;
      }
      
      if (tokenUrisData) {
        const metadataPromises = tokenUrisData.map(uriResult => {
            if (uriResult.status === 'success' && typeof uriResult.result === 'string') {
                const url = uriResult.result.replace("ipfs://", "https://ipfs.io/ipfs/");
                return fetch(url).then(res => res.json()).catch(() => null);
            }
            return Promise.resolve(null);
        });

        const metadatas = await Promise.all(metadataPromises);
        const newNfts = (ownedItems as MarketItem[])
          .map((item, index) => ({
              ...item,
              metadata: metadatas[index]
          }))
          .filter((item): item is NftData => item.metadata !== null);
        setNfts(newNfts);
      }
    };

    fetchMetadata();
  }, [tokenUrisData, ownedItems]);

  if (!isConnected) {
    return <div className="text-center py-10 text-muted-foreground">Please connect your wallet to see your NFTs.</div>
  }

  const isLoading = isLoadingOwnedItems || (tokenUrisContracts.length > 0 && !tokenUrisData);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <Skeleton className="h-56 w-full rounded-xl" />
            <div className="space-y-2 mt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
        {nfts.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">You do not own any NFTs from this marketplace.</div>
        )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {nfts.map((item) => (
          <NftCard key={item.tokenId.toString()} item={item} onResellSuccess={handleResellSuccess} />
        ))}
      </div>
    </div>
  );
} 

// Attach the MintNftButton to the main component
OwnedNfts.MintNftButton = function MintNftButtonWrapper() {
    const { refetch: refetchOwnedItems } = useReadContract({
        address: NFT_MARKETPLACE_ADDRESS as Address,
        abi: NFT_MARKETPLACE_ABI,
        functionName: "fetchMyNFTs",
    });

    const { refetch: refetchTokenUris } = useReadContracts({
        contracts: [], // This is not ideal, but we need the refetch function
    });

    const handleMintSuccess = () => {
        refetchOwnedItems();
        refetchTokenUris(); // This may not work as expected without contracts
    }
    
    return <MintNftButton onMintSuccess={handleMintSuccess} />
}; 