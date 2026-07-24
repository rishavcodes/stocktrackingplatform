export const getDummySPData = () => ({
  plans: 6,
  subscribers: 132,
  revenue: 40000,
  leads: 18,
  walletbalance: 7800,
  returnpercentage: 12.6,
  returnratio: 75,
  open: 15,
  close: 35,
  total: 50,
  articles: 8,
  videos: 5,
  podcasts: 3,

  salesData: [
    { month: "Jan", orders: 120, renewOrders: 10 },
    { month: "Feb", orders: 150, renewOrders: 18 },
    { month: "Mar", orders: 180, renewOrders: 31 },
    { month: "Apr", orders: 130, renewOrders: 62 },
    { month: "May", orders: 210, renewOrders: 45 },
    { month: "Jun", orders: 260, renewOrders: 37 },
    { month: "Jul", orders: 230, renewOrders: 67 },
    { month: "Aug", orders: 310, renewOrders: 81 },
    { month: "Sep", orders: 280, renewOrders: 97 },
    { month: "Oct", orders: 340, renewOrders: 93 },
    { month: "Nov", orders: 300, renewOrders: 112 },
    { month: "Dec", orders: 360, renewOrders: 69 },
  ],

  upcomingevents: [
    { _id: "1", title: "Webinar on Market Trends", schedule: "2025-10-15" },
    { _id: "2", title: "Investor Meetup", schedule: "2025-10-21" },
  ],
  pastevents: [
    { _id: "3", title: "Nifty Workshop", schedule: "2025-09-20" },
    { _id: "4", title: "Options Masterclass", schedule: "2025-09-10" },
  ],
});
