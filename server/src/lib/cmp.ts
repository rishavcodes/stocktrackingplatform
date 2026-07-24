export const fetchCMP = async (payload: {
  token: string[];
  exchange: string;
}) => {
  try {
    const response = await fetch(
      `https://tradebox-yj8v.onrender.com/api/scorecard/getcmp`,
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const data = await response.json();
    if (data?.success) {
      return {
        success: true,
        data: data.data,
      };
    } else {
      return {
        success: false,
        data: null,
      };
    }
  } catch (error) {
    console.error("Error fetching CMP:", error);
    return {
      success: false,
      data: null,
    };
  }
};
