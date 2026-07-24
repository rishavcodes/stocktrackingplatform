import { SPstats } from "./OurFamily";

export const getRandomUserFromCategory = (
  category: string,
  usersData: SPstats[]
) => {
  const usersInCategory = usersData.filter(
    (user) => user.category === category
  );
  if (usersInCategory.length > 0) {
    const randomIndex = Math.floor(Math.random() * usersInCategory.length);
    return usersInCategory[randomIndex];
  }
  return null;
};

// export const categories: string[] = [
//   "Research Analyst",
//   "Registered Investment Advisor",
//   "PMS",
//   "Mutual Funds",
//   "Trainers",
//   "Forex Experts",
//   "Tax Experts",
//   "Stock Brokers",
//   "Insurance",
//   "AIF",
// ];
