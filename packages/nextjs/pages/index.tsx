import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
import { BlackjackDemo } from "~~/components/blackjack/BlackjackDemo";

const Blackjack: NextPage = () => {
  return (
    <>
      <MetaHeader
        title="Blackjack Demo | Scaffold-ETH 2"
        description="Blackjack Demo created with 🏗 Scaffold-ETH 2, showcasing some of its features."
      >
        {/* We are importing the font this way to lighten the size of SE2. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
        />
      </MetaHeader>
      <div className="game" data-theme="blackjack">
        <BlackjackDemo />
      </div>
    </>
  );
};

export default Blackjack;
