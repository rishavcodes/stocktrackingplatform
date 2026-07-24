export default function Page() {
  return (
    <div className="mx-auto w-[90%] mt-24 p-10 flex flex-col gap-5 border bg-white dark:bg-black min-h-screen">
      <h1 className="text-[30px] font-semibold">
        Do&aposs and Don&aposts for Investors
      </h1>

      <div>
        <h2 className="text-[24px] font-medium">Do&aposs</h2>
        <ul className="list-disc pl-5">
          <li>Always deal with SEBI registered Research Analysts.</li>
          <li>
            Ensure that the Research Analyst has a valid registration
            certificate.
          </li>
          <li>Check for SEBI registration number.</li>
          <li>
            Refer to the list of all SEBI registered Research Analysts available
            on the
            <a
              href="https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=14"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              {" "}
              SEBI website
            </a>
            .
          </li>
          <li>
            Always pay attention to disclosures made in research reports before
            investing.
          </li>
          <li>
            Pay your Research Analyst through banking channels only and maintain
            duly signed receipts.
          </li>
          <li>
            Before buying securities or applying in a public offer, check for
            research recommendations.
          </li>
          <li>
            Ask relevant questions and clear doubts with your Research Analyst
            before acting on recommendations.
          </li>
          <li>
            Inform SEBI about Research Analysts offering assured or guaranteed
            returns.
          </li>
        </ul>
      </div>

      <div>
        <h2 className="text-[24px] font-medium">Don’ts</h2>
        <ul className="list-disc pl-5">
          <li>Do not provide funds for investment to the Research Analyst.</li>
          <li>Don’t fall prey to luring advertisements or market rumors.</li>
          <li>
            Do not get attracted to limited-period discounts, incentives, or
            gifts offered by Research Analysts.
          </li>
          <li>
            Do not share login credentials and passwords of your trading and
            demat accounts with the Research Analyst.
          </li>
        </ul>
      </div>
    </div>
  );
}
