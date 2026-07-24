export const updateLead = async (
  status: string,
  serviceId: string,
  token: string,
  type: "service" | "portfolio"
) => {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/leads/update`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ serviceId, status, type }),
      }
    );
  } catch (err) {
    console.error("Lead update failed:", err);
  }
};
