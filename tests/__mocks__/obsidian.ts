// tests/__mocks__/obsidian.ts
export class Plugin {}
export class PluginSettingTab {
  constructor(public app: any, public plugin: any) {}
  display() {}
}
export class Setting {
  constructor(public containerEl: any) {}
  setName() { return this; }
  setDesc() { return this; }
  addText(cb?: (t: any) => any) { return this; }
  addDropdown(cb?: (d: any) => any) { return this; }
}
export class TFile { path = ""; basename = ""; }
export class Notice { constructor(msg: string) {} }
