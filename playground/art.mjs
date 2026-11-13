// Shared artwork for the illustrative film and executable experiments.
export const svg = content => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
export const icons = {
  pause: svg('<path d="M9 5v14M15 5v14"/>'),
  play: svg('<path d="m9 5 10 7-10 7Z"/>'),
  replay: svg('<path d="M4 9a8 8 0 1 1 0 6M4 3v6h6"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>'),
  github: svg('<path d="M9 19c-4 1-4-2-6-2m12 5v-4a3.5 3.5 0 0 0-1-2.7c3.3-.4 6.8-1.6 6.8-7.3A5.7 5.7 0 0 0 19.3 4a5.2 5.2 0 0 0-.1-4s-1.3-.4-4.2 1.5a14.5 14.5 0 0 0-7.5 0C4.6-.4 3.3 0 3.3 0a5.2 5.2 0 0 0-.1 4 5.7 5.7 0 0 0-1.5 4c0 5.7 3.5 6.9 6.8 7.3A3.5 3.5 0 0 0 7.5 18v4" transform="translate(2 2) scale(.85)"/>'),
};
export const check = (x, y, size = 1) => `<path class="check" d="m-6 0 4 4 9-9" transform="translate(${x} ${y}) scale(${size})"/>`;
export const person = (x, y, size = 1) => `<g transform="translate(${x} ${y}) scale(${size})"><circle class="face" cy="-9" r="10"/><path class="shoulders" d="M-20 20a20 20 0 0 1 40 0"/></g>`;
export const google = (x, y, size = 1) => `<g transform="translate(${x} ${y}) scale(${size})"><path fill="#4285f4" d="M20 0c0-1.4-.1-2.7-.4-4H0v8h11.2a9.6 9.6 0 0 1-4.2 6.3v5.2h6.8C17.8 11.8 20 6.5 20 0Z"/><path fill="#34a853" d="M0 20c5.6 0 10.4-1.9 13.8-5.1L7 9.7c-1.9 1.3-4.3 2-7 2-5.4 0-9.9-3.6-11.5-8.5h-7v5.4A20.8 20.8 0 0 0 0 20Z"/><path fill="#fbbc05" d="M-11.5 3.2a12.5 12.5 0 0 1 0-7.4v-5.4h-7a20.8 20.8 0 0 0 0 18.2Z"/><path fill="#ea4335" d="M0-13c3 0 5.6 1 7.7 3l5.8-5.8A20.5 20.5 0 0 0-18.5-9.6l7 5.4C-9.9-9.3-5.4-13 0-13Z"/></g>`;
export const lock = (x, y) => `<g class="lock" transform="translate(${x} ${y})"><rect x="-9" y="-2" width="18" height="15" rx="4"/><path d="M-5-2v-5a5 5 0 0 1 10 0v5"/><circle cy="5" r="1"/></g>`;
export const credit = (x, y, size = 1) => `<g transform="translate(${x} ${y}) scale(${size})"><rect class="credit" x="-30" y="-19" width="60" height="38" rx="6"/><path class="card-line" d="M-30-7h60M-20 10h10"/><rect class="chip" x="10" y="3" width="10" height="8" rx="2"/></g>`;
export const sliders = (x, y) => `<g class="sliders" transform="translate(${x} ${y})"><path d="M-17-12h34M-17 0h34M-17 12h34"/><circle cx="-7" cy="-12" r="4"/><circle cx="10" r="4"/><circle cx="-3" cy="12" r="4"/></g>`;
export const toggle = (x, y, on = false) => `<g transform="translate(${x} ${y})"><rect class="switch ${on ? 'on' : ''}" x="-22" y="-12" width="44" height="24" rx="12"/><circle class="knob" cx="${on ? 10 : -10}" r="8"/></g>`;
export const skeleton = (x, y, width) => `<rect class="skeleton" x="${x}" y="${y}" width="${width}" height="5" rx="2.5"/>`;
export const browser = `<rect class="window" x="24" y="25" width="312" height="218" rx="13"/><path class="hairline" d="M24 54h312"/><g class="dots"><circle cx="40" cy="40" r="2.5"/><circle cx="50" cy="40" r="2.5"/><circle cx="60" cy="40" r="2.5"/></g><rect class="address" x="133" y="36" width="94" height="8" rx="4"/>`;
export const cursor = `<g class="cursor"><circle class="click-ring" r="14"/><path d="M0 0v23l6-6 5 11 4-2-5-10h10Z"/></g>`;
export const success = `<circle class="success-halo" cx="180" cy="144" r="46"/>`;
