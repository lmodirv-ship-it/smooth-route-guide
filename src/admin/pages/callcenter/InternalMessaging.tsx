import InternalChat from "@/components/InternalChat";
import { MessageSquare } from "lucide-react";

const InternalMessaging = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 justify-end">
        <h1 className="text-xl font-bold text-foreground">المحادثات الداخلية</h1>
        <MessageSquare className="w-5 h-5 text-primary" />
      </div>
      <InternalChat />
    </div>
  );
};

export default InternalMessaging;
