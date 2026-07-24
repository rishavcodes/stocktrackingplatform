import { InvoiceCount, InvoiceCountSP } from "../models/TransactionModels";

export async function generateInvoiceNumber() {
  const now = new Date();

  // Fetch the current invoice count from the database
  const countRecord = await InvoiceCount.findOneAndUpdate(
    {},
    { $inc: { count: 1 } }, // Increment the count by 1
    { new: true, upsert: true } // Create the document if it doesn't exist
  );

  // Determine the financial year
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 11 = Dec

  let financialYearStart: number;
  let financialYearEnd: number;

  if (currentMonth < 3) {
    // Jan, Feb, Mar -> financial year is previous year to current year
    financialYearStart = currentYear - 1;
    financialYearEnd = currentYear;
  } else {
    // Apr to Dec -> financial year is current year to next year
    financialYearStart = currentYear;
    financialYearEnd = currentYear + 1;
  }

  const financialYear = `${financialYearStart
    .toString()
    .slice(-2)}/${financialYearEnd.toString().slice(-2)}`;

  // Format the sequential number as a 4-digit number
  const sequentialNumber = countRecord.count.toString().padStart(4, "0");

  return `-${sequentialNumber}-${financialYear}`;
}

export async function generateInvoiceNumberSP() {
  const now = new Date();

  // Fetch the current invoice count from the database
  const countRecord = await InvoiceCountSP.findOneAndUpdate(
    {},
    { $inc: { count: 1 } }, // Increment the count by 1
    { new: true, upsert: true } // Create the document if it doesn't exist
  );

  // Determine the financial year based on the month
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 11 = Dec

  let financialYearStart: number;
  let financialYearEnd: number;

  if (currentMonth < 3) {
    // Jan, Feb, Mar → financial year is previous year to current year
    financialYearStart = currentYear - 1;
    financialYearEnd = currentYear;
  } else {
    // Apr to Dec → financial year is current year to next year
    financialYearStart = currentYear;
    financialYearEnd = currentYear + 1;
  }

  const financialYear = `${financialYearStart
    .toString()
    .slice(-2)}/${financialYearEnd.toString().slice(-2)}`;

  // Format the sequential number as a 4-digit number
  const sequentialNumber = countRecord.count.toString().padStart(4, "0");

  return `-${sequentialNumber}-${financialYear}`;
}
