import { App, Editor, Notice, TFile } from "obsidian";
import chroma from "chroma-js";
import type { ChartPluginSettings } from "src/constants/settingsConstants";
import type Renderer from "src/chartRenderer";

/** Preprocess YAML content before parsing: replace tabs with spaces and strip code fences. */
export function preprocessYamlContent(content: string, stripFences = false): string {
  let result = content.replace(/\t/g, '    ');
  if (stripFences) {
    result = result.replace("```chart", "").replace("```", "");
  }
  return result;
}

export function generateInnerColors(colors: string[], alpha = 0.25) {
    if(typeof alpha != 'number') throw "Provided alpha value is not a number"
    return colors.map((color: string) => chroma(color.trim()).alpha(alpha).hex());
}

export function renderError(error: unknown, el: HTMLElement) {
  console.error('Charts: Render error -', error);
  const errorEl = el.createDiv({ cls: "chart-error" });
  errorEl.createEl("b", { text: "Couldn't render Chart:" });
  const errorText = error instanceof Error ? error.message : String(error);
  errorEl.createEl("pre").createEl("code", { text: errorText });
  errorEl.createEl("hr");
  errorEl.createEl("span").innerHTML = "You might also want to look for further Errors in the Console: Press <kbd>CTRL</kbd> + <kbd>SHIFT</kbd> + <kbd>I</kbd> to open it.";
  new Notice('Chart failed to load: ' + errorText);
}

export function base64ToArrayBuffer(base64: string) {
  var binary_string = window.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function saveImageToVaultAndPaste(editor: Editor, app: App, renderer: Renderer, source: TFile, settings: ChartPluginSettings) {
  const image = await renderer.imageRenderer(editor.getSelection(), settings.imageSettings);
  console.log("image converted")
  const formatExt = settings.imageSettings.format.split('/').pop() ?? 'png';
  const attachmentPath = await (app.vault as unknown as { getAvailablePathForAttachments: (name: string, ext: string, file: TFile) => Promise<string> }).getAvailablePathForAttachments(`Chart ${new Date().toDateString()}`, formatExt, source);
  const file = await app.vault.createBinary(
      attachmentPath,
      base64ToArrayBuffer(image)
  );
  console.log("Image saved")

  editor.replaceSelection(app.fileManager.generateMarkdownLink(file, source.path));
}