"use client";

import { useState, useEffect } from "react";
import '@rainbow-me/rainbowkit/styles.css';
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Copy, Check, KeyRound, Ban, ExternalLink, LogOut, ChevronDown, LayoutGrid } from 'lucide-react';
import { Address } from 'viem';
import { createSigpassWallet, getSigpassWallet, checkSigpassWallet, checkBrowserWebAuthnSupport } from "@/lib/sigpass";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, createConfig, http, useConfig, useDisconnect } from 'wagmi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import Image from 'next/image';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { paseoAssetHub } from '@/app/providers';
import Link from 'next/link';
import { Separator } from "@/components/ui/separator";

// Set the string key and the initial value
export const addressAtom = atomWithStorage<Address | undefined>('SIGPASS_ADDRESS', undefined)

// create a local config for the wallet
const localConfig = createConfig({
  chains: [paseoAssetHub],
  transports: {
    [paseoAssetHub.id]: http(),
  },
  ssr: true,
});

export default function SigpassKit() {
  const [wallet, setWallet] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [webAuthnSupport, setWebAuthnSupport] = useState<boolean>(false);
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const account = useAccount();
  const [address, setAddress] = useAtom(addressAtom);
  const [isCopied, setIsCopied] = useState(false);
  const config = useConfig();
  const { disconnect: wagmiDisconnect } = useDisconnect({
    mutation: {
      onSuccess() {
        setOpen(false);
      },
    },
  });
  const { data: balance } = useBalance({
    address: address,
    chainId: paseoAssetHub.id,
    config: address ? localConfig : config,
  });

  // check if the wallet is already created
  useEffect(() => {
    async function fetchWalletStatus() {
      const status = await checkSigpassWallet();
      setWallet(status);
    }
    fetchWalletStatus();
  }, []);

  // check if the browser supports WebAuthn
  useEffect(() => {
    const support = checkBrowserWebAuthnSupport();
    setWebAuthnSupport(support);
  }, []);

  // get the wallet
  async function getWallet() {
    const account = await getSigpassWallet();
    if (account) {
      setAddress(account.address);
    } else {
      console.error('Issue getting wallet');
    }
  }

  // create a wallet
  async function createWallet() {
    const account = await createSigpassWallet("dapp");
    if (account) {
      setOpen(false);
      setWallet(true);
    }
  }

  // truncate address to 6 characters and add ... at the end
  function truncateAddress(address: Address, length: number = 4) {
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }

  // copy the address to the clipboard
  function copyAddress() {
    if (address) {
      navigator.clipboard.writeText(address ? address : "");
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 1000);
    }
  }


  const DisconnectedView = ({isDesktop}: {isDesktop: boolean}) => {
    const CreateWalletDialog = (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl font-bold text-md hover:scale-105 transition-transform">Create Wallet</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Wallet</DialogTitle>
                <DialogDescription>
                  Instantly get a wallet with <a href="https://www.yubico.com/resources/glossary/what-is-a-passkey/" className="inline-flex items-center gap-1 font-bold underline underline-offset-2" target="_blank" rel="noopener noreferrer">Passkey<ExternalLink className="h-4 w-4" /></a>
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-row gap-8">
                <div className="flex flex-col gap-4">
                  <h2 className="font-bold">What is a Wallet?</h2>
                  <div className="flex flex-row gap-4 items-center">
                    <Image 
                      src="/rainbowkit-1.svg" 
                      alt="icon-1" 
                      width={50}
                      height={50}
                    />
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-bold">A Home for your Digital Assets</h3>
                      <p className="text-sm text-muted-foreground">Wallets are used to send, receive, store, and display digital assets like Polkadot and NFTs.</p>
                    </div>
                  </div>
                  <div className="flex flex-row gap-4 items-center">
                    <Image 
                      src="/rainbowkit-2.svg" 
                      alt="icon-2" 
                      width={50}
                      height={50}
                    />
                    <div className="flex flex-col gap-2">
                      <h3 className="font-bold">A new way to Log In</h3>
                      <p className="text-sm text-muted-foreground">Instead of creating new accounts and passwords on every website, just connect your wallet.</p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <div className="flex flex-row gap-2 mt-4 justify-between w-full items-center">
                  <a href="https://learn.rainbow.me/understanding-web3?utm_source=rainbowkit&utm_campaign=learnmore" className="text-md font-bold" target="_blank" rel="noopener noreferrer">Learn more</a> 
                  {
                  webAuthnSupport ? (
                    <Button 
                      className="rounded-xl font-bold text-md hover:scale-105 transition-transform" 
                      onClick={createWallet} // add a name to the wallet, can be your dapp name or user input
                    >
                      <KeyRound />
                      Create
                    </Button>
                  ) : (
                    <Button disabled className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                      <Ban />
                      Unsupported Browser
                    </Button>
                  )
                }
                </div>
              </DialogFooter>
              <div className="text-sm text-muted-foreground">
                Powered by <a href="https://github.com/gmgn-app/sigpass" className="inline-flex items-center gap-1 font-bold underline underline-offset-4"  target="_blank" rel="noopener noreferrer">Sigpass<ExternalLink className="h-4 w-4" /></a>
              </div>
            </DialogContent>
          </Dialog>
    );

    const CreateWalletDrawer = (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button className="rounded-xl font-bold text-md hover:scale-105 transition-transform">Create Wallet</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Create Wallet</DrawerTitle>
              <DrawerDescription>
                Instantly get a wallet with <a href="https://www.yubico.com/resources/glossary/what-is-a-passkey/" className="inline-flex items-center gap-1 font-bold underline underline-offset-2" target="_blank" rel="noopener noreferrer">Passkey<ExternalLink className="h-4 w-4" /></a>
              </DrawerDescription>
            </DrawerHeader>
                <div className="px-4">
                    <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <h2 className="font-bold">What is a Wallet?</h2>
                <div className="flex flex-row gap-4 items-center">
                  <Image 
                    src="/rainbowkit-1.svg" 
                    alt="icon-1" 
                    width={50}
                    height={50}
                  />
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold">A Home for your Digital Assets</h3>
                    <p className="text-sm text-muted-foreground">Wallets are used to send, receive, store, and display digital assets like Polkadot and NFTs.</p>
                  </div>
                </div>
                <div className="flex flex-row gap-4 items-center">
                  <Image 
                    src="/rainbowkit-2.svg" 
                    alt="icon-2" 
                    width={50}
                    height={50}
                  />
                  <div className="flex flex-col gap-2">
                    <h3 className="font-bold">A new way to Log In</h3>
                    <p className="text-sm text-muted-foreground">Instead of creating new accounts and passwords on every website, just connect your wallet.</p>
                  </div>
                </div>
                        </div>
              </div>
            </div>
            <DrawerFooter>
                    <div className="flex flex-row gap-2 mt-4 justify-between w-full items-center">
                    <a href="https://learn.rainbow.me/understanding-web3?utm_source=rainbowkit&utm_campaign=learnmore" className="text-md font-bold" target="_blank" rel="noopener noreferrer">Learn more</a> 
              {webAuthnSupport ? (
                  <Button 
                    className="rounded-xl font-bold text-md hover:scale-105 transition-transform" 
                        onClick={createWallet} // add a name to the wallet, can be your dapp name or user input
                  >
                    <KeyRound />
                    Create
                  </Button>
                ) : (
                  <Button disabled className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                    <Ban />
                    Unsupported Browser
                  </Button>
                    )
                    }
                    </div>
              <div className="text-sm text-muted-foreground">
                    Powered by <a href="https://github.com/gmgn-app/sigpass" className="inline-flex items-center gap-1 font-bold underline underline-offset-4"  target="_blank" rel="noopener noreferrer">Sigpass<ExternalLink className="h-4 w-4" /></a>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
    )

    return (
        <div className="flex flex-row gap-2 items-center">
             <ConnectButton.Custom>
                {({ openConnectModal, mounted }) => {
                    const ready = mounted;
                    return (
                        <div {...(!ready && {'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' }})}>
                            <Button onClick={openConnectModal} className="rounded-xl font-bold text-md hover:scale-105 transition-transform">Connect Wallet</Button>
                        </div>
                    );
                }}
            </ConnectButton.Custom>
            {isDesktop ? CreateWalletDialog : CreateWalletDrawer}
        </div>
    )
  }
  
  const SigpassWalletView = () => {
    const SigpassDialog = (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                <div className="flex flex-row gap-2 items-center">
                  <KeyRound />
                  <p>{truncateAddress(address!)}</p>
                  <ChevronDown />
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-fit">
              <div className="flex flex-col gap-4 p-4 items-center text-center">
                <div className="flex flex-row gap-2 items-center">
                  <h2 className="text-3xl font-bold">{truncateAddress(address!)}</h2>
                  <Button variant="outline" className="rounded-xl p-2 border-red-500 border-2" size="sm" onClick={copyAddress}>
                    {isCopied ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
                  </Button>
                </div>
                <p className="text-xl font-bold">
                  {balance?.formatted ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : '0 PAS'}
                </p>
                <Separator className="my-2" />
                <div className="w-full flex flex-col items-start gap-2">
                  <Link href="/my-nfts" className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-muted font-semibold">
                    <LayoutGrid className="h-5 w-5" />
                    Owned NFTs
                  </Link>
                  <Button 
                      variant="ghost"
                      className="w-full justify-start p-2 font-semibold"
                      onClick={() => wagmiDisconnect()}
                  >
                      <LogOut className="h-5 w-5 mr-2" />
                      Disconnect
                  </Button>
                </div>
              </div>
            </DialogContent>
        </Dialog>
    );

    const SigpassDrawer = (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Button className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                    <div className="flex flex-row gap-2 items-center">
                        <KeyRound />
                        <p>{truncateAddress(address!)}</p>
                        <ChevronDown />
                    </div>
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <div className="p-4 flex flex-col items-center text-center gap-4">
                    <div className="flex flex-row gap-2 items-center">
                      <h2 className="text-3xl font-bold">{truncateAddress(address!)}</h2>
                      <Button variant="outline" className="rounded-xl p-2 border-red-500 border-2" size="sm" onClick={copyAddress}>
                          {isCopied ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
                      </Button>
                    </div>
                    <p className="text-xl font-bold">
                        {balance?.formatted ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : '0 PAS'}
                    </p>
                    <Separator className="my-2" />
                    <div className="w-full flex flex-col items-start gap-2">
                        <Link href="/my-nfts" className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-muted font-semibold">
                            <LayoutGrid className="h-5 w-5" />
                            Owned NFTs
                        </Link>
                        <Button 
                            variant="ghost"
                            className="w-full justify-start p-2 font-semibold"
                            onClick={() => wagmiDisconnect()}
                        >
                            <LogOut className="h-5 w-5 mr-2" />
                            Disconnect
                        </Button>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    )

    if (wallet && address === undefined) {
        return (
        <Button 
          className="rounded-xl font-bold text-md hover:scale-105 transition-transform"
          onClick={getWallet}
        >
          Get Wallet
        </Button>
        )
    }

    return isDesktop ? SigpassDialog : SigpassDrawer;
  }

  const RainbowKitView = () => {
    const RainbowKitDialog = (
        <ConnectButton.Custom>
        {({
          account,
          chain,
          openChainModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return null;
                }
                if (chain.unsupported) {
                  return (
                    <Button onClick={openChainModal} variant="destructive" className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                      Wrong network
                    </Button>
                  );
                }

                return (
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                        <div className="flex flex-row gap-2 items-center">
                          {chain.hasIcon && (
                            <div
                              style={{
                                background: chain.iconBackground,
                                borderRadius: 999,
                                overflow: 'hidden',
                                marginRight: 4,
                              }}
                            >
                              {chain.iconUrl && (
                                <Image
                                  alt={chain.name ?? 'Chain icon'}
                                  src={chain.iconUrl}
                                  width={24}
                                  height={24}
                                />
                              )}
                            </div>
                          )}
                          <p>{account!.displayName}</p>
              <ChevronDown />
                        </div>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-fit">
                      <div className="flex flex-col gap-4 p-4 items-center text-center">
                        <div className="flex flex-row gap-2 items-center">
                          <h2 className="text-3xl font-bold">{account!.displayName}</h2>
                          <Button variant="outline" className="rounded-xl p-2 border-red-500 border-2" size="sm" onClick={() => {
                            navigator.clipboard.writeText(account!.address);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 1000);
                          }}>
                            {isCopied ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
            </Button>
                        </div>
                        <p className="text-xl font-bold">
                          {account!.displayBalance
                            ? ` ${account!.displayBalance}`
                            : ''}
                        </p>
                        <Separator className="my-2" />
                        <div className="w-full flex flex-col items-start gap-2">
                          <Link href="/my-nfts" className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-muted font-semibold">
                            <LayoutGrid className="h-5 w-5" />
                            Owned NFTs
                          </Link>
                          <Button 
                              variant="ghost"
                              className="w-full justify-start p-2 font-semibold"
                              onClick={() => wagmiDisconnect()}
                          >
                              <LogOut className="h-5 w-5 mr-2" />
                              Disconnect
                  </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                );
              })()}
              </div>
          );
        }}
      </ConnectButton.Custom>
    )

    const RainbowKitDrawer = (
        <ConnectButton.Custom>
            {({
            account,
            chain,
            openChainModal,
            mounted,
            }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            return (
                <div
                {...(!ready && {
                    'aria-hidden': true,
                    style: {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                    },
                })}
                >
                {(() => {
                    if (!connected) {
                      return null;
                    }
                    if (chain.unsupported) {
                    return (
                        <Button onClick={openChainModal} variant="destructive" className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                        Wrong network
                        </Button>
                    );
                    }

                    return (
                    <Drawer open={open} onOpenChange={setOpen}>
                        <DrawerTrigger asChild>
                        <Button className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                            <div className="flex flex-row gap-2 items-center">
                            {chain.hasIcon && (
                                <div
                                style={{
                                    background: chain.iconBackground,
                                    borderRadius: 999,
                                    overflow: 'hidden',
                                    marginRight: 4,
                                }}
                                >
                                {chain.iconUrl && (
                                    <Image
                                    alt={chain.name ?? 'Chain icon'}
                                    src={chain.iconUrl}
                                    width={24}
                                    height={24}
                                    />
                                )}
              </div>
                            )}
                            <p>{account!.displayName}</p>
                            <ChevronDown />
                            </div>
                        </Button>
                        </DrawerTrigger>
                        <DrawerContent>
                        <div className="p-4 flex flex-col items-center text-center gap-4">
                            <div className="flex flex-row gap-2 items-center">
                            <h2 className="text-3xl font-bold">{account!.displayName}</h2>
                            <Button variant="outline" className="rounded-xl p-2 border-red-500 border-2" size="sm" onClick={() => {
                                    navigator.clipboard.writeText(account!.address);
                                    setIsCopied(true);
                                    setTimeout(() => setIsCopied(false), 1000);
                                }}>
                                {isCopied ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
                </Button>
                            </div>
                            <p className="text-xl font-bold">
                            {account!.displayBalance
                                ? ` ${account!.displayBalance}`
                                : ''}
                            </p>
                            <Separator className="my-2" />
                            <div className="w-full flex flex-col items-start gap-2">
                            <Link href="/my-nfts" className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-muted font-semibold">
                                <LayoutGrid className="h-5 w-5" />
                                Owned NFTs
                            </Link>
                            <Button 
                                variant="ghost"
                                className="w-full justify-start p-2 font-semibold"
                                onClick={() => wagmiDisconnect()}
                            >
                                <LogOut className="h-5 w-5 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
                    );
                })()}
    </div>
            );
            }}
        </ConnectButton.Custom>
    )

    return isDesktop ? RainbowKitDialog : RainbowKitDrawer;
  }

  if (address) {
    return <SigpassWalletView />
  }

  if(account.isConnected) {
    return <RainbowKitView />
  }

  return <DisconnectedView isDesktop={isDesktop} />
}

