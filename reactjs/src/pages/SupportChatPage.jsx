import SupportChatWidget from "../components/SupportChatWidget";
import { ui } from "../ui";

export default function SupportChatPage() {
  return (
    <main className={ui.page}>
      <SupportChatWidget mode="page" />
    </main>
  );
}
