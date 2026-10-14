"use client";
// P5 on the phone: sheet over My characters. ✓ → commit bounce → sheet exits → list.
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePhone } from "./phone";
import { CharacterEditor, type EditorSave } from "./character-editor";
import { SheetFrame, useSheetExit } from "./ui";
import * as api from "@/lib/lick-my-app/api";
import { mediaPath, upload } from "@/lib/lick-my-app/upload";

export function PhoneCharacterSheet({ id }: { id: string | null }) {
  const router = useRouter();
  const { slug, event, token, characters, accent, refresh } = usePhone();
  const list = `/e/${slug}/characters`;
  const { exit, run } = useSheetExit(() => router.replace(list)); // the sheet already animated out

  const existing = id ? characters.find((c) => c.id === id) ?? null : null;
  const max = event?.settings.max_chars ?? 4;
  // decided once on open, so saving the last allowed character doesn't yank the sheet mid-exit
  const decided = useRef<boolean | null>(null);
  if (decided.current === null && event && token) {
    decided.current = event.locked || (id ? !existing : characters.length >= max);
  }
  const blocked = decided.current !== false;
  const position = useRef(id ? characters.findIndex((c) => c.id === id) + 1 : characters.length + 1).current;

  // stale link (deleted, locked, at max): back to the list
  useEffect(() => {
    if (decided.current === true) router.replace(list);
  }, [event, blocked, list, router]);

  if (!event || !token || blocked) return null;

  const save = async (v: EditorSave) => {
    let thumb = existing?.thumb_url ?? "";
    if (v.thumbBlob) thumb = await upload(mediaPath(`${event.id}/thumbs`, "jpg"), v.thumbBlob, "image/jpeg").promise;
    await api.saveCharacter(token, id, v.name, thumb, v.media);
    await refresh();
    run("commit");
  };

  return (
    <SheetFrame exit={exit} onScrim={() => run("cancel")} label={id ? "Edit character" : "New character"}>
      <CharacterEditor
        key={id ?? "new"}
        initial={existing}
        title={id ? "Edit character" : "New character"}
        counter={`${position} of ${max}`}
        accent={accent}
        maxSeconds={event.settings.montage_max_s}
        montageRequired={event.settings.montage_required}
        scope={event.id}
        checkName={(name) => api.characterNameTaken(token, name, id)}
        onSave={save}
        onCancel={() => run("cancel")}
        exit={exit}
      />
    </SheetFrame>
  );
}
