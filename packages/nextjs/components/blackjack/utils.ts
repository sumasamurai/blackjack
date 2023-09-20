export const getValueByIndex = (index: number, type: any[]) =>
  index >= 0 && index < type.length ? type[index] : "Invalid number";

export const getWeiToEther = (wei: bigint): string => {
  const etherValue = Number(wei) / 1e18;
  return etherValue.toString();
};
