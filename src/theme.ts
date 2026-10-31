// Easool design tokens — matches the web's tailwind.config.js exactly.
// All screens reference only these constants so a single edit repaints the whole app.
export const colors = {
  // Brand
  navy:        "#223D82",
  navy50:      "#EEF2FA",
  navy100:     "#E3EAF7",
  navy700:     "#1B3068",

  // Canvas & surfaces
  canvas:      "#F8F9FB",
  white:       "#FFFFFF",

  // Ink (text)
  ink:         "#141A2A",
  inkMuted:    "#5A6379",
  inkSubtle:   "#8B93A6",

  // Borders
  line:        "#E7EAF1",
  lineSoft:    "#F0F2F7",

  // Semantic
  success:     "#12775A",
  successSoft: "#E3F3ED",
  warning:     "#A66A08",
  warningSoft: "#FCF1DE",
  danger:      "#B8352C",
  dangerSoft:  "#FBEAE8",
};

// Shadows (iOS & Android)
export const shadow = {
  card: {
    shadowColor:   "#141A2A",
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius:  3,
    elevation:     2,
  },
  lifted: {
    shadowColor:   "#141A2A",
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     4,
  },
};
