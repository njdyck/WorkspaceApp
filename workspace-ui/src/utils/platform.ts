export const isMac = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
};

export const getPanModifier = (): 'altKey' | 'ctrlKey' => {
  return isMac() ? 'altKey' : 'ctrlKey';
};

export const isPanMode = (e: MouseEvent | React.MouseEvent): boolean => {
  const modifier = getPanModifier();
  return e[modifier];
};





