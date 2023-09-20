import { Key, useCallback, useEffect, useState } from "react";
import { Card, SkeletonCard, UnknownCard } from "./Cards";
import { GameStatus } from "./GameStatus";
import { getWeiToEther } from "./utils";
import { TransactionReceipt } from "viem";
import { useAccount } from "wagmi";
import { EtherInput } from "~~/components/scaffold-eth";
import { useScaffoldContractRead, useScaffoldContractWrite, useScaffoldEventSubscriber } from "~~/hooks/scaffold-eth";

export const BlackjackDemo = () => {
  const { address } = useAccount();
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [betAmount, setBetAmount] = useState<bigint | number>(0.01);
  const [newBetLimits, setNewBetLimits] = useState<string[] | undefined>([]);
  const [newPlayerHand, setNewPlayerHand] = useState<number[][] | undefined>([]);
  const [newDealerHand, setNewDealerHand] = useState<number[][] | undefined>([]);
  const [newGameStatus, setNewGameStatus] = useState<string | undefined>("Not started");
  const [newDealerScore, setNewDealerScore] = useState<number | undefined | "?">(0);
  const [newPlayerScore, setNewPlayerScore] = useState<number | undefined>(0);
  const [claimableAmount, setClaimableAmount] = useState(0);

  const { data: betLimits } = useScaffoldContractRead({
    contractName: "BlackjackDemo",
    functionName: "getBetLimits",
  });

  useEffect(() => {
    if (betLimits && betLimits.length === 2) {
      const minBetInEther = getWeiToEther(betLimits[0]);
      const maxBetInEther = getWeiToEther(betLimits[1]);

      setNewBetLimits([minBetInEther, maxBetInEther]);
    }
  }, [betLimits]);

  useScaffoldEventSubscriber({
    contractName: "BlackjackDemo",
    eventName: "Play",
    listener: logs => {
      logs.map(log => {
        const { player, firstDealerCard, playerHand, playerScore, gameStatus } = log.args;
        if (address === player) {
          setIsActive(true);
          setNewDealerScore("?");
          setNewPlayerScore(playerScore);
          setNewGameStatus(gameStatus);

          setNewDealerHand((prevState: any) => {
            prevState = [];
            const prevDealerHand: number[][] = prevState ? [...prevState] : [];

            if (firstDealerCard) {
              const mutableDealerCard: number[] = [];
              for (const value of firstDealerCard) {
                mutableDealerCard.push(value);
              }
              prevDealerHand.push(mutableDealerCard);
            }

            return prevDealerHand;
          });

          setNewPlayerHand((prevState: number[][] | undefined) => {
            prevState = [];
            const prevPlayerHand: number[][] = prevState ? [...prevState] : [];

            const mutablePlayerHand: number[][] | undefined = Array.isArray(playerHand)
              ? playerHand.map(card => [...card])
              : undefined;

            mutablePlayerHand && prevPlayerHand.push(...mutablePlayerHand);

            return prevPlayerHand;
          });
        }
      });
    },
  });

  useScaffoldEventSubscriber({
    contractName: "BlackjackDemo",
    eventName: "Hit",
    listener: logs => {
      logs.map(log => {
        const { player, firstDealerCard, playerHand, playerScore, gameStatus } = log.args;
        if (address === player) {
          setNewPlayerScore(playerScore);
          setNewGameStatus(gameStatus);

          setNewDealerHand(prevState => {
            prevState = [];
            const prevPlayerHand: number[][] = prevState ? [...prevState] : [];

            if (firstDealerCard && Array.isArray(firstDealerCard)) {
              const mutablePlayerHand: number[][] = [firstDealerCard.map(card => card)];

              mutablePlayerHand && prevPlayerHand.push(...mutablePlayerHand);
            }

            return prevPlayerHand;
          });

          setNewPlayerHand(prevState => {
            prevState = [];
            const prevPlayerHand: number[][] = prevState ? [...prevState] : [];

            const mutablePlayerHand: number[][] | undefined = Array.isArray(playerHand)
              ? playerHand.map(card => [...card])
              : undefined;

            mutablePlayerHand && prevPlayerHand.push(...mutablePlayerHand);

            return prevPlayerHand;
          });
        }
      });
    },
  });

  useScaffoldEventSubscriber({
    contractName: "BlackjackDemo",
    eventName: "Stand",
    listener: logs => {
      logs.map(log => {
        const { player, playerHand, dealerHand, claimableAmount, dealerScore, playerScore, gameStatus } = log.args;
        if (address === player) {
          setIsActive(false);
          setNewPlayerScore(playerScore);
          setNewDealerScore(dealerScore);
          setNewGameStatus(gameStatus);
          setClaimableAmount(Number(claimableAmount));

          setNewPlayerHand(prevState => {
            prevState = [];
            const prevPlayerHand: number[][] = prevState ? [...prevState] : [];

            const mutablePlayerHand: number[][] | undefined = Array.isArray(playerHand)
              ? playerHand.map(card => [...card])
              : undefined;

            mutablePlayerHand && prevPlayerHand.push(...mutablePlayerHand);

            return prevPlayerHand;
          });

          setNewPlayerHand(prevState => {
            prevState = [];
            const prevDealerHand: number[][] = prevState ? [...prevState] : [];
            const mutableDealerHand: number[][] | undefined = Array.isArray(dealerHand)
              ? dealerHand.map(card => [...card])
              : undefined;
            mutableDealerHand && prevDealerHand.push(...mutableDealerHand);

            return prevDealerHand;
          });
        }
      });
    },
  });

  useScaffoldEventSubscriber({
    contractName: "BlackjackDemo",
    eventName: "Claim",
    listener: logs => {
      logs.map(log => {
        const { player, claimableAmount } = log.args;
        if (address === player) {
          setClaimableAmount(Number(claimableAmount));
        }
      });
    },
  });

  const { writeAsync: handlePlay } = useScaffoldContractWrite({
    contractName: "BlackjackDemo",
    functionName: "play",
    // For payable functions, expressed in ETH
    value: `${Number(betAmount)}`,
    gas: BigInt(4500000),
    onBlockConfirmation: txnReceipt => {
      console.log("Transaction blockHash", txnReceipt.blockHash);
    },
  });

  const { writeAsync: handleHit } = useScaffoldContractWrite({
    contractName: "BlackjackDemo",
    functionName: "hit",
    onBlockConfirmation: (txnReceipt: TransactionReceipt) => {
      console.log("Transaction blockHash", txnReceipt.blockHash);
    },
  }) as {
    writeAsync: () => Promise<void>; // Specify the appropriate function signature
  };

  const { writeAsync: handleStand } = useScaffoldContractWrite({
    contractName: "BlackjackDemo",
    functionName: "stand",
    gas: BigInt(4500000),
    onBlockConfirmation: txnReceipt => {
      console.log("Transaction blockHash", txnReceipt.blockHash);
    },
  });

  const { writeAsync: handleClaim } = useScaffoldContractWrite({
    contractName: "BlackjackDemo",
    functionName: "claim",
    onBlockConfirmation: txnReceipt => {
      console.log("Transaction blockHash", txnReceipt.blockHash);
    },
  });

  const onPlay = async () => {
    try {
      setIsLoading(true);
      handlePlay();
      setIsLoading(false);
    } catch (error) {
      console.error("Error at the beginning of the game.", error);
      setIsLoading(false);
    }
  };

  const onHit = async () => {
    try {
      setIsLoading(true);
      handleHit();
      setIsLoading(false);
    } catch (error) {
      console.error("Error during 'Hit' action.", error);
      setIsLoading(false);
    }
  };

  const onStand = async () => {
    try {
      setIsLoading(true);
      handleStand();
      setIsLoading(false);
    } catch (error) {
      console.error("Error during 'Stand' action.", error);
      setIsLoading(false);
    }
  };

  const onClaim = async () => {
    try {
      setIsLoading(true);
      handleClaim();
      setIsLoading(false);
    } catch (error) {
      console.error("Error during 'Claim' action.", error);
      setIsLoading(false);
    }
  };

  const handleInputChange = useCallback((e: any) => {
    return setBetAmount(e);
  }, []);

  return (
    <div className="flex flex-col gap-y-6 lg:gap-y-8 py-8 lg:py-12 justify-center items-center">
      <div className="container mx-auto my-10">
        <div className="grid grid-cols-4 gap-8">
          <div className="board col-span-4 lg:col-span-3 rounded-3xl px-6 lg:px-8 py-4 light:shadow-lg shadow-base-300">
            <div className="flex flex-col relative h-full justify-center">
              <div className="flex flex-col gap-6 items-center">
                <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
                  <div className="flex items-stretch justify-start">
                    {newDealerHand && Object.keys(newDealerHand).length === 0 && <SkeletonCard />}
                    {newDealerHand &&
                      newDealerHand.map((data: any, index: Key | null | undefined) => <Card data={data} key={index} />)}
                    {isActive && <UnknownCard />}
                  </div>
                </div>
                <div
                  className={`flex flex-col items-center rounded-3xl px-6 lg:px-8 py-4 ${
                    newPlayerScore == 0 ? "opacity-10 bg-blue-400 bg-opacity-20 text-white text-opacity-0" : ""
                  }`}
                >
                  <div className="p-2 text-center font-light text-20">
                    <span className="opacity-80">Dealer Score:</span>{" "}
                    <span className="font-semibold">{newDealerScore}</span>
                  </div>
                  <GameStatus gameStatus={newGameStatus} />
                  <div className="p-2 text-center font-light text-20">
                    <span className="opacity-80">Player Score:</span>{" "}
                    <span className="font-semibold">{newPlayerScore}</span>
                  </div>
                </div>
                <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
                  <div className="flex items-stretch justify-start">
                    {newPlayerHand?.length == 0 && <SkeletonCard />}
                    {newPlayerHand &&
                      Array.isArray(newPlayerHand) &&
                      newPlayerHand.map((data: any, index) => <Card data={data} key={index} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel col-span-4 lg:col-span-1">
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-6 mb-6 space-y-1">
              <div className="z-10">
                <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 flex flex-col mt-10 relative">
                  <div className="text-base p-2 h-[5rem] w-[7.3rem] bg-base-300 absolute self-start rounded-[22px] -top-[38px] -left-[1px] -z-10 py-[0.65rem] shadow-lg shadow-base-300">
                    Bet Amount
                  </div>
                  <div className="p-5 divide-y divide-base-300">
                    <div className="flex flex-col gap-3 pb-4">
                      {newBetLimits && (
                        <>
                          <div className="flex gap-1 gap-1 items-center">
                            <span className="text-base font-light">Min Bet:</span>
                            <button className="btn btn-sm btn-ghost flex flex-col font-normal items-center hover:bg-transparent px-0 h-1.5 min-h-[0.375rem]">
                              <div className="flex items-center justify-center">
                                <span className="text-lg">{newBetLimits[0]}</span>
                                <span className="text-[0.8em] font-bold ml-1">ETH</span>
                              </div>
                            </button>
                          </div>

                          <div className="flex gap-1 gap-1 items-center">
                            <span className="text-base font-light">Max Bet:</span>
                            <button className="btn btn-sm btn-ghost flex flex-col font-normal items-center hover:bg-transparent px-0 h-1.5 min-h-[0.375rem]">
                              <div className="flex items-center justify-center">
                                <span className="text-lg">{newBetLimits[1]}</span>
                                <span className="text-[0.8em] font-bold ml-1">ETH</span>
                              </div>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1 gap-1 py-5 first:pt-0 last:pb-1 items-center">
                      <EtherInput
                        value={`${Number(betAmount)}`}
                        onChange={handleInputChange}
                        placeholder="value (ETH)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 lg:col-span-2 flex flex-col gap-6 mb-6 space-y-1">
              <div className="z-10">
                <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 flex flex-col mt-10 relative">
                  <div className="text-center text-base w-fit-content p-2 h-[5rem] w-[5.5rem] bg-base-300 absolute self-start rounded-[22px] -top-[38px] -left-[1px] -z-10 py-[0.65rem] shadow-lg shadow-base-300">
                    Controls
                  </div>
                  <div className="p-5 divide-y divide-base-300">
                    <div className=" flex flex-col gap-3 py-5 first:pt-0 last:pb-1">
                      <button onClick={onPlay} className="btn btn-secondary btn-sm min-h-[2.5rem]" disabled={isLoading}>
                        Play
                      </button>
                    </div>
                    <div className=" flex flex-col gap-3 py-5 first:pt-0 last:pb-1">
                      <button onClick={onHit} className="btn btn-secondary btn-sm min-h-[2.5rem]" disabled={isLoading}>
                        Hit
                      </button>
                    </div>
                    <div className=" flex flex-col gap-3 py-5 first:pt-0 last:pb-1">
                      <button
                        onClick={onStand}
                        className="btn btn-secondary btn-sm min-h-[2.5rem]"
                        disabled={isLoading}
                      >
                        Stand
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 lg:col-span-2 flex flex-col gap-6 space-y-1">
              <div className="z-10">
                <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 flex flex-col mt-10 relative">
                  <div className="w-fit-content p-2 h-[5rem] w-[6.3rem] bg-base-300 absolute self-start rounded-[22px] -top-[38px] -left-[1px] -z-10 py-[0.65rem] shadow-lg shadow-base-300">
                    Withdraw
                  </div>
                  <div className="p-5 divide-y divide-base-300">
                    <div className="flex gap-1 gap-1 py-5 first:pt-0 last:pb-1 items-center">
                      <span className="text-base font-light">Balance:</span>
                      <button className="btn btn-sm btn-ghost flex flex-col font-normal items-center hover:bg-transparent px-0 h-1.5 min-h-[0.375rem]">
                        <div className="w-full flex items-center justify-center">
                          <span className="text-lg">{getWeiToEther(BigInt(claimableAmount))}</span>
                          <span className="text-[0.8em] font-bold ml-1">ETH</span>
                        </div>
                      </button>
                    </div>

                    <div className=" flex flex-col gap-3 py-5 first:pt-0 last:pb-1">
                      <button
                        onClick={onClaim}
                        className="btn btn-secondary btn-sm h-1.5 min-h-[2.5rem]"
                        disabled={isLoading}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
