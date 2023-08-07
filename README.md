# LiteSwap DEX

LiteSwap is a decentralized exchange (Dex) built on the Sepolia Network. With LiteSwap, users have the ability to create token pairs, provide liquidity to the pool, and seamlessly trade tokens with ease.

Visit [here](https://dex-aedeg2ddb-hacklight.vercel.app/) for demo

## Pages

### Page 1 (Home/Swap Page)

- Search Tokens by address
- Handle approval if allowance is less than amount to be swapped
- Swap tokens using UniswapV2 Router

### Page 2 (Liquidity Page)

- Create token pair
- Approve the router to spen tokens
- Create Liquidity

## Run Locally

### Install dependencies:

```shell
yarn install
```

### Deploy contracts:

```shell
yarn deploy --network sepolia
```

### Run frontend:

```shell
yarn start
```

# Acknowledgements

- [ScaffoldETH V2](https://github.com/scaffold-eth/se-2)
