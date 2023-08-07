import { useCallback, useEffect, useState } from "react";
import { useBalance } from "wagmi";
import { useGlobalState } from "~~/services/store/store";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

export function useAccountBalance(address?: string) {
  const [isEthBalance, setIsEthBalance] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const price = useGlobalState(state => state.nativeCurrencyPrice);

  const cleanValue = address?.startsWith("0x") ? address.slice(2) : address;
  const convertedValue: `0x${string}` = `0x${cleanValue}`;

  const {
    data: fetchedBalanceData,
    isError,
    isLoading,
  } = useBalance({
    address: convertedValue,
    watch: true,
    chainId: getTargetNetwork().id,
  });

  const onToggleBalance = useCallback(() => {
    if (price > 0) {
      setIsEthBalance(!isEthBalance);
    }
  }, [isEthBalance, price]);

  useEffect(() => {
    if (fetchedBalanceData?.formatted) {
      setBalance(Number(fetchedBalanceData.formatted));
    }
  }, [fetchedBalanceData]);

  return { balance, price, isError, isLoading, onToggleBalance, isEthBalance };
}
