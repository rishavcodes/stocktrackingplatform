export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Withdrawals
        </h1>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}
