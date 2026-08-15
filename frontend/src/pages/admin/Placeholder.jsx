import AdminLayout from "../../components/layout/AdminLayout";
import { Wrench } from "lucide-react";

export default function AdminPlaceholder({ title, description }) {
  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-2">Em breve</div>
        <h1 className="font-display text-4xl">{title}</h1>
      </div>
      <div className="vs-card p-10 text-center max-w-2xl">
        <Wrench className="mx-auto text-[#CCFF00] mb-3" />
        <p className="text-white/70">{description}</p>
      </div>
    </AdminLayout>
  );
}
