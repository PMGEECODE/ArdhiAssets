// src/types/nprogress.d.ts
declare module "nprogress" {
  export function start(): void;
  export function done(): void;
  export function set(n: number): void;
  export function inc(amount?: number): void;
  export function configure(options: {
    minimum?: number;
    easing?: string;
    speed?: number;
    trickle?: boolean;
    trickleRate?: number;
    trickleSpeed?: number;
    showSpinner?: boolean;
  }): void;
}
