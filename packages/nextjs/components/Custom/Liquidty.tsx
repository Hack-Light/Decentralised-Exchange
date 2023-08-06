/* eslint-disable @typescript-eslint/no-extra-semi */

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { TokenList } from "./TokenList";
import { Token, WETH } from "@uniswap/sdk";
import IUniswapV2Factory from "@uniswap/v2-core/build/IUniswapV2Factory.json";
import { Modal } from "antd";
import { ethers } from "ethers";
import { useDebounce } from "usehooks-ts";
import { Hash } from "viem";
import { erc20ABI, useAccount, useNetwork, usePublicClient, useWalletClient } from "wagmi";
import uniswapRouterABI from "~~/abis/uniswapv2router.json";
import { notification } from "~~/utils/scaffold-eth";

export const LiquidityComponent = ({ title }: { title: string }) => {
  // states
  const [firstInputAmount, setFirstInputAmount] = useState(0);
  const [secondInputAmount, setSecondInputAmount] = useState(0);
  const [tokenIn, setTokenIn] = useState<{ name?: string; symbol?: string; address?: string; decimals?: string }>({});
  const [tokenOut, setTokenOut] = useState<{ name?: string; symbol?: string; address?: string; decimals?: string }>({});
  const [open, setOpen] = useState(false);
  const [confirmLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [addressSearchInput, setAddressSearchInput] = useState("");
  const [tokenType, setTokenType] = useState("tokenInput");
  const [tokensArray, setTokensArray] = useState<{ name: string; decimals: number; symbol: string }[]>([
    { name: "ether", decimals: 6, symbol: "ETH" },
  ]);
  const [hash, setHash] = useState<Hash>();
  const [txType, setTxType] = useState("");
  const [isBtnDisabled, setIsBtnDisabled] = useState(true);

  // constants
  const uniswapRouterAddress = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008";

  // hooks
  const { data: walletClient } = useWalletClient();
  const dFirstInptAmount = useDebounce(firstInputAmount, 100);
  const dSecondInputAmount = useDebounce(secondInputAmount, 100);
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

  const handleAddLiquidity = async () => {
    try {
      const hx = await walletClient?.writeContract({
        address: uniswapRouterAddress,
        abi: uniswapRouterABI,
        functionName: "addLiquidity",
        args: [
          tokenIn.address,
          tokenOut.address,
          firstInputAmount,
          secondInputAmount,
          0,
          0,
          walletClient.account.address,
          Math.floor(Date.now() / 1000) + 1000,
        ],
      });

      setHash(hx);
      setTxType("addLiquidity");
    } catch (error) {
      console.log(error);
    }
  };

  const handleAdd = async () => {
    try {
      if (isLoadingSigner || !chain?.id) return;

      if (hasUndefinedFields(tokenIn) || hasUndefinedFields(tokenOut)) return;

      if (tokenIn?.symbol == tokenOut.symbol) {
        notification.error("You cannot swap between same token");
        return;
      }

      let tokenSendIn, tokenSendOut, tokenSendInAmount, tokenSendOutAmount;

      const chainId: 1 | 3 | 4 | 5 | 42 = chain.id || 1;

      if (tokenIn?.symbol.toLowerCase() == "eth") {
        tokenSendIn = WETH[chainId] || new Token(chain.id, "0x9fb0fC75cC6966f80793d05b1f2336368aa7D4B2", 18);
        tokenSendInAmount = ethers.parseEther(firstInputAmount.toString());
      } else {
        tokenSendIn = new Token(chain.id, tokenIn?.address, tokenIn?.decimals);
        tokenSendInAmount = ethers.parseUnits(firstInputAmount.toString(), tokenIn?.decimals);
      }

      if (tokenOut?.symbol?.toLowerCase() == "eth") {
        tokenSendOut = WETH[chainId] || new Token(chain.id, "0x9fb0fC75cC6966f80793d05b1f2336368aa7D4B2", 18);
        tokenSendOutAmount = ethers.parseEther(secondInputAmount.toString());
      } else {
        tokenSendOut = new Token(chain.id, tokenOut?.address, tokenOut?.decimals);
        tokenSendOutAmount = ethers.parseUnits(secondInputAmount.toString(), tokenIn?.decimals);
      }

      setTokenIn(tokenSendIn);
      setTokenOut(tokenSendOut);
      setFirstInputAmount(tokenSendInAmount);
      setSecondInputAmount(tokenSendOutAmount);

      //   crate pair transaction
      //   0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f

      const createPairTxHash = await walletClient?.writeContract({
        address: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
        abi: IUniswapV2Factory.abi,
        functionName: "createPair",
        args: [tokenSendIn.address, tokenSendOut.address],
      });

      setHash(createPairTxHash);
      setTxType("createPair");
    } catch (error) {
      notification.error("Sorry,  an error occoured");
      console.log(error);
    }
  };

  const handleApproval = async () => {
    console.log("firstInputAmount", firstInputAmount, secondInputAmount);

    await walletClient?.writeContract({
      address: tokenIn.address || new Token(chain.id, "0x9fb0fC75cC6966f80793d05b1f2336368aa7D4B2", 18),
      abi: erc20ABI,
      functionName: "approve",
      args: [uniswapRouterAddress, ethers.parseUnits(firstInputAmount.toString(), tokenIn?.decimals)],
    });

    notification.info(`Approval tx for ${tokenIn.symbol} sent`);

    const hash2 = await walletClient?.writeContract({
      address: tokenOut.address || new Token(chain.id, "0x9fb0fC75cC6966f80793d05b1f2336368aa7D4B2", 18),
      abi: erc20ABI,
      functionName: "approve",
      args: [uniswapRouterAddress, ethers.parseUnits(secondInputAmount.toString(), tokenOut?.decimals)],
    });

    notification.info(`Approval tx for ${tokenOut.symbol} sent`);

    setHash(hash2);
    setTxType("approval");
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
    if (address == "") return;

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

  const getBalance = async (tokenAddress: `0x${string}`) => {
    const balance: any = await provider.readContract({
      address: tokenAddress,
      abi: erc20ABI,
      functionName: "balanceOf",
      args: [walletClient?.account.address || `0x00`],
    });

    return balance;
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

          if (txType == "createPair") {
            handleApproval();
          }

          if (txType == "addLiquidity") {
            notification.success("Liquidity Added");
          }

          if (txType == "approval") {
            handleAddLiquidity();
          }
        } else {
          notification.error("Transaction failed");
        }

        // if (txType == "approve") {
        //   handleAllowanceCheck();
        // }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  useEffect(() => {
    // handleAllowanceCheck();
    (async () => {
      let input1Balance;

      if (dFirstInptAmount) {
        input1Balance = await getBalance(tokenIn?.address);
      } else {
        input1Balance = 0;
      }
      let input2Balance;

      if (dSecondInputAmount) {
        input2Balance = await getBalance(tokenOut?.address);
      } else {
        input2Balance = 0;
      }

      console.log("balance", input1Balance, input2Balance);

      //   disable the approval button
      if (input1Balance < dFirstInptAmount || input2Balance < dSecondInputAmount) {
        //  do the magic
        setIsBtnDisabled(true);
      } else {
        setIsBtnDisabled(false);
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dFirstInptAmount, dSecondInputAmount]);

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
            <div className="sc-1es900k-1 hfTphi" style={{ marginBottom: 10 }}>
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
                        setFirstInputAmount(Number(e.target.value));
                      }}
                      value={firstInputAmount}
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
                        type="number"
                        pattern="^[0-9]*[.,]?[0-9]*$"
                        placeholder="0"
                        min={0}
                        onChange={e => {
                          setSecondInputAmount(Number(e.target.value));
                        }}
                        value={secondInputAmount}
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
              <button
                onClick={handleAdd}
                style={{ fontWeight: 600 }}
                className="sc-bczRLJ lhSHM sc-fwrjc2-1 sc-fwrjc2-4 bYPKDz lhnceG"
                disabled={isBtnDisabled}
              >
                <div className="sc-fwrjc2-0 iBwqId"></div>
                {!isReady ? "Connect Wallet" : "Add Liquidity"}
              </button>
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
                  handleSearchToken(e.target.value);
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
