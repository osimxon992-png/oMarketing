import { requireShop } from "@/lib/auth/session";
import { features } from "@/lib/env";
import { AssistantChat } from "./assistant-chat";

export const metadata = { title: "AI yordamchi" };

export default async function AssistantPage() {
  const { shop } = await requireShop();
  return <AssistantChat shopId={shop.id} shopName={shop.name} configured={features().ai} />;
}
