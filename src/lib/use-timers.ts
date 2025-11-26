'use client';

import { isBefore } from 'date-fns';
import { useEffect, useState } from 'react';

export const useNow = (delayInMs = 1_000, until?: Date) => {
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      const nownow = new Date();
      if (until && nownow > until) {
        clearInterval(interval);
      }
      setNow(nownow);
    }, delayInMs);
    return () => clearInterval(interval);
  });
  return now;
};

export const useIsBefore = (refDateIn: Date | string | number | undefined) => {
  const refDate = refDateIn ? new Date(refDateIn) : undefined;
  const [isActBefore, setIsBefore] = useState<boolean | undefined>(
    refDate ? isBefore(new Date(), refDate) : undefined
  );
  useEffect(() => {
    if (!refDate) {
      return;
    }
    setIsBefore(isBefore(new Date(), refDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refDateIn, refDate?.getTime()]);

  useEffect(() => {
    if (refDate && !isActBefore && !isBefore(new Date(), refDate)) {
      return;
    }
    let timeout: ReturnType<typeof setTimeout>;
    const checkNext = () => {
      if (!refDate) {
        return;
      }
      const timeMissing = refDate?.getTime() - new Date().getTime();
      if (!isBefore(new Date(), refDate)) {
        setIsBefore(false);
        return;
      }
      setIsBefore(true);
      timeout = setTimeout(
        checkNext,
        Math.min(timeMissing, 20 * 24 * 60 * 60 * 1000)
      );
    };
    checkNext();
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refDate?.getTime()]);
  return isActBefore;
};
