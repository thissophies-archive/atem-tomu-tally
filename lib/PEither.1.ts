import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";

export type PEither<Error, Result> = Promise<E.Either<Error, Result>>;

export type PEitherO<Error, Result> = Promise<
  E.Either<Error, O.Option<Result>>
>;
