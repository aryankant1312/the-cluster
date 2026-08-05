import { redirect } from "next/navigation";
import { getPersonaFromCookie } from "@/lib/session";

export default async function RootPage() {
  const persona = await getPersonaFromCookie();
  if (persona) {
    redirect(`/${persona}`);
  }
  redirect("/enter");
}
