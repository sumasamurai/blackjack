import React from "react";
import { DividerDecor } from "./assets/Decor";

export const GameStatus = (props: any) => {
  const statusClasses = "relative px-8 py-2 text-center m-2 min-w-175";
  let statusTextClasses = "text-20 font-bold ";

  const statusText = props.gameStatus;

  const dividerDecorClasses =
    "divider-decor w-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 scale-x-2 scale-y-1 stroke-contrast-color stroke-3 grid grid-cols-4 gap-4";

  switch (statusText) {
    case "Win":
      statusTextClasses += " text-win tracking-3";
      break;
    case "Lose":
      statusTextClasses += " text-lose tracking-3";
      break;
    case "Draw":
      statusTextClasses += " text-draw tracking-3";
      break;
    case "In Progress":
      statusTextClasses += " opacity-90 tracking-2";
      break;
    case "Not started":
      statusTextClasses += " ";
      break;
    default:
      break;
  }

  return (
    <div className={statusClasses}>
      <DividerDecor className={dividerDecorClasses} />
      <span className={statusTextClasses}>{statusText}</span>
    </div>
  );
};
