export function DocumentPoint({
  title,
  desc,
  sub,
}: {
  title: string;
  desc: string;
  sub?: string;
}) {
  return (
    <div>
      <br />

      <span className="font-bold">{title}</span>
      <br />
      {desc}
      {sub && (
        <>
          <br />
          <br />
          {sub}
        </>
      )}
    </div>
  );
}
