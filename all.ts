import usb from "usb";
import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { findAllByIds, getSerialNumberForClosedDevice } from "./lib/usb";
import { pipe } from "fp-ts/lib/pipeable";
import { Predicate } from "fp-ts/lib/function";
import { getStructEq, eqString } from "fp-ts/lib/Eq";

// usb.setDebugLevel(4);

type DeviceWithSerial = {
  device: usb.Device;
  serial: string;
};

const findSerialNumberForClosedDevice = (
  device: usb.Device
): TE.TaskEither<Error, DeviceWithSerial> =>
  pipe(
    device,
    getSerialNumberForClosedDevice,
    TE.map((serial) => ({ device, serial }))
  );

const traverseTESeq = A.array.traverse(TE.taskEitherSeq);

const findAllSerialNumbers = (
  devices: usb.Device[]
): TE.TaskEither<Error, DeviceWithSerial[]> =>
  traverseTESeq(devices, findSerialNumberForClosedDevice);

const findSerial = (matchingSerial: string): Predicate<DeviceWithSerial> => ({
  serial,
}: {
  serial: string;
}): boolean => serial === matchingSerial;

const x = getStructEq({ serial: eqString });

x.equals({ serial: "bob " }, { serial: "not-bob" });

const findDeviceWithSerial = (
  vendorId: number,
  productId: number,
  serial: string
): TE.TaskEither<Error, DeviceWithSerial> =>
  pipe(
    findAllByIds(vendorId, productId),
    findAllSerialNumbers,
    TE.map(A.findFirst(findSerial(serial))),
    TE.chain(TE.fromOption(() => E.toError("Not found")))
  );

(async (): Promise<void> => {
  const before = process.hrtime();
  await pipe(
    findDeviceWithSerial(
      0x1209,
      0x70b1,
      "70D3B819-BC54-476C-8E2C-FC6A6BFD8E2B"
    ),
    TE.bimap(
      (error) => console.log(`[Error] ${error}`),
      ({ device, serial }) => console.log(`[Found] ${serial}`, device)
    )
  )();

  const after = process.hrtime(before);

  console.log(`[Debug] Took ${after}`);
})();
