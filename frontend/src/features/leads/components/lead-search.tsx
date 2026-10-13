"use client";

import { SearchIcon, XIcon } from "lucide-react";
import type { KeyboardEvent, Ref } from "react";

import { Kbd } from "@/components/common/kbd";
import { Input } from "@/components/ui/input";
import { COPY } from "@/config/copy";
import { LIMITS } from "@/config/limits";

type LeadSearchProps = {
  value: string;
  onChange: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
};

export function LeadSearch({ value, onChange, inputRef }: LeadSearchProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (value) {
        onChange("");
      } else {
        event.currentTarget.blur();
      }
    }
  }

  return (
    <div role="search" className="group relative">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={COPY.search.placeholder}
        aria-label={COPY.search.label}
        maxLength={LIMITS.searchMaxLength}
        autoComplete="off"
        spellCheck={false}
        className="bg-surface pr-10 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={COPY.search.clear}
          className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        >
          <XIcon aria-hidden className="size-4" />
        </button>
      ) : (
        <Kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 group-focus-within:hidden sm:inline-flex">
          /
        </Kbd>
      )}
    </div>
  );
}
