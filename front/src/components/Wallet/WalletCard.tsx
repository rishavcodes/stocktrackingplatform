import WithdrawButton from "./WithdrawButton";
import AddMoney from "./AddMoney";

export type transactionsType = {
  _id: string;
  orderdBy?: { name: string; id: string };
  serviceName?: string;
  amount: number;
  processedStatus: String;
  referenceNo?: string;
  type?: string;
  paymentId: string;
  paymentMethod: string;
  createdAt: string;
  paymentProof: string;
  invoiceLink: string;
  verifiedByRa: boolean;
};

async function fetchWallet(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/walletbalance?id=${id}`
    );

    if (response.status !== 200) {
      return 0;
    }

    const res = await response.json();
    return res.data;
  } catch (error) {
    return 0;
  }
}

export default async function WalletCard({
  id,
  isWithdrawButton = false,
}: {
  id: string;
  isWithdrawButton?: boolean;
}) {

  const walletbalance = await fetchWallet(id);

  return (
    <div>
      {" "}
      <div className="dark:bg-black bg-white flex justify-between sm:flex-row flex-col rounded-xl m-5">
        <div className="flex flex-col gap-3 xs:p-10 p-5">
          {isWithdrawButton && (
            <>
              <WithdrawButton balance={walletbalance.walletbalance} />
            </>
          )}
        </div>

        <div className="bg-green sm:rounded-l-full rounded-xl text-darkGreen flex flex-col sm:w-[40%] w-full justify-center items-center">
          <div className="md:text-[50px] ss:text-[45px] xs:text-[40px] text-[35px] font-bold xs:px-10 px-5">
            ₹{Math.floor(walletbalance.WalletBalance)}
          </div>
          <div className="md:text-[25px] ss:text-[20px] xs:text-[15px] text-[13px] font-semibold">
            Wallets Balance
          </div>
        </div>
      </div>
    </div>
  );
}
