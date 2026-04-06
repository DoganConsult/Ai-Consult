declare module 'svg-captcha' {
  export interface CaptchaOptions {
    size?: number;
    ignoreChars?: string;
    noise?: number;
    color?: boolean;
    background?: string;
    width?: number;
    height?: number;
    fontSize?: number;
    charPreset?: string;
  }

  export interface Captcha {
    data: string;
    text: string;
  }

  export function create(options?: CaptchaOptions): Captcha;
}
