import React from 'react'
import { io } from "socket.io-client";

export default function MarketUpdates() {

  const socket = io("ws://localhost:8080/marketdata/indices", {
    transports: ['websocket'],
  });
  
  socket.on("marketIndicesUpdate", (data) => {
    console.log("Data", data);
  });
  
  // socket.on("topLosersUpdate", (data) => {
  //   console.log("Top Losers:", data);
  // });
  
  // socket.on("marketDataError", (error) => {
  //   console.error("Market Data Error:", error.message);
  // });

  return (

    <section className="py-7">
      <h2 className="text-center text-black font-league text-4xl font-light">Market Updates</h2>

      <div className="bg-[#F3F3F3] h-[33vh] w-[87vw] relative mt-7 rounded-lg p-6 ">
        <h6 className=" text-gray-600 font-medium ml-8">Thu, 20 Sep 2024</h6>

        <div className="container flex justify-between items-center pt-1 mx-auto">

          {/* Market Card 1 */}
          <div className="flex justify-between items-center bg-white h-[18vh] w-[32%] rounded-lg shadow-lg transition-transform transform hover:scale-105 hover:shadow-xl my-3 p-4">
            <div className="flex flex-col">
              <h6 className="mb-2 text-gray-700 font-league">Nifty 50</h6>
              <h3 className="font-bold text-3xl text-black font-league">25,343</h3>
              <div className="flex items-center text-sm">
                <svg className="w-4 h-4 rotate-180" fill="red" viewBox="0 0 24 24">
                  <path d="M12 2l-8 8h5v12h6v-12h5l-8-8z" />
                </svg>
                <span className="text-red-500 font-medium ml-1">0.18%</span>
              </div>
            </div>
            <img src="/images/hero/Stock down.png" alt="Stock down" className="h-full w-28 object-contain" />
          </div>

          {/* Market Card 2 */}
          <div className="flex justify-between items-center bg-white h-[18vh] w-[32%] rounded-lg shadow-lg transition-transform transform hover:scale-105 hover:shadow-xl my-3 p-4">
            <div className="flex flex-col">
              <h6 className="mb-2 text-gray-700 font-league">Nifty 50</h6>
              <h3 className="font-bold text-3xl text-black font-league">25,343</h3>
              <div className="flex items-center text-sm">
                <svg className="w-4 h-4 rotate-180" fill="red" viewBox="0 0 24 24">
                  <path d="M12 2l-8 8h5v12h6v-12h5l-8-8z" />
                </svg>
                <span className="text-red-500 font-medium ml-1">0.18%</span>
              </div>
            </div>
            <img src="/images/hero/Stock down.png" alt="Stock down" className="h-full w-28 object-contain" />
          </div>

          {/* Market Card 3 */}
          <div className="flex justify-between items-center bg-white h-[18vh] w-[32%] rounded-lg shadow-lg transition-transform transform hover:scale-105 hover:shadow-xl my-3 p-4">
            <div className="flex flex-col">
              <h6 className="mb-2 text-gray-700 font-league">Nifty 50</h6>
              <h3 className="font-bold text-3xl text-black font-league">25,343</h3>
              <div className="flex items-center text-sm">
                <svg className="w-4 h-4 rotate-180" fill="red" viewBox="0 0 24 24">
                  <path d="M12 2l-8 8h5v12h6v-12h5l-8-8z" />
                </svg>
                <span className="text-red-500 font-medium ml-1">0.18%</span>
              </div>
            </div>
            <img src="/images/hero/Stock down.png" alt="Stock down" className="h-full w-28 object-contain" />
          </div>

        </div>
      </div>


      {/* ------------------------------- Top Gainer and Looser -------------------------------------- */}
      {/* -------------------------------------------------------------------------------------------- */}

      <section className="py-8 w-full flex justify-center gap-5">

        {/* ------------------------------- GAINERS -------------------------------------- */}

        <div className="overflow-x-auto">
          <h2 className="text-center text-black font-semibold text-3xl mb-4 ">Gainers</h2>
          <table className="w-[43vw] table-auto bg-white rounded-t-2xl shadow-lg overflow-hidden">
            <thead>
              <tr className="text-white bg-[#01AFEF] rounded-t-2xl">
                <th className="px-6 py-3 text-left font-semibold">Name</th>
                <th className="px-6 py-3 text-left font-semibold">LTP</th>
                <th className="px-6 py-3 text-left font-semibold">Chg</th>
                <th className="px-6 py-3 text-left font-semibold">Chg%</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-100 transition duration-200 ease-in-out">
                <td className="px-6 py-2 flex items-center">
                  <img src="/path-to-paytm-logo.png" alt="Paytm Logo" className="w-6 h-6 mr-4" />
                  <div>
                    <h4 className="font-bold text-base">PAYTM</h4>
                    <p className="text-gray-500 text-sm">Category</p>
                  </div>
                </td>

                {/* LTP Cell */}
                <td className="px-6 py-2 text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4">
                    <span>10.38</span>
                  </div>
                </td>

                {/* Chg Cell */}
                <td className="px-6 py-2 text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4">
                    <span>410</span>
                  </div>
                </td>

                {/* Chg% Cell */}
                <td className="px-6 py-2 text-green-600 font-bold text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="green" viewBox="0 0 24 24">
                      <path d="M12 2l-8 8h5v12h6v-12h5l-8-8z" />
                    </svg>
                    <span>19.5%</span>
                  </div>
                </td>
              </tr>

              {/* Other rows */}
              <tr className="border-b hover:bg-gray-100 transition duration-200 ease-in-out">
                <td className="px-6 py-2 flex items-center">
                  <img src="/path-to-zomato-logo.png" alt="Zomato Logo" className="w-6 h-6 mr-4" />
                  <div>
                    <h4 className="font-bold text-base">ZOMATO Q</h4>
                    <p className="text-gray-500 text-sm">Category</p>
                  </div>
                </td>

                {/* LTP Cell */}
                <td className="px-6 py-2 text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4">
                    <span>389.80</span>
                  </div>
                </td>

                {/* Chg Cell */}
                <td className="px-6 py-2 text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4">
                    <span>410</span>
                  </div>
                </td>

                {/* Chg% Cell */}
                <td className="px-6 py-2 text-green-600 font-bold text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="green" viewBox="0 0 24 24">
                      <path d="M12 2l-8 8h5v12h6v-12h5l-8-8z" />
                    </svg>
                    <span>9.0%</span>
                  </div>
                </td>
              </tr>

              <tr className="border-b hover:bg-gray-100 transition duration-200 ease-in-out">
                <td className="px-6 py-2 flex items-center">
                  <img src="/path-to-pjl-logo.png" alt="PJL Logo" className="w-6 h-6 mr-4" />
                  <div>
                    <h4 className="font-bold text-base">PRISM JOHNSON LIMITED</h4>
                    <p className="text-gray-500 text-sm">Category</p>
                  </div>
                </td>

                {/* LTP Cell */}
                <td className="px-6 py-2 text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4">
                    <span>478.85</span>
                  </div>
                </td>

                {/* Chg Cell */}
                <td className="px-6 py-2 text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4">
                    <span>410</span>
                  </div>
                </td>

                {/* Chg% Cell */}
                <td className="px-6 py-2 text-green-600 font-bold text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="green" viewBox="0 0 24 24">
                      <path d="M12 2l-8 8h5v12h6v-12h5l-8-8z" />
                    </svg>
                    <span>8.1%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>


        </div>


        {/* ------------------------------- Losers -------------------------------------- */}



        <div className="overflow-x-auto">
          <h2 className="text-center text-black font-semibold text-3xl mb-4 ">Losers</h2>
          <table className="w-[43vw] table-auto bg-white rounded-t-2xl shadow-lg overflow-hidden">
            <thead>
              <tr className="text-white bg-[#01AFEF] rounded-t-2xl">
                <th className="px-6 py-3 text-left font-semibold">Name</th>
                <th className="px-6 py-3 text-left font-semibold">LTP</th>
                <th className="px-6 py-3 text-left font-semibold">Chg</th>
                <th className="px-6 py-3 text-left font-semibold">Chg%</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-100 transition duration-200 ease-in-out">
                <td className="px-6 py-2 flex items-center">
                  <img src="/path-to-paytm-logo.png" alt="Paytm Logo" className="w-6 h-6 mr-4" />
                  <div>
                    <h4 className="font-bold text-base">PAYTM</h4>
                    <p className="text-gray-500 text-sm">Category</p>
                  </div>
                </td>

                {/* LTP Cell */}
                <td className="px-6 py-2 text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4">
                    <span>10.38</span>
                  </div>
                </td>

                {/* Chg Cell */}
                <td className="px-6 py-2 text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4">
                    <span>410</span>
                  </div>
                </td>

                {/* Chg% Cell */}
                <td className="px-6 py-2 text-green-600 font-bold text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="green" viewBox="0 0 24 24">
                      <path d="M12 2l-8 8h5v12h6v-12h5l-8-8z" />
                    </svg>
                    <span>19.5%</span>
                  </div>
                </td>
              </tr>

              {/* Other rows */}
              <tr className="border-b hover:bg-gray-100 transition duration-200 ease-in-out">
                <td className="px-6 py-2 flex items-center">
                  <img src="/path-to-zomato-logo.png" alt="Zomato Logo" className="w-6 h-6 mr-4" />
                  <div>
                    <h4 className="font-bold text-base">ZOMATO Q</h4>
                    <p className="text-gray-500 text-sm">Category</p>
                  </div>
                </td>

                {/* LTP Cell */}
                <td className="px-6 py-2 text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4">
                    <span>389.80</span>
                  </div>
                </td>

                {/* Chg Cell */}
                <td className="px-6 py-2 text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4">
                    <span>410</span>
                  </div>
                </td>

                {/* Chg% Cell */}
                <td className="px-6 py-2 text-green-600 font-bold text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="green" viewBox="0 0 24 24">
                      <path d="M12 2l-8 8h5v12h6v-12h5l-8-8z" />
                    </svg>
                    <span>9.0%</span>
                  </div>
                </td>
              </tr>

              <tr className="border-b hover:bg-gray-100 transition duration-200 ease-in-out">
                <td className="px-6 py-2 flex items-center">
                  <img src="/path-to-pjl-logo.png" alt="PJL Logo" className="w-6 h-6 mr-4" />
                  <div>
                    <h4 className="font-bold text-base">PRISM JOHNSON LIMITED</h4>
                    <p className="text-gray-500 text-sm">Category</p>
                  </div>
                </td>

                {/* LTP Cell */}
                <td className="px-6 py-2 text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4">
                    <span>478.85</span>
                  </div>
                </td>

                {/* Chg Cell */}
                <td className="px-6 py-2 text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4">
                    <span>410</span>
                  </div>
                </td>

                {/* Chg% Cell */}
                <td className="px-6 py-2 text-green-600 font-bold text-left relative">
                  <div className="border-l-2 border-gray-100 h-full pl-4 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="green" viewBox="0 0 24 24">
                      <path d="M12 2l-8 8h5v12h6v-12h5l-8-8z" />
                    </svg>
                    <span>8.1%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>


        </div>
      </section>

    </section>

  )
}

