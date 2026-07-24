export default function layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="pb-5">{children}</div>
    </div>
  );
}
