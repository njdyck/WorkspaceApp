let counter = 0;

export const generateId = (): string => {
  counter++;
  return `item_${Date.now()}_${counter}`;
};

