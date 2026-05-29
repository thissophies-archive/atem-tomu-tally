import * as E from "fp-ts/lib/Either";
import { eitherFromCallback, eitherFromCallbackV } from "./eitherFromCallback";
import { PEitherO, PEither } from "./PEither.1";

export const taskify = <E, A>(
  fn: (resolver: (left: E | undefined, right: A | undefined) => void) => void
): (() => PEitherO<E, A>) => (): PEitherO<E, A> =>
  new Promise((resolve) =>
    fn((left, right) => resolve(eitherFromCallback<E, A>(left, right)))
  );

export const taskifyV = <E>(
  fn: (resolver: (left: E | undefined) => void) => void
): (() => PEither<E, void>) => (): PEither<E, void> =>
  new Promise((resolve) => fn((left) => resolve(eitherFromCallbackV<E>(left))));
