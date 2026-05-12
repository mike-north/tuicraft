// Terminal color schemes. Each theme provides a background, foreground,
// cursor color, the standard ANSI-16 palette, and a `variant` tag
// ('dark' | 'light') so the sidebar can group them.
//
// The whole studio composes against the active theme: xterm renders to
// `background`, the derived palette computes against `background` + the
// ANSI palette, and ANSI-16 color names in user TSX re-map per theme.

export const ANSI_NAMES = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite',
] as const;

export type AnsiName = (typeof ANSI_NAMES)[number];

export type AnsiPalette = Record<AnsiName, string>;

export const ANSI_FG_CODE: Record<AnsiName, number> = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  brightBlack: 90,
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightBlue: 94,
  brightMagenta: 95,
  brightCyan: 96,
  brightWhite: 97,
};

export const ANSI_BG_CODE: Record<AnsiName, number> = {
  black: 40,
  red: 41,
  green: 42,
  yellow: 43,
  blue: 44,
  magenta: 45,
  cyan: 46,
  white: 47,
  brightBlack: 100,
  brightRed: 101,
  brightGreen: 102,
  brightYellow: 103,
  brightBlue: 104,
  brightMagenta: 105,
  brightCyan: 106,
  brightWhite: 107,
};

export type ThemeVariant = 'dark' | 'light';

export interface Theme {
  name: string;
  variant: ThemeVariant;
  background: string;
  foreground: string;
  cursor: string;
  ansi: AnsiPalette;
}

// Tighter object literal for ANSI palettes — positional rather than named.
const A = (
  bk: string,
  r: string,
  g: string,
  y: string,
  b: string,
  m: string,
  c: string,
  w: string,
  Bk: string,
  Br: string,
  Bg: string,
  By: string,
  Bb: string,
  Bm: string,
  Bc: string,
  Bw: string,
): AnsiPalette => ({
  black: bk,
  red: r,
  green: g,
  yellow: y,
  blue: b,
  magenta: m,
  cyan: c,
  white: w,
  brightBlack: Bk,
  brightRed: Br,
  brightGreen: Bg,
  brightYellow: By,
  brightBlue: Bb,
  brightMagenta: Bm,
  brightCyan: Bc,
  brightWhite: Bw,
});

// `satisfies` keeps key narrowing while validating shape.
export const THEMES = {
  // ==========================================================================
  // DARK — modern editor schemes
  // ==========================================================================
  'tokyo-night': {
    name: 'Tokyo Night',
    variant: 'dark',
    background: '#1a1b26',
    foreground: '#c0caf5',
    cursor: '#c0caf5',
    ansi: A(
      '#15161e', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#a9b1d6',
      '#414868', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#c0caf5',
    ),
  },
  'tokyo-night-storm': {
    name: 'Tokyo Night Storm',
    variant: 'dark',
    background: '#24283b',
    foreground: '#c0caf5',
    cursor: '#c0caf5',
    ansi: A(
      '#1d202f', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#a9b1d6',
      '#414868', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#c0caf5',
    ),
  },
  'tokyo-night-light': {
    name: 'Tokyo Night Light',
    variant: 'light',
    background: '#d5d6db',
    foreground: '#343b58',
    cursor: '#343b58',
    ansi: A(
      '#0f0f14', '#8c4351', '#33635c', '#8f5e15', '#34548a', '#5a4a78', '#0f4b6e', '#343b58',
      '#9699a3', '#8c4351', '#33635c', '#8f5e15', '#34548a', '#5a4a78', '#0f4b6e', '#343b58',
    ),
  },

  nord: {
    name: 'Nord',
    variant: 'dark',
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#d8dee9',
    ansi: A(
      '#3b4252', '#bf616a', '#a3be8c', '#ebcb8b', '#81a1c1', '#b48ead', '#88c0d0', '#e5e9f0',
      '#4c566a', '#bf616a', '#a3be8c', '#ebcb8b', '#81a1c1', '#b48ead', '#8fbcbb', '#eceff4',
    ),
  },
  'nord-light': {
    name: 'Nord (Snow Storm)',
    variant: 'light',
    background: '#eceff4',
    foreground: '#2e3440',
    cursor: '#2e3440',
    ansi: A(
      '#3b4252', '#bf616a', '#a3be8c', '#ebcb8b', '#5e81ac', '#b48ead', '#88c0d0', '#4c566a',
      '#d8dee9', '#bf616a', '#a3be8c', '#ebcb8b', '#81a1c1', '#b48ead', '#8fbcbb', '#2e3440',
    ),
  },

  dracula: {
    name: 'Dracula',
    variant: 'dark',
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    ansi: A(
      '#21222c', '#ff5555', '#50fa7b', '#f1fa8c', '#bd93f9', '#ff79c6', '#8be9fd', '#f8f8f2',
      '#6272a4', '#ff6e6e', '#69ff94', '#ffffa5', '#d6acff', '#ff92df', '#a4ffff', '#ffffff',
    ),
  },
  'dracula-pro': {
    name: 'Dracula Pro',
    variant: 'dark',
    background: '#22212c',
    foreground: '#f8f8f2',
    cursor: '#ffb86c',
    ansi: A(
      '#22212c', '#ff9580', '#8aff80', '#ffff80', '#9580ff', '#ff80bf', '#80ffea', '#f8f8f2',
      '#7970a9', '#ffaa99', '#a2ff99', '#ffff99', '#aa99ff', '#ff99cc', '#99ffee', '#ffffff',
    ),
  },

  'catppuccin-mocha': {
    name: 'Catppuccin Mocha',
    variant: 'dark',
    background: '#1e1e2e',
    foreground: '#cdd6f4',
    cursor: '#f5e0dc',
    ansi: A(
      '#45475a', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#bac2de',
      '#585b70', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#a6adc8',
    ),
  },
  'catppuccin-macchiato': {
    name: 'Catppuccin Macchiato',
    variant: 'dark',
    background: '#24273a',
    foreground: '#cad3f5',
    cursor: '#f4dbd6',
    ansi: A(
      '#494d64', '#ed8796', '#a6da95', '#eed49f', '#8aadf4', '#f5bde6', '#8bd5ca', '#b8c0e0',
      '#5b6078', '#ed8796', '#a6da95', '#eed49f', '#8aadf4', '#f5bde6', '#8bd5ca', '#a5adcb',
    ),
  },
  'catppuccin-frappe': {
    name: 'Catppuccin Frappé',
    variant: 'dark',
    background: '#303446',
    foreground: '#c6d0f5',
    cursor: '#f2d5cf',
    ansi: A(
      '#51576d', '#e78284', '#a6d189', '#e5c890', '#8caaee', '#f4b8e4', '#81c8be', '#b5bfe2',
      '#626880', '#e78284', '#a6d189', '#e5c890', '#8caaee', '#f4b8e4', '#81c8be', '#a5adce',
    ),
  },
  'catppuccin-latte': {
    name: 'Catppuccin Latte',
    variant: 'light',
    background: '#eff1f5',
    foreground: '#4c4f69',
    cursor: '#dc8a78',
    ansi: A(
      '#5c5f77', '#d20f39', '#40a02b', '#df8e1d', '#1e66f5', '#ea76cb', '#179299', '#acb0be',
      '#6c6f85', '#d20f39', '#40a02b', '#df8e1d', '#1e66f5', '#ea76cb', '#179299', '#bcc0cc',
    ),
  },

  'gruvbox-dark': {
    name: 'Gruvbox Dark',
    variant: 'dark',
    background: '#282828',
    foreground: '#ebdbb2',
    cursor: '#ebdbb2',
    ansi: A(
      '#282828', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#a89984',
      '#928374', '#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#ebdbb2',
    ),
  },
  'gruvbox-dark-hard': {
    name: 'Gruvbox Dark Hard',
    variant: 'dark',
    background: '#1d2021',
    foreground: '#ebdbb2',
    cursor: '#ebdbb2',
    ansi: A(
      '#1d2021', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#a89984',
      '#928374', '#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#ebdbb2',
    ),
  },
  'gruvbox-light': {
    name: 'Gruvbox Light',
    variant: 'light',
    background: '#fbf1c7',
    foreground: '#3c3836',
    cursor: '#3c3836',
    ansi: A(
      '#fbf1c7', '#9d0006', '#79740e', '#b57614', '#076678', '#8f3f71', '#427b58', '#7c6f64',
      '#928374', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#3c3836',
    ),
  },
  'gruvbox-material-dark': {
    name: 'Gruvbox Material Dark',
    variant: 'dark',
    background: '#282828',
    foreground: '#d4be98',
    cursor: '#d4be98',
    ansi: A(
      '#3c3836', '#ea6962', '#a9b665', '#d8a657', '#7daea3', '#d3869b', '#89b482', '#d4be98',
      '#5a524c', '#ea6962', '#a9b665', '#d8a657', '#7daea3', '#d3869b', '#89b482', '#ddc7a1',
    ),
  },

  'one-dark': {
    name: 'One Dark',
    variant: 'dark',
    background: '#282c34',
    foreground: '#abb2bf',
    cursor: '#528bff',
    ansi: A(
      '#5c6370', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#abb2bf',
      '#5c6370', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#dcdfe4',
    ),
  },
  'one-light': {
    name: 'One Light',
    variant: 'light',
    background: '#fafafa',
    foreground: '#383a42',
    cursor: '#526fff',
    ansi: A(
      '#383a42', '#e45649', '#50a14f', '#c18401', '#4078f2', '#a626a4', '#0184bc', '#a0a1a7',
      '#696c77', '#e45649', '#50a14f', '#c18401', '#4078f2', '#a626a4', '#0184bc', '#383a42',
    ),
  },

  'solarized-dark': {
    name: 'Solarized Dark',
    variant: 'dark',
    background: '#002b36',
    foreground: '#839496',
    cursor: '#93a1a1',
    ansi: A(
      '#073642', '#dc322f', '#859900', '#b58900', '#268bd2', '#d33682', '#2aa198', '#eee8d5',
      '#586e75', '#cb4b16', '#586e75', '#657b83', '#839496', '#6c71c4', '#93a1a1', '#fdf6e3',
    ),
  },
  'solarized-light': {
    name: 'Solarized Light',
    variant: 'light',
    background: '#fdf6e3',
    foreground: '#657b83',
    cursor: '#586e75',
    ansi: A(
      '#073642', '#dc322f', '#859900', '#b58900', '#268bd2', '#d33682', '#2aa198', '#eee8d5',
      '#002b36', '#cb4b16', '#586e75', '#657b83', '#839496', '#6c71c4', '#93a1a1', '#fdf6e3',
    ),
  },

  'github-dark': {
    name: 'GitHub Dark',
    variant: 'dark',
    background: '#0d1117',
    foreground: '#e6edf3',
    cursor: '#e6edf3',
    ansi: A(
      '#484f58', '#ff7b72', '#3fb950', '#d29922', '#58a6ff', '#bc8cff', '#39c5cf', '#b1bac4',
      '#6e7681', '#ffa198', '#56d364', '#e3b341', '#79c0ff', '#d2a8ff', '#56d4dd', '#f0f6fc',
    ),
  },
  'github-dark-dimmed': {
    name: 'GitHub Dark Dimmed',
    variant: 'dark',
    background: '#22272e',
    foreground: '#adbac7',
    cursor: '#adbac7',
    ansi: A(
      '#545d68', '#f47067', '#57ab5a', '#c69026', '#539bf5', '#b083f0', '#39c5cf', '#909dab',
      '#636e7b', '#ff938a', '#6bc46d', '#daaa3f', '#6cb6ff', '#dcbdfb', '#56d4dd', '#cdd9e5',
    ),
  },
  'github-light': {
    name: 'GitHub Light',
    variant: 'light',
    background: '#ffffff',
    foreground: '#24292f',
    cursor: '#24292f',
    ansi: A(
      '#24292f', '#cf222e', '#116329', '#4d2d00', '#0969da', '#8250df', '#1b7c83', '#6e7781',
      '#57606a', '#a40e26', '#1a7f37', '#633c01', '#218bff', '#a475f9', '#3192aa', '#24292f',
    ),
  },

  // ==========================================================================
  // DARK — vibrant / signature schemes
  // ==========================================================================
  monokai: {
    name: 'Monokai',
    variant: 'dark',
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    ansi: A(
      '#272822', '#f92672', '#a6e22e', '#f4bf75', '#66d9ef', '#ae81ff', '#a1efe4', '#f8f8f2',
      '#75715e', '#f92672', '#a6e22e', '#f4bf75', '#66d9ef', '#ae81ff', '#a1efe4', '#f9f8f5',
    ),
  },
  'monokai-pro': {
    name: 'Monokai Pro',
    variant: 'dark',
    background: '#2d2a2e',
    foreground: '#fcfcfa',
    cursor: '#fcfcfa',
    ansi: A(
      '#403e41', '#ff6188', '#a9dc76', '#ffd866', '#fc9867', '#ab9df2', '#78dce8', '#fcfcfa',
      '#727072', '#ff6188', '#a9dc76', '#ffd866', '#fc9867', '#ab9df2', '#78dce8', '#fcfcfa',
    ),
  },

  'ayu-dark': {
    name: 'Ayu Dark',
    variant: 'dark',
    background: '#0b0e14',
    foreground: '#bfbdb6',
    cursor: '#e6b450',
    ansi: A(
      '#11151c', '#ea6c73', '#7fd962', '#f9af4f', '#73b8ff', '#cda1fa', '#90e1c6', '#c7c7c7',
      '#686868', '#f07178', '#aad94c', '#ffb454', '#59c2ff', '#d2a6ff', '#95e6cb', '#ffffff',
    ),
  },
  'ayu-mirage': {
    name: 'Ayu Mirage',
    variant: 'dark',
    background: '#1f2430',
    foreground: '#cbccc6',
    cursor: '#ffcc66',
    ansi: A(
      '#191e2a', '#ed8274', '#a6cc70', '#fad07b', '#6dcbfa', '#cfbafa', '#90e1c6', '#c7c7c7',
      '#686868', '#f28779', '#bae67e', '#ffd580', '#73d0ff', '#d4bfff', '#95e6cb', '#ffffff',
    ),
  },
  'ayu-light': {
    name: 'Ayu Light',
    variant: 'light',
    background: '#fcfcfc',
    foreground: '#5c6166',
    cursor: '#ff9940',
    ansi: A(
      '#000000', '#e7666a', '#86b300', '#f29718', '#41a6d9', '#a37acc', '#4cbf99', '#828c99',
      '#323232', '#f07171', '#99bf4d', '#fa8d3e', '#55b4d4', '#a37acc', '#4cbf99', '#5c6166',
    ),
  },

  'rose-pine': {
    name: 'Rosé Pine',
    variant: 'dark',
    background: '#191724',
    foreground: '#e0def4',
    cursor: '#524f67',
    ansi: A(
      '#26233a', '#eb6f92', '#31748f', '#f6c177', '#9ccfd8', '#c4a7e7', '#ebbcba', '#e0def4',
      '#6e6a86', '#eb6f92', '#31748f', '#f6c177', '#9ccfd8', '#c4a7e7', '#ebbcba', '#e0def4',
    ),
  },
  'rose-pine-moon': {
    name: 'Rosé Pine Moon',
    variant: 'dark',
    background: '#232136',
    foreground: '#e0def4',
    cursor: '#56526e',
    ansi: A(
      '#393552', '#eb6f92', '#3e8fb0', '#f6c177', '#9ccfd8', '#c4a7e7', '#ea9a97', '#e0def4',
      '#6e6a86', '#eb6f92', '#3e8fb0', '#f6c177', '#9ccfd8', '#c4a7e7', '#ea9a97', '#e0def4',
    ),
  },
  'rose-pine-dawn': {
    name: 'Rosé Pine Dawn',
    variant: 'light',
    background: '#faf4ed',
    foreground: '#575279',
    cursor: '#cecacd',
    ansi: A(
      '#f2e9e1', '#b4637a', '#286983', '#ea9d34', '#56949f', '#907aa9', '#d7827e', '#575279',
      '#9893a5', '#b4637a', '#286983', '#ea9d34', '#56949f', '#907aa9', '#d7827e', '#575279',
    ),
  },

  kanagawa: {
    name: 'Kanagawa',
    variant: 'dark',
    background: '#1f1f28',
    foreground: '#dcd7ba',
    cursor: '#c8c093',
    ansi: A(
      '#16161d', '#c34043', '#76946a', '#c0a36e', '#7e9cd8', '#957fb8', '#6a9589', '#c8c093',
      '#727169', '#e82424', '#98bb6c', '#e6c384', '#7fb4ca', '#938aa9', '#7aa89f', '#dcd7ba',
    ),
  },
  'kanagawa-dragon': {
    name: 'Kanagawa Dragon',
    variant: 'dark',
    background: '#181616',
    foreground: '#c5c9c5',
    cursor: '#c8c093',
    ansi: A(
      '#0d0c0c', '#c4746e', '#8a9a7b', '#c4b28a', '#8ba4b0', '#a292a3', '#8ea4a2', '#c8c093',
      '#a6a69c', '#e46876', '#87a987', '#e6c384', '#7fb4ca', '#938aa9', '#7aa89f', '#c5c9c5',
    ),
  },

  'everforest-dark': {
    name: 'Everforest Dark',
    variant: 'dark',
    background: '#2d353b',
    foreground: '#d3c6aa',
    cursor: '#d3c6aa',
    ansi: A(
      '#475258', '#e67e80', '#a7c080', '#dbbc7f', '#7fbbb3', '#d699b6', '#83c092', '#d3c6aa',
      '#475258', '#e67e80', '#a7c080', '#dbbc7f', '#7fbbb3', '#d699b6', '#83c092', '#d3c6aa',
    ),
  },
  'everforest-light': {
    name: 'Everforest Light',
    variant: 'light',
    background: '#fdf6e3',
    foreground: '#5c6a72',
    cursor: '#5c6a72',
    ansi: A(
      '#5c6a72', '#f85552', '#8da101', '#dfa000', '#3a94c5', '#df69ba', '#35a77c', '#e0dcc7',
      '#939f91', '#f85552', '#8da101', '#dfa000', '#3a94c5', '#df69ba', '#35a77c', '#5c6a72',
    ),
  },

  'material-darker': {
    name: 'Material Darker',
    variant: 'dark',
    background: '#212121',
    foreground: '#eeffff',
    cursor: '#ffcb6b',
    ansi: A(
      '#212121', '#ff5370', '#c3e88d', '#ffcb6b', '#82aaff', '#c792ea', '#89ddff', '#eeffff',
      '#545454', '#ff5370', '#c3e88d', '#ffcb6b', '#82aaff', '#c792ea', '#89ddff', '#ffffff',
    ),
  },
  'material-lighter': {
    name: 'Material Lighter',
    variant: 'light',
    background: '#fafafa',
    foreground: '#90a4ae',
    cursor: '#272727',
    ansi: A(
      '#000000', '#e53935', '#91b859', '#ffb62c', '#6182b8', '#7c4dff', '#39adb5', '#90a4ae',
      '#cfd8dc', '#e53935', '#91b859', '#ffb62c', '#6182b8', '#7c4dff', '#39adb5', '#272727',
    ),
  },

  'night-owl': {
    name: 'Night Owl',
    variant: 'dark',
    background: '#011627',
    foreground: '#d6deeb',
    cursor: '#80a4c2',
    ansi: A(
      '#011627', '#ef5350', '#22da6e', '#addb67', '#82aaff', '#c792ea', '#21c7a8', '#ffffff',
      '#575656', '#ef5350', '#22da6e', '#ffeb95', '#82aaff', '#c792ea', '#7fdbca', '#ffffff',
    ),
  },
  'light-owl': {
    name: 'Light Owl',
    variant: 'light',
    background: '#fbfbfb',
    foreground: '#403f53',
    cursor: '#90a7b2',
    ansi: A(
      '#011627', '#de3d3b', '#08916a', '#daaa01', '#288ed7', '#993383', '#0c969b', '#403f53',
      '#7a8181', '#de3d3b', '#08916a', '#daaa01', '#288ed7', '#993383', '#0c969b', '#403f53',
    ),
  },

  cobalt2: {
    name: 'Cobalt2',
    variant: 'dark',
    background: '#193549',
    foreground: '#ffffff',
    cursor: '#ffc600',
    ansi: A(
      '#000000', '#ff2c70', '#3ad900', '#ffc600', '#0088ff', '#ff00ff', '#80fcff', '#ffffff',
      '#000000', '#ff2c70', '#3ad900', '#ffc600', '#0088ff', '#ff00ff', '#80fcff', '#ffffff',
    ),
  },

  'synthwave-84': {
    name: "Synthwave '84",
    variant: 'dark',
    background: '#262335',
    foreground: '#f4eee4',
    cursor: '#f4eee4',
    ansi: A(
      '#495495', '#fe4450', '#72f1b8', '#fede5d', '#03edf9', '#ff7edb', '#03edf9', '#f4eee4',
      '#495495', '#fe4450', '#72f1b8', '#fede5d', '#03edf9', '#ff7edb', '#03edf9', '#f4eee4',
    ),
  },

  // ==========================================================================
  // RETRO / CRT
  // ==========================================================================
  'phosphor-green': {
    name: 'Phosphor Green',
    variant: 'dark',
    background: '#0d1f0d',
    foreground: '#33ff66',
    cursor: '#33ff66',
    ansi: A(
      '#0d1f0d', '#1ecc4a', '#33ff66', '#1ecc4a', '#1ecc4a', '#33ff66', '#1ecc4a', '#33ff66',
      '#1f4f1f', '#3aff77', '#5fff88', '#3aff77', '#3aff77', '#5fff88', '#3aff77', '#aaffaa',
    ),
  },
  'amber-crt': {
    name: 'Amber CRT',
    variant: 'dark',
    background: '#1a0f00',
    foreground: '#ffb000',
    cursor: '#ffb000',
    ansi: A(
      '#1a0f00', '#cc7a00', '#ffb000', '#ffd060', '#cc7a00', '#ffb000', '#cc7a00', '#ffb000',
      '#4d3700', '#ff9c1a', '#ffd060', '#ffe089', '#ff9c1a', '#ffd060', '#ff9c1a', '#ffe7b3',
    ),
  },
  'apple-classic': {
    name: 'Apple ][ Classic',
    variant: 'dark',
    background: '#000000',
    foreground: '#c7c7c7',
    cursor: '#c7c7c7',
    ansi: A(
      '#000000', '#c91b00', '#00c200', '#c7c400', '#0225c7', '#c930c7', '#00c5c7', '#c7c7c7',
      '#676767', '#ff6d67', '#5ff967', '#fefb67', '#6871ff', '#ff76ff', '#5ffdff', '#feffff',
    ),
  },
  'paper-white': {
    name: 'Paper White',
    variant: 'light',
    background: '#f5f1e8',
    foreground: '#2b2a26',
    cursor: '#2b2a26',
    ansi: A(
      '#2b2a26', '#a02828', '#3f7a3f', '#996a1f', '#2956b2', '#883b85', '#1f7479', '#5f5b53',
      '#807a6e', '#b34040', '#4f8e4f', '#a87a30', '#3a6bc7', '#9d4f9a', '#2c8b8f', '#2b2a26',
    ),
  },

  // ==========================================================================
  // CLEAN / MINIMAL
  // ==========================================================================
  iceberg: {
    name: 'Iceberg',
    variant: 'dark',
    background: '#161821',
    foreground: '#c6c8d1',
    cursor: '#c6c8d1',
    ansi: A(
      '#161821', '#e27878', '#b4be82', '#e2a478', '#84a0c6', '#a093c7', '#89b8c2', '#c6c8d1',
      '#6b7089', '#e98989', '#c0ca8e', '#e9b189', '#91acd1', '#ada0d3', '#95c4ce', '#d2d4de',
    ),
  },
  oxocarbon: {
    name: 'Oxocarbon',
    variant: 'dark',
    background: '#161616',
    foreground: '#f2f4f8',
    cursor: '#f2f4f8',
    ansi: A(
      '#262626', '#3ddbd9', '#42be65', '#f1ad44', '#33b1ff', '#ee5396', '#ff7eb6', '#dde1e6',
      '#393939', '#3ddbd9', '#42be65', '#f1ad44', '#33b1ff', '#ee5396', '#ff7eb6', '#ffffff',
    ),
  },
  zenburn: {
    name: 'Zenburn',
    variant: 'dark',
    background: '#3f3f3f',
    foreground: '#dcdccc',
    cursor: '#dcdccc',
    ansi: A(
      '#3f3f3f', '#cc9393', '#7f9f7f', '#d0bf8f', '#6ca0a3', '#dc8cc3', '#93e0e3', '#dcdccc',
      '#709080', '#dca3a3', '#bfebbf', '#f0dfaf', '#94bff3', '#ec93d3', '#93e0e3', '#ffffff',
    ),
  },
} as const satisfies Record<string, Theme>;

export type ThemeId = keyof typeof THEMES;

export const THEME_VARIANTS: readonly ThemeVariant[] = ['dark', 'light'];

export const DEFAULT_THEME_ID: ThemeId = 'tokyo-night';

export function getTheme(id: string): Theme {
  return (THEMES as Record<string, Theme>)[id] ?? THEMES[DEFAULT_THEME_ID];
}

export function themesByVariant(variant: ThemeVariant): [ThemeId, Theme][] {
  return (Object.entries(THEMES) as [ThemeId, Theme][]).filter(([, t]) => t.variant === variant);
}
