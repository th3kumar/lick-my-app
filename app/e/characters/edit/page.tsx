"use client";
import { useSearchParams } from "next/navigation";
import { PhoneCharacterSheet } from "@/components/lma/phone-character-sheet";

export default function EditCharacterPage() {
  const id = useSearchParams().get("c");
  return <PhoneCharacterSheet id={id} />;
}
