"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SubProfileSignupContainer from "@/components/Auth/ServiceProvider/ServiceProviderSignUpForm/ServiceProviderSignUpForm";

export default function SPSubProfilePage() {
  const params = useParams();
  const router = useRouter();

  const [id, setId] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ---------------- GET PARAM ---------------- */

  useEffect(() => {
    if (!params?.id) return;
    setId(params.id as string);
  }, [params]);

  /* ---------------- FETCH MASTER DATA ---------------- */

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/getuserdata?id=${id}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          router.push("/auth/signup/serviceprovider/suberror");
          return;
        }

        const response = await res.json();
        setData(response);
      } catch (error) {
        router.push("/auth/signup/serviceprovider/suberror");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <SubProfileSignupContainer
      masterId={id}
      masterName={data.user.RegName}
    />
  );
}
