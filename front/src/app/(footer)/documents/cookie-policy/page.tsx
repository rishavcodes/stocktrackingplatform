import { DocumentPoint } from "@/components";

export default function page() {
  return (
    <div className="dark:bg-blackShade pt-10">
      <div className="bg-white dark:bg-black w-[90%] mx-auto min-h-screen p-10">
        {" "}
        <h1 className="font-bold text-2xl">Cookies Policy</h1>
        <br />
        <DocumentPoint
          title={"1. Introduction"}
          desc={`Welcome to Tradeboxlive.com, operated by Tradebox Fintech Solution Pvt Ltd ("Tradebox," "we," "us," or "our"). This Cookies Policy explains how we use cookies and similar tracking technologies when you visit our website, Tradeboxlive.com (the "Site"), or use our services. By accessing or using our Site, you consent to the use of cookies as described in this policy.`}
        />
        <DocumentPoint
          title={"2. What are Cookies?"}
          desc={
            "Cookies are small pieces of data stored on your device (computer, smartphone, tablet, etc.) when you browse the internet. They are used to remember user preferences, enhance user experience, and gather information about website usage."
          }
        />
        <DocumentPoint
          title={"3. How We Use Cookies"}
          desc={
            "At Tradebox, we use cookies primarily to provide you with a seamless and personalized experience on our Site. We only store authentication data from customers and service providers to ensure secure access to our services. The cookies we use fall into the following categories:"
          }
        />
        <br />
        <div>
          <span className="font-bold">Authentication Cookies:</span> These
          cookies are essential for providing authentication services to our
          customers and service providers. They allow users to log in securely
          and access their accounts.
        </div>
        <br />
        <div>
          <span className="font-bold">Preference Cookies:</span> Preference
          cookies enable us to remember your preferences and settings, such as
          language preferences, font size, and display settings, to provide you
          with a customized browsing experience.
        </div>
        <br />
        <div>
          <span className="font-bold">Analytics Cookies:</span> We may use
          analytics cookies to collect information about how you interact with
          our Site, such as which pages you visit and how long you spend on each
          page. This helps us analyze and improve the performance and usability
          of our Site.
        </div>
        <DocumentPoint
          title={"4. Third-Party Cookies"}
          desc={
            "We may also allow third-party service providers, such as Google Analytics, to set cookies on our Site to help us analyze website traffic and usage patterns. These cookies are subject to the respective privacy policies of these third-party providers."
          }
        />
        <DocumentPoint
          title={"5. Managing Cookies"}
          desc={
            "You have the option to manage cookies through your browser settings. Most web browsers allow you to control cookies through their settings preferences. However, please note that disabling cookies may impact the functionality and user experience of our Site."
          }
        />
        <DocumentPoint
          title={"6. Updates to this Policy"}
          desc={
            "We may update this Cookies Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We encourage you to review this policy periodically for any updates."
          }
        />
        <DocumentPoint
          title={"7. Contact Us"}
          desc={
            "If you have any questions or concerns about our use of cookies or this Cookies Policy, please contact us at info@tradeboxlive.com."
          }
        />
        <DocumentPoint
          title={"8. Consent"}
          desc={
            "By continuing to use our Site, you consent to the use of cookies as described in this policy."
          }
        />
      </div>
    </div>
  );
}
