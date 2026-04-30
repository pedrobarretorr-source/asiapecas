import { AppLayout } from "@/components/AppLayout";
import { Construction } from "lucide-react";

const ComingSoonPage = ({ title }: { title: string }) => (
  <AppLayout>
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Construction className="h-8 w-8 text-primary" />
      </div>
      <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        Esta funcionalidade está em desenvolvimento e estará disponível em breve na Fase 2.
      </p>
    </div>
  </AppLayout>
);

export default ComingSoonPage;
