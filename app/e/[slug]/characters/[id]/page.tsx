"use client";
import { useParams } from "next/navigation";
import { PhoneCharacterSheet } from "@/components/lma/phone-character-sheet";

export default function EditCharacterPage() {
  const { id } = useParams<{ id: string }>();
  return <PhoneCharacterSheet id={id} />;
}
