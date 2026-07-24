import axios from "axios";
import { parseStringPromise } from "xml2js";

type Address = {
  addressLine1: string;
  addressLine2: string;
  cityStateZip: string;
};

async function extractAddressFromXML(xmlUrl: string): Promise<Address | null> {
  try {
    // Step 1: Download the XML file from S3
    // console.log(xmlUrl);
    const response = await axios.get(xmlUrl, { responseType: "text" });
    const xmlData = response.data;

    if (!xmlData) {
      console.log("xmlData not found");
    }

    // Step 2: Parse the XML data
    const jsonResult = await parseStringPromise(xmlData);

    if (!jsonResult) {
      console.log("jsonResult not found");
    }

    // console.log(
    //   "this is the json result certificate data kycres uidData dist: ",
    //   jsonResult.Certificate.CertificateData[0].KycRes[0].UidData[0].Poa[0].$
    // );

    // Step 3: Extract address details (Modify based on your XML structure)
    const address =
      jsonResult.Certificate.CertificateData[0].KycRes[0].UidData[0].Poa[0].$;

    if (!address) {
      throw new Error("Address not found in XML");
    }

    // Extract individual fields
    const house = address.house || "";
    const street = address.street || "";
    const landmark = address.lm || "";
    const locality = address.loc || "";
    const village = address.vtc || "";
    const district = address.dist || "";
    const state = address.state || "";
    const pincode = address.pc || "";

    // Construct Address Lines
    let addressLine1 = [house, street, landmark].filter(Boolean).join(", ");
    let addressLine2 = [locality, village, district].filter(Boolean).join(", ");
    let cityStateZip = [village || district, state, pincode]
      .filter(Boolean)
      .join(", ");

    // Ensure address lines are not empty
    addressLine1 = addressLine1 || "N/A";
    addressLine2 = addressLine2 || "N/A";
    cityStateZip = cityStateZip || "N/A";

    return {
      addressLine1,
      addressLine2,
      cityStateZip,
    };
  } catch (error) {
    console.error("Error extracting address:", error);
    return null;
  }
}

export default extractAddressFromXML;
