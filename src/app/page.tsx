import { headers } from "next/headers";
import { redirectTo } from "@/lib/navigation";
import { preferredLocale } from "@/lib/locale";

export default async function RootPage() {
  const acceptLanguage = (await headers()).get("accept-language");
  redirectTo("/" + preferredLocale(acceptLanguage));
}
