import usb from "usb";
import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";
import * as P from "fp-ts/lib/pipeable";

import { log } from "./log";
import { taskify, taskifyV } from "./taskEitherify";

export const findAllByIds = (vid: number, pid: number): usb.Device[] =>
  P.pipe(
    usb.getDeviceList(),
    A.filter(
      ({ deviceDescriptor: { idVendor, idProduct } }) =>
        idVendor === vid && idProduct === pid
    )
  );

export const openDevice = (
  device: usb.Device
): TE.TaskEither<Error, usb.Device> =>
  TE.fromEither(
    E.tryCatch(() => {
      device.open();

      return device;
    }, E.toError)
  );

const closeDevice = (device: usb.Device): TE.TaskEither<Error, void> =>
  TE.fromEither(E.tryCatch(() => device.close(), E.toError));

export const withOpenDevice = <L, R>(
  fn: (device: usb.Device) => TE.TaskEither<L | Error, R>
) => (device: usb.Device): TE.TaskEither<L | Error, R> =>
  TE.bracket(openDevice(device), fn, closeDevice);

export const setConfiguration = (
  device: usb.Device,
  configuration: number
): TE.TaskEither<Error, void> =>
  P.pipe(
    taskifyV(device.setConfiguration.bind(device, configuration)),
    TE.mapLeft(E.toError)
  );

const controlTransfer = (
  device: usb.Device,
  bmRequestType: number,
  bRequest: number,
  wValue: number,
  wIndex: number,
  dataOrLength: Buffer | number
): TE.TaskEither<usb.LibUSBException, O.Option<Buffer>> =>
  P.pipe(
    taskify<usb.LibUSBException, Buffer>((resolve) =>
      device.controlTransfer(
        bmRequestType,
        bRequest,
        wValue,
        wIndex,
        dataOrLength,
        resolve
      )
    ),
    TE.bimap(
      (error) => {
        log("USB", "controlTransfer: Error", error);
        return error;
      },
      (data) => {
        log("USB", "controlTransfer: Ok", data);
        return data;
      }
    )
  );

const getStringDescriptor = (
  device: usb.Device,
  index: number
): TE.TaskEither<Error, O.Option<string>> =>
  P.pipe(
    taskify(device.getStringDescriptor.bind(device, index)),
    TE.bimap(
      (error) =>
        E.toError(`Unable to get string descriptor ${index}: ${error}`),
      O.map((b) => b.toString())
    )
  );

export enum TallyState {
  Off = "Off",
  Green = "Green",
  Red = "Red",
  GreenRed = "GreenRed",
}

const usbStateFromTallyState = (state: TallyState): number => {
  switch (state) {
    case TallyState.Off:
      return 0;
    case TallyState.Green:
      return 1;
    case TallyState.Red:
      return 2;
    case TallyState.GreenRed:
      return 3;
  }
};

const writeValueToState = (device: usb.Device) => (
  state: number
): TE.TaskEither<usb.LibUSBException, undefined> =>
  P.pipe(
    controlTransfer(device, 0x40, 0, state, 0, Buffer.alloc(0)),
    TE.map(() => undefined)
  );

export const setState = (
  device: usb.Device,
  state: TallyState
): TE.TaskEither<usb.LibUSBException, void> =>
  P.pipe(state, usbStateFromTallyState, writeValueToState(device));

export const getSerialNumber = (
  device: usb.Device
): TE.TaskEither<Error, string> =>
  P.pipe(
    getStringDescriptor(device, device.deviceDescriptor.iSerialNumber),
    TE.chain(TE.fromOption(() => new Error("Empty serial number")))
  );

export const getSerialNumberForClosedDevice = withOpenDevice(getSerialNumber);
