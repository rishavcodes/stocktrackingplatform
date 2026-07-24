export default function InfoCard({
  title,
  value,
  bgColor,
}: {
  title: string;
  value: string | number | undefined;
  bgColor: string;
}) {
  return (
    <div
      className={`flex flex-col justify-center items-center ${bgColor} px-10 py-3 rounded-xl text-indigo`}
    >
      <div className="font-semibold text-[20px] dark:text-blue">{title}</div>
      <div className="font-medium dark:text-white/80">{value}</div>
    </div>
  );
}
