// patch trezor-like
import TrezorConnect from '@trezor/connect';
import OneKeyConnect from '@onekeyfe/connect';

(globalThis as any)._TrezorConnect = TrezorConnect;
(globalThis as any)._OnekeyConnect = OneKeyConnect;
