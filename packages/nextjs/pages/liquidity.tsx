import { NextPage } from "next";
import { LiquidityComponent } from "~~/components/Custom/Liquidty";
import { MetaHeader } from "~~/components/MetaHeader";

const Liquidity: NextPage = () => {
  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow pt-10">
        {<LiquidityComponent title="Add Liquidty Page" />}
      </div>
    </>
  );
};

export default Liquidity;
