/* eslint-disable @typescript-eslint/no-extra-semi */

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { TokenList } from "./TokenList";
import { Pair, Percent, Route, Token, TokenAmount, Trade, TradeType } from "@uniswap/sdk";
import IUniswapV2Pair from "@uniswap/v2-core/build/IUniswapV2Pair.json";
import { Modal } from "antd";
import { ethers } from "ethers";
import { useDebounce } from "usehooks-ts";
import { Hash } from "viem";
import { erc20ABI, useAccount, useNetwork, usePublicClient, useWalletClient } from "wagmi";
import uniswapRouterABI from "~~/abis/uniswapv2router.json";
import { notification } from "~~/utils/scaffold-eth";

export const SwapComponent = ({ title }: { title: string }) => {
  // states
  const [amountToSwap, setAmountToSwap] = useState<number>(0);
  const [tokenIn, setTokenIn] = useState<{
    name?: string;
    symbol?: string;
    address?: `0x${string}`;
    decimals?: number;
  }>({});
  const [tokenOut, setTokenOut] = useState<{
    name?: string;
    symbol?: string;
    address?: `0x${string}`;
    decimals?: number;
  }>({});
  const [open, setOpen] = useState(false);
  const [confirmLoading] = useState(false);
  const [slippage] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [addressSearchInput, setAddressSearchInput] = useState("");
  const [tokenType, setTokenType] = useState("tokenInput");
  const [tokensArray, setTokensArray] = useState<{ name: string; decimals: number; symbol: string }[]>([
    { name: "ether", decimals: 6, symbol: "ETH" },
  ]);
  const [hash, setHash] = useState<Hash>();
  const [needsApproval, setNeedsApproval] = useState(false);
  const [txType, setTxType] = useState("");
  const [amountToSwapTo, setAmountToSwapTo] = useState(0);

  // constants
  const uniswapRouterAddress = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008";

  // hooks
  const { data: walletClient } = useWalletClient();
  const dAmountToSwap = useDebounce(amountToSwap, 100);
  const { isConnected } = useAccount();
  const provider = usePublicClient();
  const { isLoading: isLoadingSigner } = useWalletClient();
  const { chain } = useNetwork();

  // handler methods
  const showModal = () => {
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const hasUndefinedFields = (obj: any) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === "undefined") {
        return true;
      }
    }
    return false;
  };

  const handleInputChange = () => {
    const token1 = tokenIn;
    const token2 = tokenOut;
    const amountForToken1 = amountToSwap;
    const amountForToken2 = amountToSwapTo;

    setTokenIn(token2);
    setTokenOut(token1);
    setAmountToSwap(amountForToken2);
    setAmountToSwapTo(amountForToken1);
  };

  const handleSwap = async () => {
    const notificationId = notification.loading("Token Swap Initiated");
    try {
      if (isLoadingSigner || !chain?.id) return;

      if (hasUndefinedFields(tokenIn) || hasUndefinedFields(tokenOut)) return;

      if (tokenIn?.symbol == tokenOut.symbol) {
        notification.error("You cannot swap between same token");
        return;
      }

      if (tokenIn.symbol == undefined || tokenIn.address == undefined || tokenIn.decimals == undefined) {
        notification.error("Please select to swap.");
        return;
      }
      if (tokenOut.symbol == undefined || tokenOut.address == undefined || tokenOut.decimals == undefined) {
        notification.error("Please select to swap.");
        return;
      }

      let amountInWei;
      let tokenSendIn, tokenSendOut;

      if (tokenIn?.symbol.toLowerCase() == "eth") {
        tokenSendIn = new Token(chain.id, "0xD0dF82dE051244f04BfF3A8bB1f62E1cD39eED92", 18);
        amountInWei = ethers.parseEther(amountToSwap.toString());
      } else {
        tokenSendIn = new Token(chain.id, tokenIn?.address, Number(tokenIn?.decimals));
        amountInWei = ethers.parseUnits(amountToSwap.toString(), Number(tokenIn?.decimals));
      }

      if (tokenOut?.symbol?.toLowerCase() == "eth") {
        tokenSendOut = new Token(chain.id, "0xD0dF82dE051244f04BfF3A8bB1f62E1cD39eED92", 18);
      } else {
        tokenSendOut = new Token(chain.id, tokenOut?.address, Number(tokenOut?.decimals));
      }

      // this is returning an error
      const pairAddress: any = Pair.getAddress(tokenSendIn, tokenSendOut);
      console.log("pairAddress", pairAddress);
      // const cleanValue = pairAddress.startsWith("0x") ? pairAddress.slice(2) : pairAddress;
      // pairAddress = `0x${cleanValue}`;

      const reserve: any = await provider.readContract({
        address: "0xC6AdB74CE2132561D2B9F28e0ee8605d997bD797",
        abi: IUniswapV2Pair.abi,
        functionName: "getReserves",
      });

      const isSorted = tokenSendIn?.address?.toLowerCase() < tokenSendOut?.address?.toLowerCase();
      const balances = isSorted ? [reserve[0], reserve[1]] : [reserve[1], reserve[0]];
      const pair = new Pair(new TokenAmount(tokenSendIn, balances[0]), new TokenAmount(tokenSendOut, balances[1]));

      const route = new Route([pair], tokenSendIn);

      const trade = new Trade(route, new TokenAmount(tokenSendIn, amountInWei), TradeType.EXACT_INPUT);

      const amountOut = trade.executionPrice.toSignificant(8); // Use .toExact() instead if you want the full amount
      setAmountToSwapTo(Number(amountOut));

      const slippageTolerance = new Percent(slippage.toString(), "100"); // 50 bips (0.50%)

      const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;

      const uniswapRouter = new ethers.Contract(uniswapRouterAddress, uniswapRouterABI, provider.account);

      let swapTx;

      if (tokenSendIn.symbol?.toLowerCase() == "eth") {
        swapTx = await uniswapRouter.swapExactETHForTokens(
          String(amountOutMin),
          [tokenSendIn.address, tokenSendOut.address],
          provider.account,
          Math.floor(Date.now() / 1000) + 1000, // Set a deadline for the transaction
          { value: String(amountInWei) }, // Pass the ETH value along with the transaction
        );
      } else if (tokenSendOut.symbol?.toLowerCase() == "eth") {
        swapTx = await uniswapRouter.swapExactTokensForETH(
          String(amountInWei),
          String(amountOutMin),
          [tokenIn.address, tokenIn.address, tokenOut.address],
          provider.account,
          Math.floor(Date.now() / 1000) + 1000, // Set a deadline for the transaction
        );
      } else {
        swapTx = await walletClient?.writeContract({
          address: "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008",
          chain: walletClient.chain,
          abi: uniswapRouterABI,
          functionName: "swapExactTokensForTokens",
          account: walletClient.account.address,
          args: [
            String(amountInWei),
            amountOutMin,
            [tokenSendIn.address, tokenSendOut.address],
            walletClient.account.address,
            Math.floor(Date.now() / 1000) + 1000,
          ],
        });
      }

      setHash(swapTx);
      setTxType("swap");

      notification.remove(notificationId);
      notification.info("Transaction sent - wait for transaction to be mined");
    } catch (error) {
      notification.error("Sorry,  an error occoured");
      console.log(error);
      notification.remove(notificationId);
    }
  };

  const handleApproval = async () => {
    if (chain == undefined) {
      notification.error("ChainId not available");
    }

    const hash = await walletClient?.writeContract({
      address: tokenIn.address || `0xD0dF82dE051244f04BfF3A8bB1f62E1cD39eED92`,
      chain: walletClient.chain,
      abi: erc20ABI,
      functionName: "approve",
      args: [uniswapRouterAddress, ethers.parseUnits(amountToSwap.toString(), tokenIn?.decimals)],
    });

    notification.info("Transaction is been proccessed");
    setHash(hash);
    setTxType("approve");
  };

  const handleTokenSelect = async (index: number) => {
    try {
      const selectedToken = tokensArray[index];

      if (tokenType == "tokenInput") {
        setTokenIn(selectedToken);
      }

      if (tokenType == "tokenOutput") {
        setTokenOut(selectedToken);
      }

      setOpen(false);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSearchToken = async (address: `0x${string}`) => {
    if (address.slice(2).length === 0) return;

    const notificationId = notification.loading("Loading Address Details");
    try {
      const name = await provider.readContract({ address, abi: erc20ABI, functionName: "name" });
      const decimals = await provider.readContract({ address, abi: erc20ABI, functionName: "decimals" });
      const symbol = await provider.readContract({ address, abi: erc20ABI, functionName: "symbol" });

      const tokens: { name: string; decimals: number; symbol: string; address?: string }[] = [
        { name: "ether", decimals: 6, symbol: "ETH" },
        { name, decimals, symbol, address },
      ];

      setTokensArray(tokens);
    } catch (error) {
      notification.error("Could not find token");
      const tokens: { name: string; decimals: number; symbol: string }[] = [
        { name: "ether", decimals: 6, symbol: "Eth" },
      ];

      setTokensArray(tokens);

      console.log(error);
    }
    notification.remove(notificationId);
  };

  const handleAllowanceCheck = async () => {
    if (!tokenIn.address || !isReady) return;
    if (walletClient?.account.address == undefined) {
      notification.error("Wallet account not found");
      return;
    }
    const allowance: any = await provider.readContract({
      address: tokenIn.address || "0xD0dF82dE051244f04BfF3A8bB1f62E1cD39eED92",
      abi: erc20ABI,
      functionName: "allowance",
      args: [walletClient?.account.address, uniswapRouterAddress],
    });

    await provider.readContract({
      address: tokenIn.address || "0xD0dF82dE051244f04BfF3A8bB1f62E1cD39eED92",
      abi: erc20ABI,
      functionName: "balanceOf",
      args: [walletClient?.account.address],
    });

    if (allowance < ethers.parseUnits(amountToSwap.toString(), tokenIn?.decimals)) {
      setNeedsApproval(true);
    } else {
      setNeedsApproval(false);
    }
  };

  // useEffects
  useEffect(() => {
    if (isConnected) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [isConnected]);

  useEffect(() => {
    (async () => {
      if (hash) {
        const receipt = await provider.waitForTransactionReceipt({ hash });
        if (receipt.status == "success") {
          notification.success("Transaction Successful");
        } else {
          notification.error("Transaction failed");
        }

        if (txType == "approve") {
          handleAllowanceCheck();
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  useEffect(() => {
    handleAllowanceCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dAmountToSwap]);

  // template
  return (
    <>
      <div className="sc-11ce2lf-0 hZuQqb">
        <main className="sc-11ce2lf-1 bHgovE" id="swap-page">
          <div
            className="sc-bczRLJ sc-nrd8cx-0 sc-nrd8cx-1 sc-jhay2b-0 hJYFVB fhPvJh frnZMK gmElZa"
            style={{ marginBottom: "25px" }}
          >
            <div className="sc-bczRLJ sc-nrd8cx-0 sc-nrd8cx-4 sc-jhay2b-1 hJYFVB fhPvJh leSroW ffkRBX">
              <div className="sc-sx9n2y-0 EngNh css-rjqmed">{title}</div>
            </div>
          </div>
          <div>
            <div className="sc-1es900k-1 hfTphi">
              <div id="swap-currency-input" className="sc-3zewi2-0 kNzjEC">
                <div className="sc-3zewi2-2 kbjgwk">
                  <div className="sc-3zewi2-4 eiTjnJ">
                    <input
                      className="sc-1x3stf0-0 jLlucA sc-3zewi2-11 diLZKF token-amount-input"
                      inputMode="decimal"
                      autoComplete="off"
                      autoCorrect="off"
                      type="number"
                      step="0.001"
                      pattern="^[0-9]*[.,]?[0-9]*$"
                      placeholder="0"
                      min={0}
                      onChange={e => {
                        setAmountToSwap(Number(e.target.value));
                      }}
                      value={amountToSwap}
                    />
                    <div>
                      <button
                        data-custom-type="tokenInput"
                        onClick={e => {
                          const type = e.currentTarget.getAttribute("data-custom-type");
                          setTokenType(type || "tokenInput");
                          showModal();
                        }}
                        className="sc-bczRLJ lfsInV sc-fwrjc2-1 sc-fwrjc2-5 sc-3zewi2-3 bYPKDz kDGCpp fNfqQo open-currency-select-button"
                      >
                        <span className="sc-3zewi2-7 dBwdwc">
                          <div className="sc-bczRLJ sc-nrd8cx-0 sc-nrd8cx-4 hJYFVB fhPvJh leSroW">
                            <span className="sc-3zewi2-9 jGgNbm token-symbol-container">
                              {tokenIn?.symbol?.toUpperCase() || "Select Token"}
                            </span>
                          </div>
                          <svg
                            width="12"
                            height="7"
                            viewBox="0 0 12 7"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="sc-3zewi2-8 cnYyzy"
                          >
                            <path d="M0.97168 1L6.20532 6L11.439 1" stroke="#AEAEAE"></path>
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="sc-3zewi2-5 sc-3zewi2-6 irOuwP eTfjeW">
                    <div className="sc-bczRLJ sc-nrd8cx-0 sc-nrd8cx-1 hJYFVB fhPvJh frnZMK">
                      <div className="sc-u7b06n-1 eaouLI"></div>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="sc-11ce2lf-9 hwmMIb">
              <div
                onClick={handleInputChange}
                data-testid="swap-currency-button"
                color="#FFFFFF"
                className="sc-1es900k-0 jhKFEw"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5D6785"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
              </div>
            </div>
          </div>
          <div className="sc-1kykgp9-2 hinWpT">
            <div>
              <div className="sc-1es900k-1 sc-1es900k-2 hfTphi hVtqDn">
                <div id="swap-currency-output" className="sc-3zewi2-0 kNzjEC">
                  <div className="sc-3zewi2-2 kbjgwk">
                    <div className="sc-3zewi2-4 eiTjnJ">
                      <input
                        className="sc-1x3stf0-0 jLlucA sc-3zewi2-11 diLZKF token-amount-input"
                        inputMode="decimal"
                        autoComplete="off"
                        autoCorrect="off"
                        type="text"
                        pattern="^[0-9]*[.,]?[0-9]*$"
                        placeholder="0"
                        spellCheck="false"
                        value={amountToSwapTo}
                        disabled={true}
                        // eslint-disable-next-line @typescript-eslint/no-empty-function
                        onChange={() => {}}
                      />
                      <div>
                        <button
                          data-custom-type="tokenOutput"
                          onClick={e => {
                            const type = e.currentTarget.getAttribute("data-custom-type");
                            setTokenType(type || "tokenOutput");
                            showModal();
                          }}
                          className="sc-bczRLJ lfsInV sc-fwrjc2-1 sc-fwrjc2-5 sc-3zewi2-3 bYPKDz kDGCpp cldnjs open-currency-select-button"
                        >
                          <span className="sc-3zewi2-7 dBwdwc">
                            <div className="sc-bczRLJ sc-nrd8cx-0 sc-nrd8cx-4 hJYFVB fhPvJh leSroW">
                              <span className="sc-3zewi2-9 jGgNbm token-symbol-container">
                                {tokenOut?.symbol?.toUpperCase() || "Select Token"}
                              </span>
                            </div>
                            <svg
                              width="12"
                              height="7"
                              viewBox="0 0 12 7"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="sc-3zewi2-8 cnYyzy"
                            >
                              <path d="M0.97168 1L6.20532 6L11.439 1" stroke="#AEAEAE"></path>
                            </svg>
                          </span>
                        </button>
                      </div>
                    </div>
                    <div className="sc-3zewi2-5 sc-3zewi2-6 irOuwP eTfjeW">
                      <div className="sc-bczRLJ sc-nrd8cx-0 sc-nrd8cx-1 hJYFVB fhPvJh frnZMK">
                        <div className="sc-u7b06n-1 eaouLI"></div>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              {needsApproval ? (
                <button
                  onClick={handleApproval}
                  style={{ fontWeight: 600 }}
                  className="sc-bczRLJ lhSHM sc-fwrjc2-1 sc-fwrjc2-4 bYPKDz lhnceG"
                >
                  <div className="sc-fwrjc2-0 iBwqId"></div>
                  {!isReady ? "Connect Wallet" : "Approve"}
                </button>
              ) : (
                <button
                  onClick={handleSwap}
                  style={{ fontWeight: 600 }}
                  className="sc-bczRLJ lhSHM sc-fwrjc2-1 sc-fwrjc2-4 bYPKDz lhnceG"
                >
                  <div className="sc-fwrjc2-0 iBwqId"></div>
                  {!isReady ? "Connect Wallet" : "Swap"}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      <Modal footer={null} title="Select a token" open={open} confirmLoading={confirmLoading} onCancel={handleCancel}>
        <div className="sc-1kykgp9-0 sc-1it7zu4-0 iCxowP etInfo">
          <div className="sc-1kykgp9-2 sc-1xp9ndq-0 kqzAOQ eOCLUf">
            <div className="sc-bczRLJ sc-nrd8cx-0 hJYFVB fhPvJh">
              <input
                type="text"
                id="token-search-input"
                data-testid="token-search-input"
                placeholder="Paste token address"
                autoComplete="off"
                className="sc-1xp9ndq-2 jkLNrG"
                onChange={e => {
                  setAddressSearchInput(e.target.value);
                  const cleanValue = e.target.value.startsWith("0x") ? e.target.value.slice(2) : e.target.value;

                  // Add the "0x" prefix to the cleanValue
                  const convertedValue: `0x${string}` = `0x${cleanValue}`;
                  handleSearchToken(convertedValue);
                }}
                value={addressSearchInput}
              />
            </div>{" "}
          </div>
          <div className="sc-1xp9ndq-3 UlyBT"></div>
          <div style={{ flex: "1 1 0%", position: "relative" }}>
            <div style={{ overflow: "visible", height: "0px" }}>
              <div data-testid="currency-list-wrapper" className="sc-1e2o00j-5 kszyds">
                <div
                  className="_1pi21y70"
                  style={{
                    position: "relative",
                    height: "425px",
                    width: "100%",
                    overflow: "auto",
                    willChange: "transform",
                    direction: "ltr",
                  }}
                >
                  <div style={{ width: "100%" }}>
                    {/* run a data map here */}
                    {tokensArray.map((t, index) => (
                      <TokenList
                        name={t.name}
                        symbol={t.symbol}
                        key={index}
                        index={index}
                        handleClick={handleTokenSelect}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="resize-triggers">
              <div className="expand-trigger">
                <div style={{ width: "419px", height: "120px" }}></div>
              </div>
              <div className="contract-trigger"></div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
