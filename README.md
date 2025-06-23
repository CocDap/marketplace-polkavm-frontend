# PolkaVM NFT Marketplace

This project is a decentralized NFT marketplace built on the PolkaVM ecosystem. It allows users to connect their wallets, mint new NFTs, buy listed NFTs, and resell NFTs they own.


> **_Migrate to monorepo for tutorial: Build a NFT marketplace on Asset Hub (Fullstack) :_**  https://github.com/openguild-labs/nft-marketplace-polkaVM

## Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later)
*   [npm](https://www.npmjs.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <Marketplace NFT on PolkaVM project>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a file named `.env.local` in the root of your project and add your Pinata JWT for IPFS uploads. This is required for the minting functionality.

    ```
    NEXT_PUBLIC_PINATA_JWT=YOUR_PINATA_JWT_HERE
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3002](http://localhost:3002) with your browser to see the result.

## Core Functions

This section explains the key functionalities of the marketplace and how they are implemented.

### 1. Add Paseo Asset Hub Provider

The application uses RainbowKit to handle multi-wallet connections. In `app/providers.tsx`, we configure the `paseoAssetHub` chain to ensure that all web3 interactions are correctly routed to the PolkaVM testnet.

### 2. Wallet Connection with `SigpassKit`

The `components/sigpasskit.tsx` component is a wrapper around RainbowKit's `ConnectButton`. It manages wallet connection and disconnection states, providing a seamless user experience for authentication and interaction with the blockchain.

### 3. Update Marketplace ABI and Address

To interact with the smart contract, the Application Binary Interface (ABI) and the contract's deployed address must be correctly configured.
*   The Marketplace ABI is located in `lib/abi.ts`.
*   The contract address is stored in `lib/addresses.ts`.

Update these files if you deploy a new version of the smart contract.

### 4. `collections` Component

This component is responsible for displaying all the NFTs currently listed for sale on the marketplace. It uses the `useReadContract` hook from `wagmi` to call the `fetchMarketItems` function on the smart contract.

```typescript
const { data: marketItems, isLoading: isLoadingMarketItems, refetch } = useReadContract({
    address: NFT_MARKETPLACE_ADDRESS as Address,
    abi: NFT_MARKETPLACE_ABI,
    functionName: "fetchMarketItems",
    args: [],
});
```

### 5. Buy an NFT

When a user wants to purchase an NFT, the application calls the `buy` function in the smart contract. This is handled by the `useWriteContract` hook from `wagmi`, passing the `tokenId` and the `price` of the item.

```typescript
await writeContractAsync({
    address: NFT_MARKETPLACE_ADDRESS as Address,
    abi: NFT_MARKETPLACE_ABI,
    functionName: "buy",
    args: [item.tokenId],
    value: item.price,
});
```

### 6. `owned-nfts` Component

This component displays the NFTs currently owned by the connected user. It calls the `fetchMyNFTs` function on the smart contract to retrieve a list of NFTs associated with the user's address.

### 7. Mint and List an NFT

Users can create new NFTs through the application. This is a two-step process:
1.  The image and metadata are first uploaded to IPFS via the Pinata service.
2.  The returned IPFS URI is then passed to the `createToken` function in the smart contract to mint the new NFT and list it on the marketplace.

```typescript
await writeContractAsync({
    address: NFT_MARKETPLACE_ADDRESS as Address,
    abi: NFT_MARKETPLACE_ABI,
    functionName: "createToken",
    args: [tokenURI, priceInWei],
    value: listingPrice,
});
```

### 8. Resell an NFT

If a user owns an NFT that has been sold previously (or they simply want to relist it), they can put it back on the marketplace. This action calls the `resellToken` function, requiring the `tokenId` and a new `price`.

```typescript
await writeContractAsync({
    address: NFT_MARKETPLACE_ADDRESS as Address,
    abi: NFT_MARKETPLACE_ABI,
    functionName: "resellToken",
    args: [item.tokenId, priceInWei],
    value: listingPrice,
});
```
