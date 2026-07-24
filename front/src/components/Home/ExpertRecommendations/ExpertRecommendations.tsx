import {
  useScoreCardDataForHomepage,
  ScoreCardTypesHomepageEnum,
} from "@/components/ScoreCard/useScoreCardData";
import { ScoreCardTypes } from "@/lib/types";
import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import Link from "next/link";

const ExpertRecommendations = () => {
  const { openTodayScorecards } = useScoreCardDataForHomepage(
    ScoreCardTypesHomepageEnum.forHomePage
  );

  // console.log("this is the live open trades: ", openTodayScorecards);

  // Function to extract day, month, and year from the validity date
  const extractDateDetails = (validity: any) => {
    const [datePart] = validity.split(",");
    const [day, month, year] = datePart.trim().split("/");

    // Calculate days remaining from today
    const currentDate = new Date();
    const validityDate = new Date(`${year}-${month}-${day}`);
    const timeDiff = validityDate.getTime() - currentDate.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    return {
      day,
      month,
      year,
      daysRemaining: daysRemaining >= 0 ? daysRemaining : 0, // Show 0 if the validity has passed
    };
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div className="dark:bg-[#000000] bg-white h-auto w-full mx-auto flex flex-col items-center py-8 md:py-12">
        <h2 className="text-2xl md:text-4xl font-league mt-4 text-center">
          EXPERT RECOMMENDATIONS
        </h2>
        <p className="text-sm md:text-lg font-league text-[#8F8F8F] w-[90%] md:w-[60%] text-center my-3 font-light">
          Stay ahead in the market with expert insights, timely stock <br />{" "}
          recommendations, and strategies tailored to help you make informed{" "}
          <br /> investment decisions.
        </p>

        <div className="w-full flex flex-col lg:flex-row justify-center items-center lg:items-start mt-6 gap-6">
          <div className="flex flex-col w-[80%] md:w-auto">
            <h4 className="my-2">Experts Recommendation for Today ({today})</h4>
            <div className="flex flex-col overflow-auto shadow-lg rounded-xl text-left text-sm">
              <div className="h-[300px] mx-auto bg-white dark:bg-darkgray">
                <div className="bg-[#01AFEF] dark:bg-lightgray text-white font-semibold flex justify-between rounded-t-md">
                  <div className="min-w-[180px] text-center px-4 py-2">
                    Our Expert
                  </div>
                  <div className="min-w-[150px] text-center px-4 py-2 border-l-2 border-gray">
                    Name
                  </div>
                  <div className="min-w-[150px] text-center px-4 py-2 border-l-2 border-gray">
                    Entry Price
                  </div>
                  <div className="min-w-[150px] text-center px-4 py-2 border-l-2 border-gray">
                    Target/ Stop Loss
                  </div>
                  <div className="min-w-[150px] text-center px-4 py-2 border-l-2 border-gray">
                    Validity/Days Left
                  </div>
                  <div className="min-w-[150px] text-center px-4 py-2 border-l-2 border-gray">
                    LTP
                  </div>
                </div>
                {/* <div className="h-[300px] overflow-y-auto"> */}
                {/* <div className="w-full bg-white dark:bg-darkgray text-left text-sm"> */}
                <div className="overflow-y-auto">
                  {openTodayScorecards.map((scorecard, idx) => {
                    const { day, month, year, daysRemaining } =
                      extractDateDetails(scorecard.validity);
                    return (
                      <Link
                        key={idx}
                        href={`/view/serviceprovider/${scorecard.authorData.id}/articles`}
                      >
                        <div
                          key={idx}
                          className="group flex flex-wrap lg:flex-nowrap justify-between items-center border-b border-gray-200 transition hover:bg-gray-100 cursor-pointer"
                        >
                          <div className="max-w-[180px] text-left py-3 flex items-center">
                            <img
                              src={scorecard.authorData.authorImage}
                              alt={scorecard.authorData.name}
                              className="w-12 h-12 md:w-24 md:h-24 rounded-full object-cover mr-3 md:mr-4"
                            />
                            <div>
                              <h4 className="font-semibold">
                                {scorecard.authorData.name}
                              </h4>
                              <h5>{scorecard.authorData.type}</h5>
                            </div>
                          </div>
                          <div className="min-w-[150px] text-center py-3">
                            <span className="block font-semibold uppercase">
                              {scorecard.entryType}
                            </span>
                            <span className="text-gray-500">
                              {scorecard.scriptname}
                            </span>
                          </div>
                          <div className="min-w-[150px] text-center py-3">
                            {scorecard.entryPrice}
                          </div>
                          <div className="min-w-[150px] text-center py-3">
                            <span>{scorecard.target}</span>
                            <br />
                            <span className="text-slate-400">
                              {scorecard.stoploss}
                            </span>
                          </div>
                          <div className="min-w-[150px] text-center py-3">
                            <p className="text-gray-700 font-semibold">{`${day}/${month}/${year}`}</p>
                            <p className="text-gray-500 text-sm">
                              {daysRemaining} day(s) left
                            </p>
                          </div>
                          <div className="min-w-[150px] text-center py-3">
                            <p className="text-gray-700 font-semibold">
                              {scorecard.ltp}
                            </p>
                            <p className="text-gray-500 text-sm">
                              {scorecard.pnlpercentage}
                            </p>
                            <p className="text-gray-500 text-sm">
                              {scorecard.pnl}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {/* </div> */}
                {/* </div> */}
              </div>
            </div>
            {/* -------------------------------------------------- */}

            <div className="w-[80%] md:w-auto my-4">
              {/* <!-- Disclaimer --> */}
              <p className="text-sm text-gray-500">
                Disclaimer: Investments in securities markets are subject to
                market risks. Please read all related documents carefully. To
                read complete disclaimer <br /> click on{" "}
                <a
                  href="https://tradebolive.com/documents/disclaimer"
                  className="text-blue-600 hover:underline"
                >
                  https://tradeboxlive.com
                </a>
              </p>

              {/* <!-- Telegram Button --> */}
              <div className="mt-4 flex justify-start ml-0 items-center">
                <a
                  href="https://t.me/tradeboxliveupdates"
                  target="_blank"
                  className="flex items-center justify-between bg-gradient-to-r from-[#01E3A1] to-[#01AFEF] text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 relative"
                >
                  <span className="pr-16 mt-4 mb-3">
                    For such Updates & Latest Recommendations, Join us on
                    Telegram
                  </span>
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"
                    alt="Telegram"
                    className="absolute right-[-20px] w-20 h-20"
                  />
                </a>
              </div>
            </div>
          </div>
          {/* Sidebar Content */}
          <div className="w-[80%] lg:w-[400px] bg-white border-2 border-gray-200 rounded-xl shadow-xl p-4 md:p-6 mt-6 md:mt-0 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-center mb-4">
              <img
                src="images/hero/SEBI.png"
                alt="SEBI Logo"
                className="mx-auto mb-4 w-10 h-auto md:w-14"
              />
              <h1 className="font-bold text-lg md:text-xl text-gray-900">
                Annexure-II Risk Disclosures
              </h1>
              <hr className="border-black w-12 md:w-16 mx-auto my-2" />
              <h2 className="text-gray-800 font-semibold text-base md:text-lg">
                RISK DISCLOSURE ON DERIVATIVES
              </h2>
            </div>
            <div className="text-xs md:text-sm text-gray-700 space-y-4 leading-relaxed">
              <ul className="list-disc list-inside">
                <li>
                  9 Out of 10 individuals traders in equity Futures and Options
                  Segment, incurred net losses.
                </li>
                <li>
                  On average, loss makers registered a net trading loss close to
                  Rs. 50,000.
                </li>
                <li>
                  Loss makers expended an additional 28% of net trading losses
                  as transaction costs.
                </li>
                <li>
                  Profit-makers incurred 15% of such profits as transaction
                  costs.
                </li>
              </ul>
            </div>
            <div className="mt-4 text-gray-600 text-xs">
              <p className="font-bold text-[#2F2FFB]">Source:</p>
              <a
                href="#"
                className="text-[#2F2FFB] underline hover:text-blue-800 transition-colors"
              >
                SEBI study dated January 25, 2023 on &quot;Analysis of Profit
                and Loss of Individual Traders dealing in Equity Futures &
                Options (F&O) Segment&quot;
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExpertRecommendations;
