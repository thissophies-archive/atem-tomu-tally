import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";

export const eitherFromCallback = <E, A>(
  left: E | undefined,
  right: A | undefined
): E.Either<E, O.Option<A>> => {
  if (left !== undefined) {
    return E.left(left);
  } else {
    return E.right(O.fromNullable(right));
  }
};

export const eitherFromCallbackV = <E>(
  left: E | undefined
): E.Either<E, void> => {
  if (left !== undefined) {
    return E.left(left);
  } else {
    return E.right(undefined);
  }
};
