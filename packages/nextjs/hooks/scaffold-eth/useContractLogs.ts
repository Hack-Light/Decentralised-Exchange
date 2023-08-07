import { useEffect, useState } from "react";
import { Address, BlockTag, Log } from "viem";
import { usePublicClient } from "wagmi";

export const useContractLogs = (address: Address) => {
  const [logs, setLogs] = useState<Log[]>([]);
  const client = usePublicClient();

  const myBlockTag: BlockTag = "latest";

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const existingLogs = await client.getLogs({
          address: address,
          fromBlock: 0n,
          toBlock: myBlockTag,
        });
        setLogs(existingLogs);
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      }
    };
    fetchLogs();

    return client.watchBlockNumber({
      onBlockNumber: async (blockNumber, prevBlockNumber) => {
        const newLogs = await client.getLogs({
          address: address,
          fromBlock: prevBlockNumber,
          toBlock: myBlockTag,
        });
        setLogs(prevLogs => [...prevLogs, ...newLogs]);
      },
    });
  }, [address, client]);

  return logs;
};
