import { DocumentPoint } from "@/components";

export default function page() {
  return (
    <div className="dark:bg-blackShade min-h-screen pt-10">
      <div className="bg-white dark:bg-black p-10 w-[90%] mx-auto">
        {" "}
        <h1 className="font-bold text-2xl">Privacy Policy</h1>
        <div>
          <br />
          [Tradeboxlive.com]
          <br /> Tradebox Fintech Solution Pvt Ltd, <br /> Website:
          www.tradeboxlive.com | Email: info@tradeboxlive.com
          <DocumentPoint
            title={"Privacy Policy"}
            desc={
              "The website/Mobile Application “www.tradeboxlive.com”/“Tradeboxlive” (The Platform or the Company) is a trade name of Tradebox Fintech Solution Pvt Ltd. Tradeboxlive is committed to protecting the privacy and confidentiality of its users' personal and other information shared on its platform."
            }
            sub="This privacy policy applies to www.tradeboxlive.com and outlines how Tradeboxlive collects, uses, and protects the information provided by users and members."
          />
          <DocumentPoint
            title={"Personal Information"}
            desc={`To provide services effectively, Tradeboxlive may require users to enroll and register on the website. Upon registration, users may be asked to provide personal information such as name, email address, gender, date of birth, postal address, phone number, login credentials, income tax details, marital status, family details, business information, and other details via application forms, emails, or other mediums ("Personally Identifiable Information"). Additionally, Tradeboxlive may collect service-specific information each time a user accesses the platform, including bank statements, KYC documents, personal and business details, among others ("Service Information").`}
          />
          <DocumentPoint
            title={"User Information"}
            desc={`Users may also share feedback, suggestions, opinions, etc., on Tradeboxlive's platform, which may be considered as "User Information." While such information is publicly available on discussion forums or other pages of the website, users are advised to exercise discretion.`}
          />
          <DocumentPoint
            title={"Protection of Information"}
            desc={
              "Tradeboxlive endeavors to protect users' Personally Identifiable Information and Service Information with a high level of care to prevent unauthorized access, dissemination, or publication. The information collected is utilized for internal record keeping, improving products and services, and enhancing customer satisfaction."
            }
          />
          <DocumentPoint
            title={"Data Security Measures"}
            desc={
              "Tradeboxlive implements various security measures to safeguard users' Personally Identifiable Information and Service Information, ensuring it is not compromised at any level. The platform uses encryption and other industry-standard security practices to prevent unauthorized access."
            }
          />
          <DocumentPoint
            title={"Information Usage"}
            desc={
              "The information collected from users is used to support interaction with Tradeboxlive, offer services effectively, and contact users about other relevant products or services. Tradeboxlive may conduct data analysis, research, and share information with authorized third parties for service facilitation."
            }
          />
          <DocumentPoint
            title={"Changes to Privacy Policy"}
            desc={
              "Tradeboxlive reserves the right to change or update this Privacy Policy at any time, with such changes being notified through posting on the website. Continued use of the platform implies consent to the updated Privacy Policy."
            }
            sub="For any inquiries regarding this Privacy Policy or dealings with Tradeboxlive, please contact us at info@tradeboxlive.com "
          />
        </div>
      </div>
    </div>
  );
}
