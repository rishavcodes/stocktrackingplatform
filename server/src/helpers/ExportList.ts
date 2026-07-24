import fs from "node:fs";

export async function GenerateList() {
  try {
    fs.readFile("list.json", "utf8", (err, data) => {
      if (err) {
        console.error(err);
        return;
      }

      const jsonData = JSON.parse(data);

      const filteredData = jsonData.filter(
        (item: {
          exch_seg: any;
          instrumenttype: any;
          expiry: any;
          symbol: any;
        }) => item.exch_seg === "NSE"
      );

      // console.log(filteredData);

      const extractedData = filteredData.map(
        (item: { name: any; token: any; exch_seg: any; symbol: any }) => ({
          name: item.symbol,
          token: item.token,
          exch: item.exch_seg,
        })
      );

      const jsonOutput = JSON.stringify(extractedData, null, 2);

      fs.writeFile("extractedData.json", jsonOutput, "utf8", (err) => {
        if (err) {
          console.error("Error writing to file:", err);
        } else {
          // console.log("Data saved to extractedData.json");
        }
      });
    });
  } catch (error) {
    console.error("An error occurred:", error);
    throw error;
  }
}
