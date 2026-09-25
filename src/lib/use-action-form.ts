"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * Like useActionState, but submits via onSubmit so React doesn't reset the form's
 * uncontrolled fields afterwards — users keep their input when validation fails.
 * Usage: const [state, onSubmit, pending] = useActionForm(action); <form onSubmit={onSubmit}>
 */
export function useActionForm<S>(action: (state: Awaited<S>, form: FormData) => S | Promise<S>) {
  // Action states in this app all start as `undefined`.
  const [state, dispatch, pending] = useActionState<S, FormData>(action, undefined as Awaited<S>);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const form = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(form));
  };
  return [state, onSubmit, pending] as const;
}
