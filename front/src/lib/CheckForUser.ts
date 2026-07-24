export async function checkSPisInDB(id: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${id}`,
      { method: "GET" }
    );

    if (!res.ok) {
      console.error(`Error: ${res.status} - ${res.statusText}`);
      return false;
    }

    const rawData = await res.json();

    if (rawData.data === null) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("An error occurred during the fetch operation:", error);
    return false;
  }
} 

export async function checkSPisVerified(id: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/checkspverified?id=${id}`,
      { method: "GET" }
    );

    if (res.status !== 200) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("An error occurred during the fetch operation:", error);
    return false;
  }
}
