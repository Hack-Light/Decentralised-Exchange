import type { NextPage } from "next";
import { SwapComponent } from "~~/components/Custom";
import { MetaHeader } from "~~/components/MetaHeader";

const Home: NextPage = () => {
  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow pt-10">{<SwapComponent title="Swap Page" />}</div>
    </>
  );
};

export default Home;
