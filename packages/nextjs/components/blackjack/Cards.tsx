import { CardDecor, PatternDecor } from "./assets/Decor";
import { RANKS, SUITS } from "./constants";
import { getValueByIndex } from "./utils";

export const UnknownCard = () => (
  <div className="card unknown-card slide-in-right">
    <PatternDecor className="unknown-card-pattern" />
  </div>
);

export const SkeletonCard = () => (
  <>
    <div className="card skeleton-card "></div>
    <div className="card skeleton-card "></div>
  </>
);

export const Card = ({ data }: any) => (
  <div className="card slide-in-right">
    <CardDecor className="card-decor" />
    <div className="card-rank">{getValueByIndex(data[0], RANKS)}</div>
    <div className="card-suit">{getValueByIndex(data[1], SUITS)}</div>
  </div>
);
