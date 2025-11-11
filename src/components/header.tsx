import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="flex h-16 items-center border-b bg-card px-4 md:px-6 shrink-0">
      <h1 className="text-xl font-semibold font-headline">{title}</h1>
      <div className="ml-auto">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          上傳影片
        </Button>
      </div>
    </header>
  );
}
