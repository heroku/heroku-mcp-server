/**
 *     MIT License

    Copyright (c) Microsoft Corporation.

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE

 */
/// <reference types="node" />

/**
 * This file was edited by the Heroku team to include a fix for typescript 5.5+
 * It may be possible to re-visit this in the future if the @types/tar-stream
 * version is updated to include the fix.
 */
declare module 'tar-stream' {
  import stream = require('stream');

  export type Callback = (err?: Error | null) => any;

  // see https://github.com/mafintosh/tar-stream/blob/master/headers.js
  export interface Headers {
    name: string;
    mode?: number | undefined;
    uid?: number | undefined;
    gid?: number | undefined;
    size?: number | undefined;
    mtime?: Date | undefined;
    linkname?: string | null | undefined;
    type?:
      | 'file'
      | 'link'
      | 'symlink'
      | 'character-device'
      | 'block-device'
      | 'directory'
      | 'fifo'
      | 'contiguous-file'
      | 'pax-header'
      | 'pax-global-header'
      | 'gnu-long-link-path'
      | 'gnu-long-path'
      | null
      | undefined;
    uname?: string | undefined;
    gname?: string | undefined;
    devmajor?: number | undefined;
    devminor?: number | undefined;
  }

  export interface Pack extends stream.Readable {
    /**
     * To create a pack stream use tar.pack() and call pack.entry(header, [callback]) to add tar entries.
     */
    entry(headers: Headers, callback?: Callback): stream.Writable;
    entry(headers: Headers, buffer?: string | Buffer, callback?: Callback): stream.Writable;
    finalize(): void;
  }

  export interface Entry extends stream.Readable {
    header: Headers;
  }

  export interface Extract extends stream.Writable {
    on(event: string, listener: (...args: any[]) => void): this;
    on(
      event: 'entry',
      listener: (headers: Headers, stream: stream.PassThrough, next: (error?: unknown) => void) => void
    ): this;
    [Symbol.asyncIterator](): AsyncIterator<Entry>;
  }

  export interface ExtractOptions extends stream.WritableOptions {
    /**
     * Whether or not to attempt to extract a file that does not have an
     * officially supported format in the `magic` header, such as `ustar`.
     */
    allowUnknownFormat?: boolean | undefined;
    /**
     * The encoding of the file name header.
     */
    filenameEncoding?: BufferEncoding | undefined;
  }
  export function extract(opts?: ExtractOptions): Extract;

  export function pack(opts?: stream.ReadableOptions): Pack;
}
