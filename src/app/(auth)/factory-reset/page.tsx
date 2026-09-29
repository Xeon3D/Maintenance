import { notFound } from "next/navigation";
import { factoryResetEnabled } from "@/lib/factory-reset";
import { FactoryResetForm } from "../auth-forms";

export default function FactoryResetPage() {
  if (!factoryResetEnabled()) notFound();
  return <FactoryResetForm />;
}
