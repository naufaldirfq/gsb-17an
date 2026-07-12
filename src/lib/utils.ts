import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatIndonesianDate(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const findPart = (type: string) => parts.find(p => p.type === type)?.value || "";
  
  const day = parseInt(findPart("day"));
  const monthNum = parseInt(findPart("month"));
  const year = findPart("year");
  let hour = findPart("hour");
  const minute = findPart("minute");

  if (hour === "24") hour = "00";

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const monthName = months[monthNum - 1] || "";

  return `${day} ${monthName} ${year} pukul ${hour}:${minute} WIB`;
}

export function getWIBDateTimeString(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const findPart = (type: string) => parts.find(p => p.type === type)?.value || "";
  
  const yyyy = findPart("year");
  const mm = findPart("month");
  const dd = findPart("day");
  let hh = findPart("hour");
  const min = findPart("minute");

  if (hh === "24") hh = "00";

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

