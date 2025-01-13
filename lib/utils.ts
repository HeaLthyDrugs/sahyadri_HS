import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInHours, differenceInDays, isWithinInterval } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const calculateDuration = (checkin: Date, checkout: Date) => {
  const hours = differenceInHours(checkout, checkin);
  const days = differenceInDays(checkout, checkin);
  
  return {
    hours,
    days,
    isMultiDay: days > 0
  };
};

export const isDateInRange = (date: Date, start: Date, end: Date) => {
  return isWithinInterval(date, { start, end });
};
