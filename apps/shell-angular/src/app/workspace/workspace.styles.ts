export const workspaceStyles = `
  :host { display: block; min-height: 100vh; background: #f4f4f4; }
  .ws-shell { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
  .ws-side { background: #161616; color: #f4f4f4; padding: 0; display: flex; flex-direction: column; }
  .ws-side .brand { padding: 1rem 1rem; border-bottom: 1px solid #393939; font-weight: 600;
    font-size: 0.875rem; letter-spacing: 0.16px; }
  .ws-side .brand small { color: #c6c6c6; font-weight: 400; margin-left: 0.5rem; }
  .ws-side .pillar-label { padding: 0.75rem 1rem 0.25rem; font-size: 0.6875rem;
    text-transform: uppercase; letter-spacing: 0.32px; color: #8d8d8d; }
  .ws-side a { display: flex; align-items: center; gap: 0.5rem;
    padding: 0.625rem 1rem; color: #f4f4f4; text-decoration: none; font-size: 0.8125rem;
    border-left: 3px solid transparent; }
  .ws-side a:hover { background: #262626; }
  .ws-side a.active { background: #262626; border-left-color: #0f62fe; color: #fff; }
  .ws-side .footer { margin-top: auto; padding: 1rem; border-top: 1px solid #393939;
    font-size: 0.75rem; color: #c6c6c6; }
  .ws-main { padding: 0; background: #f4f4f4; min-width: 0; }
  .ws-topbar { display: flex; align-items: center; justify-content: space-between;
    padding: 0.75rem 1.5rem; background: #fff; border-bottom: 1px solid #e0e0e0; }
  .ws-topbar .who { font-size: 0.8125rem; color: #525252; }
  .ws-topbar .who strong { color: #161616; }
  .ws-topbar button { background: transparent; border: 1px solid #e0e0e0; padding: 0.4rem 0.875rem;
    cursor: pointer; font-size: 0.8125rem; }
  .ws-topbar button:hover { background: #f4f4f4; }
  .ws-content { padding: 1.5rem; max-width: 1400px; }
  .page-h { font-size: 1.5rem; font-weight: 300; margin: 0 0 0.25rem; }
  .page-sub { color: #525252; font-size: 0.875rem; margin: 0 0 1.25rem; }
  .panel { background: #fff; border: 1px solid #e0e0e0; padding: 1.25rem 1.5rem; margin-bottom: 1rem; }
  .panel h3 { margin: 0 0 1rem; font-size: 1rem; font-weight: 600; }
  .grid2 { display: grid; gap: 1rem; grid-template-columns: 1fr 1fr; }
  @media (max-width: 1100px) { .grid2 { grid-template-columns: 1fr; } }
  .field { display: flex; flex-direction: column; margin-bottom: 0.75rem; }
  .field label { font-size: 0.75rem; color: #525252; margin-bottom: 0.25rem; letter-spacing: 0.16px; }
  .field input, .field select, .field textarea { font: inherit; padding: 0.5rem 0.625rem;
    border: 1px solid #8d8d8d; background: #f4f4f4; border-radius: 0; }
  .field input:focus, .field select:focus, .field textarea:focus {
    outline: 2px solid #0f62fe; outline-offset: -2px; background: #fff; }
  .field textarea { font-family: 'IBM Plex Mono', ui-monospace, Consolas, monospace; min-height: 80px; }
  .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .btn-pri { background: #0f62fe; color: #fff; border: 1px solid #0f62fe;
    padding: 0.5rem 1rem; cursor: pointer; font-size: 0.8125rem; }
  .btn-pri:hover { background: #0050e6; }
  .btn-pri:disabled { background: #c6c6c6; border-color: #c6c6c6; cursor: not-allowed; }
  .btn-sec { background: transparent; color: #0f62fe; border: 1px solid #0f62fe;
    padding: 0.5rem 1rem; cursor: pointer; font-size: 0.8125rem; }
  .btn-sec:hover { background: #edf5ff; }
  .btn-dng { background: #da1e28; color: #fff; border: 1px solid #da1e28;
    padding: 0.4rem 0.75rem; cursor: pointer; font-size: 0.75rem; }
  .btn-dng:hover { background: #b81921; }
  .btn-mini { background: transparent; border: 1px solid #8d8d8d; color: #161616;
    padding: 0.3rem 0.625rem; cursor: pointer; font-size: 0.75rem; }
  .btn-mini:hover { background: #e0e0e0; }
  .ok { color: #198038; font-size: 0.8125rem; }
  .err { color: #da1e28; font-size: 0.8125rem; white-space: pre-wrap; word-break: break-word; }
  table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
  th, td { text-align: left; padding: 0.5rem 0.625rem; border-bottom: 1px solid #e0e0e0;
    vertical-align: top; }
  th { background: #f4f4f4; font-weight: 600; color: #161616; font-size: 0.75rem;
    text-transform: uppercase; letter-spacing: 0.16px; }
  tr:hover td { background: #f4f4f4; }
  code { font-family: 'IBM Plex Mono', ui-monospace, Consolas, monospace; font-size: 0.75rem;
    background: #f4f4f4; padding: 1px 4px; }
  pre { font-family: 'IBM Plex Mono', ui-monospace, Consolas, monospace; font-size: 0.75rem;
    background: #161616; color: #f4f4f4; padding: 0.75rem; overflow: auto; max-height: 320px; }
  .badge { display: inline-block; padding: 1px 8px; font-size: 0.6875rem; border-radius: 10px;
    background: #e0e0e0; color: #161616; letter-spacing: 0.16px; }
  .badge.up { background: #defbe6; color: #044317; }
  .badge.down { background: #ffd7d9; color: #750e13; }
  .badge.warn { background: #fcf4d6; color: #684e00; }
  .badge.crit { background: #da1e28; color: #fff; }
  .badge.high { background: #ff8389; color: #2d0709; }
  .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .empty { color: #6f6f6f; font-style: italic; padding: 1rem; }
`;
