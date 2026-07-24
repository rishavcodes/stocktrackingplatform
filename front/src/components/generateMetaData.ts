import { Metadata, ResolvingMetadata } from "next";

export async function generateMetadata(
  { params }: { params: { id: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;

  const product = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/articledetail?id=${id}`
  ).then((res) => res.json());

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: {
      absolute: `Tradebox | ${
        product.article.title.split(" ").slice(0, 5).join(" ") + "...."
      }`,
    },
    description:
      product.article.content.split(" ").slice(0, 20).join(" ") + "....",
    openGraph: {
      images: [product.article.image, ...previousImages],
    },
  };
}
